import * as ws from 'ws';
import { Logger } from '../utils/logger';
import { WebSocketStatusEvent, OrderStatus } from '../types/orderTypes';

/**
 * WebSocket Manager for broadcasting order status updates
 */
export class WebSocketManager {
  private wss: ws.Server | null = null;
  private connections: Map<string, Set<ws>> = new Map(); // orderId -> Set of WebSocket connections

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    this.wss = new ws.Server({ server });
    
    this.wss.on('connection', (wsConnection: ws, req: any) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const orderId = url.searchParams.get('orderId');
      
      if (!orderId) {
        Logger.warn('WebSocket connection without orderId, closing');
        ws.close(1008, 'Missing orderId parameter');
        return;
      }

      // Add connection to the orderId mapping
      if (!this.connections.has(orderId)) {
        this.connections.set(orderId, new Set());
      }
      this.connections.get(orderId)!.add(wsConnection);

      Logger.info('WebSocket connection established', { orderId });

      // Send initial connection confirmation
      this.sendStatus(orderId, 'pending', {});

      // Handle connection close
      wsConnection.on('close', () => {
        Logger.info('WebSocket connection closed', { orderId });
        const orderConnections = this.connections.get(orderId);
        if (orderConnections) {
          orderConnections.delete(wsConnection);
          if (orderConnections.size === 0) {
            this.connections.delete(orderId);
          }
        }
      });

      // Handle errors
      wsConnection.on('error', (error) => {
        Logger.error('WebSocket error', { orderId, error: error.message });
      });
    });

    Logger.info('WebSocket server initialized');
  }

  /**
   * Send status update to all connections for an order
   */
  sendStatus(
    orderId: string,
    status: OrderStatus,
    data?: {
      selectedDex?: string;
      txHash?: string;
      price?: number;
      bestPrice?: number;
      executedPrice?: number;
      failureReason?: string;
    }
  ): void {
    const event: WebSocketStatusEvent = {
      orderId,
      status,
      timestamp: new Date().toISOString(),
      data,
    };

    const connections = this.connections.get(orderId);
    if (!connections || connections.size === 0) {
      Logger.debug('No WebSocket connections for order', { orderId, status });
      return;
    }

    const message = JSON.stringify(event);
    let sentCount = 0;

    connections.forEach((wsConnection) => {
      if (wsConnection.readyState === ws.OPEN) {
        try {
          wsConnection.send(message);
          sentCount++;
        } catch (error) {
          Logger.error('Failed to send WebSocket message', {
            orderId,
            error: (error as Error).message,
          });
          connections.delete(wsConnection);
        }
      } else {
        connections.delete(wsConnection);
      }
    });

    Logger.debug('WebSocket status sent', {
      orderId,
      status,
      connections: sentCount,
    });
  }

  /**
   * Close all connections for an order
   */
  closeOrderConnections(orderId: string): void {
    const connections = this.connections.get(orderId);
    if (connections) {
      connections.forEach((wsConnection) => {
        if (wsConnection.readyState === ws.OPEN) {
          wsConnection.close();
        }
      });
      this.connections.delete(orderId);
    }
  }

  /**
   * Get connection count for an order
   */
  getConnectionCount(orderId: string): number {
    return this.connections.get(orderId)?.size || 0;
  }
}

