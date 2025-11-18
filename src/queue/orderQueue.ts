import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';
import { OrderJobData } from '../types/orderTypes';
import { Logger } from '../utils/logger';

/**
 * BullMQ Queue for processing orders
 */
export class OrderQueue {
  private queue: Queue<OrderJobData>;
  private redis: Redis;

  constructor() {
    // Create Redis connection
    // For Upstash, we need to use the REST API or connect via Redis protocol
    // Since Upstash provides REST URL, we'll use ioredis with connection string
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      throw new Error('Redis credentials not found in environment variables');
    }

    // Upstash Redis connection
    // Extract host from REST URL and use Redis protocol
    // Upstash REST URL format: https://<endpoint>.upstash.io
    // Redis protocol uses same hostname but port 6379 with TLS
    const url = new URL(redisUrl);
    const host = url.hostname;
    const port = 6379;

    this.redis = new Redis({
      host,
      port,
      password: redisToken,
      tls: {
        rejectUnauthorized: false, // Upstash uses self-signed certificates
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      Logger.error('Redis connection error', { error: error.message });
    });

    this.redis.on('connect', () => {
      Logger.info('Redis connected');
    });

    // Create BullMQ queue
    const queueOptions: QueueOptions = {
      connection: {
        host,
        port,
        password: redisToken,
        tls: {
          rejectUnauthorized: false,
        },
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds, then 4, then 8
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    };

    this.queue = new Queue<OrderJobData>('orderQueue', queueOptions);

    Logger.info('Order queue initialized');
  }

  /**
   * Add an order to the queue
   */
  async addOrder(data: OrderJobData): Promise<void> {
    await this.queue.add('processOrder', data, {
      jobId: data.orderId,
      priority: 1,
    });
    Logger.info('Order added to queue', { orderId: data.orderId });
  }

  /**
   * Get queue instance (for worker)
   */
  getQueue(): Queue<OrderJobData> {
    return this.queue;
  }

  /**
   * Get Redis instance
   */
  getRedis(): Redis {
    return this.redis;
  }

  /**
   * Close queue and Redis connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.redis.quit();
    Logger.info('Order queue closed');
  }
}

