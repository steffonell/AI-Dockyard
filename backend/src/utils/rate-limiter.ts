import { logger } from './logger';

interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (context: any) => string;
}

interface RequestTracker {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestTracker> = new Map();
  private maxRequests: number;
  private windowMs: number;
  private keyGenerator: (context: any) => string;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.keyGenerator = options.keyGenerator || (() => 'default');
  }

  async checkLimit(context: any = {}): Promise<{ allowed: boolean; resetTime?: number }> {
    const key = this.keyGenerator(context);
    const now = Date.now();
    
    let tracker = this.requests.get(key);
    
    // If no tracker exists or window has expired, create/reset
    if (!tracker || now >= tracker.resetTime) {
      tracker = {
        count: 0,
        resetTime: now + this.windowMs
      };
      this.requests.set(key, tracker);
    }
    
    // Check if limit exceeded
    if (tracker.count >= this.maxRequests) {
      logger.warn(`Rate limit exceeded for key: ${key}`, {
        count: tracker.count,
        maxRequests: this.maxRequests,
        resetTime: new Date(tracker.resetTime).toISOString()
      });
      
      return {
        allowed: false,
        resetTime: tracker.resetTime
      };
    }
    
    // Increment counter and allow request
    tracker.count++;
    this.requests.set(key, tracker);
    
    return { allowed: true };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, tracker] of this.requests.entries()) {
      if (now >= tracker.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Teamwork API rate limiter - Conservative limits based on Teamwork's typical limits
export const teamworkRateLimiter = new RateLimiter({
  maxRequests: 30, // Conservative limit - Teamwork typically allows 60+ per minute
  windowMs: 60 * 1000, // 1 minute window
  keyGenerator: (context) => `teamwork:${context.apiKey || 'default'}`
});

// Start cleanup interval
setInterval(() => {
  teamworkRateLimiter.cleanup();
}, 5 * 60 * 1000); // Clean up every 5 minutes

export { RateLimiter }; 