import { sleep } from '../utils/sleep';
import { Logger } from '../utils/logger';
import { ExecutionResult, BestQuote } from '../types/orderTypes';
import crypto from 'crypto';

/**
 * Mock Execution Engine that simulates swap execution
 */
export class MockExecutor {
  /**
   * Generate a fake transaction hash
   */
  private generateTxHash(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Execute a mock swap
   * Simulates 2-3 seconds of execution time
   * Generates fake txHash and executed price with ±0.5% variation
   */
  async executeSwap(
    bestQuote: BestQuote,
    targetPrice: number
  ): Promise<ExecutionResult> {
    Logger.info('Starting mock swap execution', {
      selectedDex: bestQuote.selectedDex,
      quotePrice: bestQuote.price,
      targetPrice,
    });

    // Simulate execution time (2-3 seconds)
    const executionTime = 2000 + Math.random() * 1000;
    await sleep(executionTime);

    // Generate executed price with ±0.5% variation from best quote
    const variation = 0.995 + Math.random() * 0.01; // 0.995 to 1.005
    const executedPrice = bestQuote.price * variation;

    // Generate fake transaction hash
    const txHash = this.generateTxHash();

    const result: ExecutionResult = {
      txHash,
      executedPrice,
      selectedDex: bestQuote.selectedDex,
    };

    Logger.info('Mock swap execution completed', result);

    return result;
  }
}

