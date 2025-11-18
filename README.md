# Order Execution Engine

Backend system for executing limit orders on DEXs (Raydium and Meteora). Monitors prices and executes when target price is reached. Uses WebSocket for real-time status updates and BullMQ for queue processing.

## Why Limit Orders?

Limit orders give users price control - the system waits until market price meets or exceeds the target before executing. This ensures execution at desired price or better.

To extend for other order types:
- **Market Orders**: Skip price watcher, execute immediately at best price
- **Sniper Orders**: Add conditions (new token listing, liquidity threshold) before execution

## Features

- Limit order execution with price monitoring
- DEX routing (compares Raydium vs Meteora prices)
- Real-time WebSocket status updates
- BullMQ queue with Redis (10 concurrent workers, 100 orders/min)
- PostgreSQL for order persistence
- Mock execution engine (generates txHash, simulates swap)

## Tech Stack

- Node.js + TypeScript
- Express.js
- BullMQ + Redis (Upstash)
- PostgreSQL + Prisma
- WebSocket (ws)

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance (Upstash works)

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` file:

```
DATABASE_URL="your_postgresql_connection_string"
UPSTASH_REDIS_REST_URL="your_upstash_redis_rest_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_token"
PORT=3000
NODE_ENV=development
```

### Database Setup

```bash
npm run prisma:generate
npm run prisma:migrate
```

### Run

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

### Tests

```bash
npm test
```

## API

### POST /api/orders/execute

Create a limit order.

Request:
```json
{
  "orderType": "limit",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1,
  "targetPrice": 185
}
```

Response:
```json
{
  "orderId": "uuid-1234"
}
```

### GET /api/orders/:orderId

Get order status and details.

### WebSocket

Connect to receive real-time status updates:

```
ws://localhost:3000?orderId=<orderId>
```

Status flow:
1. `pending` - Order created
2. `routing` - Fetching DEX quotes
3. `waiting-price` - Waiting for target price (updates every 5s with bestPrice)
4. `building` - Preparing transaction
5. `submitted` - Transaction submitted (includes txHash)
6. `confirmed` - Transaction confirmed
7. `failed` - Order failed (includes failureReason)

WebSocket message format:
```json
{
  "orderId": "uuid-1234",
  "status": "waiting-price",
  "timestamp": "2025-11-19T18:30:00.000Z",
  "data": {
    "selectedDex": "Raydium",
    "bestPrice": 183.5
  }
}
```

## How It Works

1. Order created via API → saved to DB → added to queue
2. Worker fetches quotes from Raydium and Meteora → selects best price
3. Price watcher checks every 5 seconds until `bestPrice >= targetPrice`
4. When price meets target → build transaction → execute swap → get txHash
5. Update DB and send WebSocket updates → order marked as confirmed

Price watcher timeout: 5 minutes. If price never meets target, order fails.

## Configuration

- Queue: `orderQueue`, 10 workers, 100 orders/minute
- Retry: 3 attempts, exponential backoff (2s, 4s, 8s)
- Price check interval: 5 seconds
- Max wait time: 5 minutes
- DEX quote delay: 200ms per DEX
- Execution time: 2-3 seconds (simulated)

## Project Structure

```
src/
  api/          # API handlers
  ws/           # WebSocket manager
  queue/        # BullMQ queue and worker
  dex/          # DEX router (Raydium + Meteora)
  execution/    # Mock execution engine
  db/           # Prisma client
  utils/        # Utilities
  types/        # TypeScript types
```

## Deployment

### Render

1. Create new Web Service
2. Connect repository
3. Build: `npm install && npm run build && npm run prisma:generate`
4. Start: `npm start`
5. Add environment variables

### Fly.io

1. Install Fly CLI
2. Run `fly launch`
3. Set secrets: `fly secrets set KEY=value`
4. Deploy: `fly deploy`

Required env vars: `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `PORT`, `NODE_ENV`

## Testing

Import `postman_collection.json` into Postman for API testing.

Test coverage:
- DEX routing logic
- Price watcher behavior
- Mock execution
- API validation
- WebSocket lifecycle
- Queue retry logic
- Failure scenarios

## Notes

- Redis connection extracts hostname from Upstash REST URL and uses Redis protocol (port 6379 + TLS)
- DEX router uses random price variations (Raydium: 0.98-1.02x, Meteora: 0.97-1.03x)
- Execution is mocked - replace `MockExecutor` with real swap logic for production
- WebSocket clients must connect with `?orderId=<orderId>` query parameter

## License

MIT
