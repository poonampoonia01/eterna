import { Request, Response } from 'express';
import { ExecuteOrderHandler } from '../executeOrder';
import { OrderQueue } from '../../queue/orderQueue';
import { WebSocketManager } from '../../ws/websocketManager';
import prisma from '../../db/client';

// Mock dependencies
jest.mock('../../queue/orderQueue');
jest.mock('../../ws/websocketManager');
jest.mock('../../db/client', () => ({
  __esModule: true,
  default: {
    order: {
      create: jest.fn(),
    },
  },
}));

describe('ExecuteOrderHandler', () => {
  let handler: ExecuteOrderHandler;
  let mockOrderQueue: jest.Mocked<OrderQueue>;
  let mockWsManager: jest.Mocked<WebSocketManager>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockOrderQueue = {
      addOrder: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockWsManager = {} as any;

    handler = new ExecuteOrderHandler(mockOrderQueue, mockWsManager);

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('handle', () => {
    it('should validate missing orderType', async () => {
      mockRequest.body = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        targetPrice: 185,
      };

      await handler.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'orderType is required' })
      );
    });

    it('should validate missing tokenIn', async () => {
      mockRequest.body = {
        orderType: 'limit',
        tokenOut: 'USDC',
        amount: 1,
        targetPrice: 185,
      };

      await handler.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate invalid amount', async () => {
      mockRequest.body = {
        orderType: 'limit',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: -1,
        targetPrice: 185,
      };

      await handler.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should reject non-limit orders', async () => {
      mockRequest.body = {
        orderType: 'market',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        targetPrice: 185,
      };

      await handler.handle(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Only limit orders are supported'),
        })
      );
    });

    it('should create order successfully', async () => {
      mockRequest.body = {
        orderType: 'limit',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 1,
        targetPrice: 185,
      };

      (prisma.order.create as jest.Mock).mockResolvedValue({
        id: 'test-order-id',
      });

      await handler.handle(mockRequest as Request, mockResponse as Response);

      expect(prisma.order.create).toHaveBeenCalled();
      expect(mockOrderQueue.addOrder).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: expect.any(String) })
      );
    });
  });
});

