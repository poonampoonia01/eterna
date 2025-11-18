import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { OrderQueue } from './queue/orderQueue';
import { OrderWorker } from './queue/orderWorker';
import { WebSocketManager } from './ws/websocketManager';
import { ExecuteOrderHandler } from './api/executeOrder';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize components
const orderQueue = new OrderQueue();
const wsManager = new WebSocketManager();
const orderWorker = new OrderWorker(orderQueue, wsManager);
const executeOrderHandler = new ExecuteOrderHandler(orderQueue, wsManager);

// Initialize WebSocket server
wsManager.initialize(server);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/orders/execute', (req, res) => {
  executeOrderHandler.handle(req, res);
});

// Get order status endpoint
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const prisma = (await import('./db/client')).default;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    Logger.error('Error fetching order', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  Logger.info(`Server started on port ${PORT}`);
  Logger.info(`API endpoint: http://localhost:${PORT}/api/orders/execute`);
  Logger.info(`WebSocket endpoint: ws://localhost:${PORT}?orderId=<orderId>`);
  Logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  await orderWorker.close();
  await orderQueue.close();
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  Logger.info('SIGINT received, shutting down gracefully');
  await orderWorker.close();
  await orderQueue.close();
  server.close(() => {
    Logger.info('Server closed');
    process.exit(0);
  });
});

