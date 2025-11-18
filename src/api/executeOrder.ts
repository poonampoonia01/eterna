import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OrderQueue } from '../queue/orderQueue';
import { WebSocketManager } from '../ws/websocketManager';
import { CreateOrderRequest, OrderResponse } from '../types/orderTypes';
import { Logger } from '../utils/logger';
import prisma from '../db/client';

/**
 * API handler for executing orders
 */
export class ExecuteOrderHandler {
  constructor(
    private orderQueue: OrderQueue,
    private wsManager: WebSocketManager
  ) {}

  /**
   * Handle POST /api/orders/execute
   */
  async handle(req: Request, res: Response): Promise<void> {
    try {
      const orderData: CreateOrderRequest = req.body;

      // Validate request
      const validationError = this.validateRequest(orderData);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      // Only support limit orders for now
      if (orderData.orderType !== 'limit') {
        res.status(400).json({
          error: 'Only limit orders are supported. Use orderType: "limit"',
        });
        return;
      }

      // Generate order ID
      const orderId = uuidv4();

      Logger.info('Creating new order', { orderId, ...orderData });

      // Create order in database
      await prisma.order.create({
        data: {
          id: orderId,
          tokenIn: orderData.tokenIn,
          tokenOut: orderData.tokenOut,
          amount: orderData.amount,
          targetPrice: orderData.targetPrice,
          status: 'pending',
        },
      });

      // Add order to queue
      await this.orderQueue.addOrder({
        orderId,
        tokenIn: orderData.tokenIn,
        tokenOut: orderData.tokenOut,
        amount: orderData.amount,
        targetPrice: orderData.targetPrice,
      });

      // Return order ID
      const response: OrderResponse = { orderId };
      res.status(201).json(response);

      Logger.info('Order created and queued', { orderId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error('Error creating order', { error: errorMessage });
      res.status(500).json({ error: 'Failed to create order', details: errorMessage });
    }
  }

  /**
   * Validate order request
   */
  private validateRequest(data: CreateOrderRequest): string | null {
    if (!data.orderType) {
      return 'orderType is required';
    }

    if (!data.tokenIn || typeof data.tokenIn !== 'string') {
      return 'tokenIn is required and must be a string';
    }

    if (!data.tokenOut || typeof data.tokenOut !== 'string') {
      return 'tokenOut is required and must be a string';
    }

    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      return 'amount is required and must be a positive number';
    }

    if (!data.targetPrice || typeof data.targetPrice !== 'number' || data.targetPrice <= 0) {
      return 'targetPrice is required and must be a positive number';
    }

    return null;
  }
}

