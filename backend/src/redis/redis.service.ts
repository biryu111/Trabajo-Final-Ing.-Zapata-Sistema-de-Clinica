import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private upstashClient: UpstashRedis | null = null;
  private ioRedisClient: IORedis | null = null;
  private inMemoryCache = new Map<string, { value: string; expiresAt: number }>();

  async onModuleInit() {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      try {
        this.upstashClient = new UpstashRedis({
          url: upstashUrl,
          token: upstashToken,
        });
        this.logger.log('Conectado exitosamente a Upstash Redis (REST Cloud)');
        return;
      } catch (err: any) {
        this.logger.warn(`Error inicializando Upstash Redis: ${err.message}`);
      }
    }

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.ioRedisClient = new IORedis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        });
        await this.ioRedisClient.connect().catch(() => null);
        this.logger.log('Conectado a Redis mediante IORedis');
        return;
      } catch (err: any) {
        this.logger.warn(`IORedis no disponible (${err.message}). Usando caché en memoria.`);
      }
    }

    this.logger.log('Usando caché en memoria de respaldo.');
  }

  async get(key: string): Promise<string | null> {
    if (this.upstashClient) {
      try {
        const val = await this.upstashClient.get<any>(key);
        if (val === null || val === undefined) return null;
        return typeof val === 'string' ? val : JSON.stringify(val);
      } catch (err: any) {
        this.logger.warn(`Error leyendo de Upstash: ${err.message}`);
      }
    }

    if (this.ioRedisClient) {
      try {
        return await this.ioRedisClient.get(key);
      } catch (err) {
        // Fallback
      }
    }

    const item = this.inMemoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.inMemoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 60): Promise<void> {
    if (this.upstashClient) {
      try {
        await this.upstashClient.set(key, value, { ex: ttlSeconds });
        return;
      } catch (err: any) {
        this.logger.warn(`Error escribiendo en Upstash: ${err.message}`);
      }
    }

    if (this.ioRedisClient) {
      try {
        await this.ioRedisClient.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (err) {
        // Fallback
      }
    }

    this.inMemoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.upstashClient) {
      try {
        await this.upstashClient.del(key);
      } catch (err) {}
    }

    if (this.ioRedisClient) {
      try {
        await this.ioRedisClient.del(key);
      } catch (err) {}
    }

    this.inMemoryCache.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (this.upstashClient) {
      try {
        const keys = await this.upstashClient.keys(pattern);
        if (keys && keys.length > 0) {
          await this.upstashClient.del(...keys);
        }
      } catch (err) {}
    }

    if (this.ioRedisClient) {
      try {
        const stream = this.ioRedisClient.scanStream({ match: pattern });
        stream.on('data', (keys: string[]) => {
          if (keys.length) {
            const pipeline = this.ioRedisClient!.pipeline();
            keys.forEach((key) => pipeline.del(key));
            pipeline.exec();
          }
        });
      } catch (err) {}
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.inMemoryCache.keys()) {
      if (regex.test(key)) {
        this.inMemoryCache.delete(key);
      }
    }
  }
}
