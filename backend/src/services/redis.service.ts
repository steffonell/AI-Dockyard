import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });
    
    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Refresh Token Management
  async storeRefreshToken(userId: string, token: string, expiryInSeconds: number = 604800): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.client.setEx(key, expiryInSeconds, token);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh_token:${userId}`;
    return await this.client.get(key);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.client.del(key);
  }

  async isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
    const storedToken = await this.getRefreshToken(userId);
    return storedToken === token;
  }

  // Generic Cache Operations
  async set(key: string, value: string, expiryInSeconds?: number): Promise<void> {
    if (expiryInSeconds) {
      await this.client.setEx(key, expiryInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Rate Limiting Support
  async incrementCounter(key: string, expiryInSeconds: number = 3600): Promise<number> {
    const current = await this.client.incr(key);
    if (current === 1) {
      await this.client.expire(key, expiryInSeconds);
    }
    return current;
  }

  async getCounter(key: string): Promise<number> {
    const value = await this.client.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  // Session Management
  async storeUserSession(userId: string, sessionData: object, expiryInSeconds: number = 3600): Promise<void> {
    const key = `session:${userId}`;
    await this.client.setEx(key, expiryInSeconds, JSON.stringify(sessionData));
  }

  async getUserSession(userId: string): Promise<object | null> {
    const key = `session:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.client.del(key);
  }

  // Health Check
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const redisService = new RedisService(); 