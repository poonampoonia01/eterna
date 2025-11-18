export type OrderType = 'limit' | 'market' | 'sniper';

export type OrderStatus =
  | 'pending'
  | 'routing'
  | 'waiting-price'
  | 'building'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export interface CreateOrderRequest {
  orderType: OrderType;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  targetPrice: number;
}

export interface OrderResponse {
  orderId: string;
}

export interface WebSocketStatusEvent {
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  data?: {
    selectedDex?: string;
    txHash?: string;
    price?: number;
    bestPrice?: number;
    executedPrice?: number;
    failureReason?: string;
  };
}

export interface DexQuote {
  price: number;
  fee: number;
  dex: 'Raydium' | 'Meteora';
}

export interface BestQuote extends DexQuote {
  selectedDex: 'Raydium' | 'Meteora';
}

export interface OrderJobData {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  targetPrice: number;
}

export interface ExecutionResult {
  txHash: string;
  executedPrice: number;
  selectedDex: string;
}

