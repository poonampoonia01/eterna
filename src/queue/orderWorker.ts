import { Worker, Job } from 'bullmq';
import { OrderQueue } from './orderQueue';
import { MockDexRouter } from '../dex/mockDexRouter';
import { MockExecutor } from '../execution/mockExecutor';
import { WebSocketManager } from '../ws/websocketManager';
import { OrderJobData, OrderStatus } from '../types/orderTypes';
import { Logger } from '../utils/logger';
import { sleep } from '../utils/sleep';
import prisma from '../db/client';

/**
 * Order Worker that processes orders from the queue
 */
export class OrderWorker {
  private worker: Worker<OrderJobData>;
  private dexRouter: MockDexRouter;
  private executor: MockExecutor;
  private wsManager: WebSocketManager;
  private maxPriceWaitTime = 5 * 60 * 1000; // 5 minutes max wait time

  constructor(
    orderQueue: OrderQueue,
    wsManager: WebSocketManager
  ) {
    this.dexRouter = new MockDexRouter();
    this.executor = new MockExecutor();
    this.wsManager = wsManager;

    const redis = orderQueue.getRedis();
    const queue = orderQueue.getQueue();

    // Create worker with concurrency of 10
    this.worker = new Worker<OrderJobData>(
      'orderQueue',
      async (job: Job<OrderJobData>) => {
        return this.processOrder(job);
      },
      {
        connection: {
          host: redis.options.host as string,
          port: redis.options.port as number,
          password: redis.options.password as string,
          tls: {
            rejectUnauthorized: false,
          },
        },
        concurrency: 10,
        limiter: {
          max: 100, // Process 100 orders per minute
          duration: 60000,
        },
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      Logger.info('Order job completed', { orderId: job.data.orderId });
    });

    this.worker.on('failed', (job, err) => {
      Logger.error('Order job failed', {
        orderId: job?.data.orderId,
        error: err.message,
      });
    });

    this.worker.on('error', (err) => {
      Logger.error('Worker error', { error: err.message });
    });

    Logger.info('Order worker initialized with concurrency 10');
  }

  /**
   * Process a single order
   */
  private async processOrder(job: Job<OrderJobData>): Promise<void> {
    const { orderId, tokenIn, tokenOut, amount, targetPrice } = job.data;

    try {
      Logger.info('Processing order', { orderId, tokenIn, tokenOut, amount, targetPrice });

      // Update order status to pending (already set, but ensure DB is updated)
      await this.updateOrderStatus(orderId, 'pending');

      // Step 1: Routing - Get best quote from DEXs
      this.wsManager.sendStatus(orderId, 'routing', {});
      await this.updateOrderStatus(orderId, 'routing');

      const bestQuote = await this.dexRouter.getBestQuote(tokenIn, tokenOut, amount);
      
      Logger.info('Best quote received', {
        orderId,
        selectedDex: bestQuote.selectedDex,
        price: bestQuote.price,
      });

      // Step 2: Price Watcher - Wait until price meets target
      this.wsManager.sendStatus(orderId, 'waiting-price', {
        selectedDex: bestQuote.selectedDex,
        bestPrice: bestQuote.price,
      });
      await this.updateOrderStatus(orderId, 'waiting-price');

      const priceMet = await this.waitForTargetPrice(
        orderId,
        tokenIn,
        tokenOut,
        amount,
        targetPrice,
        bestQuote.selectedDex
      );

      if (!priceMet) {
        // Timeout - price never met target
        const failureReason = 'Price did not reach target within timeout period';
        this.wsManager.sendStatus(orderId, 'failed', {
          selectedDex: bestQuote.selectedDex,
          failureReason,
        });
        await this.updateOrderStatus(orderId, 'failed', {
          failureReason,
          selectedDex: bestQuote.selectedDex,
        });
        return;
      }

      // Get final best quote before execution
      const finalQuote = await this.dexRouter.getBestQuote(tokenIn, tokenOut, amount);

      // Step 3: Building - Prepare transaction
      this.wsManager.sendStatus(orderId, 'building', {
        selectedDex: finalQuote.selectedDex,
        price: finalQuote.price,
      });
      await this.updateOrderStatus(orderId, 'building');

      // Step 4: Execute swap
      const executionResult = await this.executor.executeSwap(finalQuote, targetPrice);

      // Step 5: Submitted
      this.wsManager.sendStatus(orderId, 'submitted', {
        selectedDex: executionResult.selectedDex,
        txHash: executionResult.txHash,
        executedPrice: executionResult.executedPrice,
      });
      await this.updateOrderStatus(orderId, 'submitted', {
        txHash: executionResult.txHash,
        executedPrice: executionResult.executedPrice,
        selectedDex: executionResult.selectedDex,
      });

      // Step 6: Confirmed
      this.wsManager.sendStatus(orderId, 'confirmed', {
        selectedDex: executionResult.selectedDex,
        txHash: executionResult.txHash,
        executedPrice: executionResult.executedPrice,
      });
      await this.updateOrderStatus(orderId, 'confirmed', {
        txHash: executionResult.txHash,
        executedPrice: executionResult.executedPrice,
        selectedDex: executionResult.selectedDex,
      });

      Logger.info('Order processing completed successfully', { orderId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Error processing order', { orderId, error: errorMessage });

      this.wsManager.sendStatus(orderId, 'failed', {
        failureReason: errorMessage,
      });
      await this.updateOrderStatus(orderId, 'failed', {
        failureReason: errorMessage,
      });

      throw error; // Re-throw to trigger BullMQ retry
    }
  }

  /**
   * Wait for target price to be met
   * Checks every 5 seconds until price >= targetPrice or timeout
   */
  private async waitForTargetPrice(
    orderId: string,
    tokenIn: string,
    tokenOut: string,
    amount: number,
    targetPrice: number,
    selectedDex: string
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxPriceWaitTime) {
      const bestQuote = await this.dexRouter.getBestQuote(tokenIn, tokenOut, amount);

      // Send waiting-price update with current best price
      this.wsManager.sendStatus(orderId, 'waiting-price', {
        selectedDex: bestQuote.selectedDex,
        bestPrice: bestQuote.price,
      });

      Logger.debug('Price check', {
        orderId,
        bestPrice: bestQuote.price,
        targetPrice,
        selectedDex: bestQuote.selectedDex,
      });

      // Check if price meets target
      if (bestQuote.price >= targetPrice) {
        Logger.info('Target price met', {
          orderId,
          bestPrice: bestQuote.price,
          targetPrice,
        });
        return true;
      }

      // Wait 5 seconds before next check
      await sleep(5000);
    }

    Logger.warn('Price wait timeout', { orderId, targetPrice });
    return false;
  }

  /**
   * Update order status in database
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    data?: {
      selectedDex?: string;
      txHash?: string;
      executedPrice?: number;
      failureReason?: string;
    }
  ): Promise<void> {
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          selectedDex: data?.selectedDex,
          txHash: data?.txHash,
          executedPrice: data?.executedPrice,
          failureReason: data?.failureReason,
        },
      });
    } catch (error) {
      Logger.error('Failed to update order status', {
        orderId,
        status,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Close worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    Logger.info('Order worker closed');
  }
}

