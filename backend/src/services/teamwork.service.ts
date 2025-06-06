import { TeamworkClient } from '../clients/teamwork.client';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface TeamworkApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  apiVersion?: string;
  error?: {
    message: string;
    details?: string;
    code?: string;
    retryAfter?: number;
  };
  timestamp: string;
  projectId?: string;
  filters?: Record<string, any>;
}

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttl || this.defaultTTL)
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export class TeamworkService {
  private client: TeamworkClient | null = null;
  private cache = new MemoryCache();

  constructor() {
    this.initializeClient();
    
    // Clean up cache every 10 minutes
    setInterval(() => {
      this.cache.cleanup();
    }, 10 * 60 * 1000);
  }

  private initializeClient(): void {
    // Hardcoded for testing - replace with environment variables later
    const teamworkApiKey = 'twp_AHqW3amssAxEjsEAWtPQDigPeO8q';
    const teamworkSite = 'agentcocompany.teamwork.com';
    
    if (!teamworkApiKey || !teamworkSite) {
      logger.warn('Teamwork API credentials not configured');
      return;
    }

    this.client = new TeamworkClient({
      apiKey: teamworkApiKey,
      site: teamworkSite
    });

    logger.info('TeamworkClient initialized with hardcoded credentials for testing');
  }

  private ensureClient(): TeamworkClient {
    if (!this.client) {
      throw new Error('Teamwork client not initialized. Check API credentials.');
    }
    return this.client;
  }

  private handleApiError(error: any): TeamworkApiResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle rate limiting specifically
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      const errorObj: any = {
        message: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: error.retryAfter
      };
      
      if (config.server.nodeEnv === 'development') {
        errorObj.details = errorMessage;
      }
      
      return {
        success: false,
        error: errorObj,
        timestamp: new Date().toISOString()
      };
    }

    // Handle other errors
    const errorObj: any = {
      message: 'Failed to connect to Teamwork API'
    };
    
    if (config.server.nodeEnv === 'development') {
      errorObj.details = errorMessage;
    }
    
    return {
      success: false,
      error: errorObj,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Test connection to Teamwork API
   */
  async testConnection(): Promise<TeamworkApiResponse> {
    try {
      const client = this.ensureClient();
      const isConnected = await client.testConnection();
      
      if (isConnected) {
        logger.info('Teamwork API connection test successful');
        return {
          success: true,
          message: 'Connection to Teamwork API successful',
          apiVersion: 'v3',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      logger.error('Teamwork API connection test failed:', error);
      return this.handleApiError(error);
    }
  }

  /**
   * Get all projects with caching
   */
  async getProjects(): Promise<TeamworkApiResponse> {
    const cacheKey = 'teamwork:projects';
    
    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Returning cached Teamwork projects');
        return {
          success: true,
          data: cached,
          message: 'Projects retrieved from cache',
          timestamp: new Date().toISOString()
        };
      }

      const client = this.ensureClient();
      const projects = await client.getProjects();
      
      // Cache for 10 minutes (projects don't change often)
      this.cache.set(cacheKey, projects, 10 * 60 * 1000);
      
      logger.info(`Fetched ${projects.length} projects from Teamwork API`);
      
      return {
        success: true,
        data: projects,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to fetch Teamwork projects:', error);
      return this.handleApiError(error);
    }
  }

  /**
   * Get tasks for a specific project with caching
   */
  async getProjectTasks(projectId: string, filters: any = {}): Promise<TeamworkApiResponse> {
    const cacheKey = `teamwork:project:${projectId}:tasks:${JSON.stringify(filters)}`;
    
    try {
      // Check cache first - shorter TTL for tasks as they change more frequently
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info(`Returning cached tasks for project ${projectId}`);
        return {
          success: true,
          data: cached,
          projectId,
          filters,
          message: 'Tasks retrieved from cache',
          timestamp: new Date().toISOString()
        };
      }

      const client = this.ensureClient();
      const options: any = {};
      
      if (filters.completedOnly !== undefined) {
        options.completedOnly = filters.completedOnly;
      }
      
      if (filters.status && filters.status.length > 0) {
        options.status = filters.status;
      }
      
      if (filters.updatedAfter) {
        options.updatedSince = new Date(filters.updatedAfter);
      }

      const tasks = await client.getIssues(projectId, options);
      
      // Cache for 2 minutes (tasks change more frequently)
      this.cache.set(cacheKey, tasks, 2 * 60 * 1000);
      
      logger.info(`Fetched ${tasks.length} tasks for project ${projectId} from Teamwork API`);
      
      return {
        success: true,
        data: tasks,
        projectId,
        filters,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to fetch tasks for project ${projectId}:`, error);
      return this.handleApiError(error);
    }
  }

  /**
   * Get all tasks across all projects with caching
   */
  async getAllTasks(filters: any = {}): Promise<TeamworkApiResponse> {
    const cacheKey = `teamwork:all-tasks:${JSON.stringify(filters)}`;
    
    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Returning cached all tasks');
        return {
          success: true,
          data: cached,
          filters,
          message: 'Tasks retrieved from cache',
          timestamp: new Date().toISOString()
        };
      }

      const client = this.ensureClient();
      const options: any = {};
      
      if (filters.completedOnly !== undefined) {
        options.completedOnly = filters.completedOnly;
      }
      
      if (filters.status && filters.status.length > 0) {
        options.status = filters.status;
      }
      
      if (filters.updatedAfter) {
        options.updatedSince = new Date(filters.updatedAfter);
      }

      const tasks = await client.getIssues('', options); // Empty projectId gets all tasks
      
      // Cache for 2 minutes
      this.cache.set(cacheKey, tasks, 2 * 60 * 1000);
      
      logger.info(`Fetched ${tasks.length} tasks from all projects from Teamwork API`);
      
      return {
        success: true,
        data: tasks,
        filters,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to fetch all tasks:', error);
      return this.handleApiError(error);
    }
  }

  /**
   * Clear cache (useful for forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Teamwork service cache cleared');
  }
}

export const teamworkService = new TeamworkService(); 