# Setup Guide

## Important: Upstash Redis Configuration

**BullMQ requires Redis protocol, not REST API.**

Upstash provides both REST API and Redis protocol endpoints. For this project, you need the **Redis protocol endpoint**.

### Getting Redis Protocol Endpoint from Upstash

1. Go to your Upstash dashboard
2. Select your Redis database
3. Look for "Redis Endpoint" (not REST API)
4. It should look like: `ep-xxx-xxx.upstash.io:6379`
5. Use this as the `REDIS_HOST` and `REDIS_PORT`

### Alternative: Use Environment Variables

Update your `.env` file:

```env
# Option 1: Use Redis protocol endpoint directly
REDIS_HOST=ep-xxx-xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_token

# Option 2: Or use connection string
REDIS_URL=rediss://default:your_token@ep-xxx-xxx.upstash.io:6379
```

### If You Only Have REST API Credentials

If you only have REST API URL and token, you can:
1. Extract the hostname from the REST URL
2. Use port 6379 with TLS
3. Use the token as password

The code attempts to do this automatically, but for best results, get the Redis protocol endpoint from Upstash dashboard.

## Quick Start

1. Install dependencies: `npm install`
2. Set up environment variables (see `.env.example`)
3. Generate Prisma client: `npm run prisma:generate`
4. Run migrations: `npm run prisma:migrate`
5. Start development: `npm run dev`

## Database Migration

If you need to reset the database:

```bash
npx prisma migrate reset
npx prisma migrate dev
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

