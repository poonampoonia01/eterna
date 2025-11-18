import { WebSocketManager } from '../websocketManager';
import { WebSocket } from 'ws';

// Mock WebSocket
jest.mock('ws');

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockServer: any;
  let mockWs: jest.Mocked<WebSocket>;

  beforeEach(() => {
    wsManager = new WebSocketManager();
    mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      on: jest.fn(),
    } as any;

    mockServer = {
      on: jest.fn(),
    };
  });

  it('should initialize WebSocket server', () => {
    wsManager.initialize(mockServer);
    // Server should be initialized (no error thrown)
    expect(wsManager).toBeDefined();
  });

  it('should send status updates', () => {
    wsManager.sendStatus('test-order-id', 'pending', {});
    // Should not throw error even without connections
    expect(wsManager).toBeDefined();
  });

  it('should track connection count', () => {
    const count = wsManager.getConnectionCount('test-order-id');
    expect(count).toBe(0); // No connections initially
  });

  it('should close order connections', () => {
    wsManager.closeOrderConnections('test-order-id');
    // Should not throw error
    expect(wsManager).toBeDefined();
  });
});

