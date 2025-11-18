# 📄 Order Execution Engine

A backend system that accepts **Limit Orders**, continuously checks prices from **Raydium** and **Meteora** DEXs, and executes orders when target prices are reached. The system provides real-time WebSocket status updates, uses BullMQ queues for processing, and stores results in PostgreSQL.

## 🎯 Why Limit Orders?

Limit orders were chosen as the initial implementation because they provide users with price control and execution certainty. Users can set a target price and the system will wait until the market price reaches or exceeds that target before executing, ensuring they get the price they want or better. This is particularly valuable in volatile markets where timing is critical.

**Extending for Market & Sniper Orders:**
- **Market Orders**: Execute immediately at current best price (skip price watcher, go straight to execution)
- **Sniper Orders**: Monitor for specific conditions (e.g., new token listing, liquidity threshold) before executing

## 🚀 Features

- ✅ **Limit Order Execution** - Wait for target price before executing
- ✅ **DEX Routing** - Compare prices from Raydium and Meteora
- ✅ **WebSocket Status Updates** - Real-time order status streaming
- ✅ **Queue System** - BullMQ with Redis for scalable processing
- ✅ **PostgreSQL Database** - Persistent order storage
- ✅ **Mock Execution** - Simulated swap execution with transaction hashes
- ✅ **Comprehensive Testing** - 10+ unit and integration tests

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Redis instance (Upstash recommended)
- npm or yarn

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="your_postgresql_connection_string"
UPSTASH_REDIS_REST_URL="your_upstash_redis_rest_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_token"
PORT=3000
NODE_ENV=development
```

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Build the Project

```bash
npm run build
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

This starts:
- Express server on port 3000
- BullMQ worker with 10 concurrent workers
- WebSocket server for status updates

### Production Mode

```bash
npm run build
npm start
```

### Running Tests

```bash
npm test
```

### Database Studio (Optional)

View and manage database records:

```bash
npm run prisma:studio
```

## 📡 API Documentation

### POST `/api/orders/execute`

Create a new limit order.

**Request Body:**
```json
{
  "orderType": "limit",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1,
  "targetPrice": 185
}
```

**Response:**
```json
{
  "orderId": "uuid-1234"
}
```

**Status Codes:**
- `201 Created` - Order created successfully
- `400 Bad Request` - Invalid request data
- `500 Internal Server Error` - Server error

### GET `/api/orders/:orderId`

Get order status and details.

**Response:**
```json
{
  "id": "uuid-1234",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1,
  "targetPrice": 185,
  "selectedDex": "Raydium",
  "executedPrice": 185.12,
  "status": "confirmed",
  "txHash": "a289fbc01923...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### WebSocket Connection

Connect to WebSocket for real-time status updates:

```
ws://localhost:3000?orderId=<orderId>
```

**Status Events (in order):**
1. `pending` - Order created, waiting in queue
2. `routing` - Fetching quotes from DEXs
3. `waiting-price` - Waiting for price to meet target
4. `building` - Preparing transaction
5. `submitted` - Transaction submitted
6. `confirmed` - Transaction confirmed
7. `failed` - Order failed (with failureReason)

**WebSocket Message Format:**
```json
{
  "orderId": "uuid-1234",
  "status": "waiting-price",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "selectedDex": "Raydium",
    "bestPrice": 183.5
  }
}
```

## 🔄 Order Processing Flow

1. **Order Creation**: Client sends POST request → Order saved to DB → Added to queue
2. **Routing**: Worker fetches quotes from Raydium and Meteora → Selects best price
3. **Price Watching**: Worker checks price every 5 seconds until `bestPrice >= targetPrice`
4. **Execution**: When price meets target → Build transaction → Execute swap → Get txHash
5. **Completion**: Update DB → Send WebSocket updates → Order marked as confirmed

## 🧪 Testing

The test suite includes:

- ✅ DEX price routing logic (Raydium vs Meteora)
- ✅ Limit price watcher behavior
- ✅ Queue retry mechanism
- ✅ WebSocket lifecycle
- ✅ Mock execution engine
- ✅ API validation
- ✅ Failure scenarios
- ✅ Complete order flow
- ✅ Timeout handling
- ✅ Logging functionality

Run tests:
```bash
npm test
```

## 📦 Project Structure

```
src/
  api/
    executeOrder.ts          # API endpoint handler
  ws/
    websocketManager.ts      # WebSocket status broadcasting
  queue/
    orderQueue.ts           # BullMQ queue setup
    orderWorker.ts          # Order processing worker
  dex/
    mockDexRouter.ts        # DEX price routing (Raydium + Meteora)
  execution/
    mockExecutor.ts         # Mock swap execution
  db/
    client.ts               # Prisma client
  utils/
    sleep.ts                # Sleep utility
    logger.ts               # Logging utility
  types/
    orderTypes.ts           # TypeScript type definitions
index.ts                    # Main server entry point
```

## 🚢 Deployment

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables

### Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run: `fly launch`
3. Set environment variables: `fly secrets set KEY=value`
4. Deploy: `fly deploy`

**Required Environment Variables:**
- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `PORT` (optional, defaults to 3000)
- `NODE_ENV=production`

## 📊 Queue Configuration

- **Queue Name**: `orderQueue`
- **Concurrency**: 10 workers
- **Rate Limit**: 100 orders/minute
- **Retry**: 3 attempts with exponential backoff (2s, 4s, 8s)

## 🎥 Demo Video

[Link to YouTube demo video - 1-2 minutes]

The demo shows:
- Submitting a limit order via API
- WebSocket receiving all status events in sequence
- Queue processing multiple orders concurrently
- DEX routing logs (Raydium vs Meteora comparison)
- Database entries updating in real-time

## 📝 Postman Collection

Import the Postman collection to test the API:

1. Create a new request: `POST http://your-url/api/orders/execute`
2. Body (JSON):
```json
{
  "orderType": "limit",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1,
  "targetPrice": 185
}
```

3. For WebSocket testing, use a WebSocket client like:
   - [WebSocket King](https://websocketking.com/)
   - [Postman WebSocket](https://www.postman.com/product/websocket/)

## 🔧 Configuration

### Price Watcher Settings

- **Check Interval**: 5 seconds
- **Max Wait Time**: 5 minutes
- **Timeout Action**: Mark order as failed

### DEX Router Settings

- **Raydium Price Variation**: 0.98 - 1.02x base price
- **Meteora Price Variation**: 0.97 - 1.03x base price
- **Quote Delay**: 200ms per DEX

### Execution Settings

- **Execution Time**: 2-3 seconds (simulated)
- **Price Variation**: ±0.5% from best quote
- **Transaction Hash**: 64-character hex string

## 🐛 Troubleshooting

### Redis Connection Issues

If you see Redis connection errors:
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
- Check that your Upstash instance is active
- Ensure TLS is enabled (handled automatically)

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check PostgreSQL is accessible
- Run `npm run prisma:generate` if Prisma client is missing

### WebSocket Not Connecting

- Ensure server is running
- Check WebSocket URL includes `?orderId=<orderId>`
- Verify orderId exists in database

## 📄 License

MIT

## 👥 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

**Built with:** Node.js, TypeScript, Express, BullMQ, PostgreSQL, Prisma, WebSocket, Redis

