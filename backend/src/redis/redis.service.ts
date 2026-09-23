import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private inMemoryCache = new Map<string, { value: string; expiresAt: number }>();
  private isConnected = false;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // No reintentar indefinidamente si no está activo
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Conectado exitosamente a Redis Cache');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis no disponible (${err.message}). Usando caché en memoria de respaldo.`);
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Fallback: Redis no disponible. Usando caché en memoria fallback (${err.message})`);
      });
    } catch (e) {
      this.isConnected = false;
      this.logger.warn('Modo Fallback activado para la capa de caché.');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => null);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        // Ignorar error y caer al fallback
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
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (err) {
        // Ignorar error y caer al fallback
      }
    }

    this.inMemoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (err) {
        // Ignorar error
      }
    }
    this.inMemoryCache.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const stream = this.client.scanStream({ match: pattern });
        stream.on('data', (keys: string[]) => {
          if (keys.length) {
            const pipeline = this.client!.pipeline();
            keys.forEach((key) => pipeline.del(key));
            pipeline.exec();
          }
        });
      } catch (err) {
        // Ignorar
      }
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.inMemoryCache.keys()) {
      if (regex.test(key)) {
        this.inMemoryCache.delete(key);
      }
    }
  }
}
