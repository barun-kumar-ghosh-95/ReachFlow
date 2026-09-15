// src/lib/redis.ts
// Redis client singleton for BullMQ and caching

import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => (times > 2 ? null : 1000),
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
  })

  client.on('connect', () => {
    console.log('[Redis] Connected')
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export default redis
