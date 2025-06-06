export interface TrackerIssue {
  id: string;
  key: string;
  title: string;
  description?: string;
  status: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  reporter?: {
    id: string;
    name: string;
    email: string;
  };
  priority?: string;
  labels?: string[];
  createdAt: Date;
  updatedAt: Date;
  url?: string;
  rawData: any; // Store original response for flexibility
}

export interface TrackerProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  url?: string;
}

export interface TrackerUser {
  id: string;
  name: string;
  email: string;
  displayName?: string;
}

export interface TrackerAuthConfig {
  type: 'oauth2' | 'api_key' | 'basic';
  credentials: {
    [key: string]: string;
  };
}

export interface TrackerSyncResult {
  success: boolean;
  issuesProcessed: number;
  issuesCreated: number;
  issuesUpdated: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface TrackerClientConfig {
  baseUrl: string;
  auth: TrackerAuthConfig;
  projectKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

export abstract class TrackerClient {
  protected config: TrackerClientConfig;
  protected baseUrl: string;
  protected auth: TrackerAuthConfig;

  constructor(config: TrackerClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.auth = config.auth;
  }

  // Abstract methods that must be implemented by specific tracker clients
  abstract authenticate(): Promise<boolean>;
  abstract testConnection(): Promise<boolean>;
  abstract getProjects(): Promise<TrackerProject[]>;
  abstract getProject(projectKey: string): Promise<TrackerProject | null>;
  abstract getIssues(projectKey: string, options?: {
    limit?: number;
    offset?: number;
    updatedSince?: Date;
    status?: string[];
  }): Promise<TrackerIssue[]>;
  abstract getIssue(issueKey: string): Promise<TrackerIssue | null>;
  abstract getUsers(projectKey?: string): Promise<TrackerUser[]>;
  abstract syncIssues(projectKey: string, lastSyncTime?: Date): Promise<TrackerSyncResult>;

  // Common utility methods
  protected async makeRequest(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
    } = {}
  ): Promise<any> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout || 30000
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers
      },
      signal: AbortSignal.timeout(timeout)
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }

  protected abstract getAuthHeaders(): Promise<Record<string, string>>;

  protected normalizeIssue(rawIssue: any): TrackerIssue {
    // This should be overridden by specific implementations
    // but provides a basic structure
    const issue: TrackerIssue = {
      id: rawIssue.id || rawIssue.key,
      key: rawIssue.key || rawIssue.id,
      title: rawIssue.title || rawIssue.summary || rawIssue.subject,
      status: rawIssue.status?.name || rawIssue.status || 'unknown',
      createdAt: new Date(rawIssue.created || rawIssue.createdAt || Date.now()),
      updatedAt: new Date(rawIssue.updated || rawIssue.updatedAt || Date.now()),
      rawData: rawIssue
    };

    // Handle optional properties
    if (rawIssue.description || rawIssue.body) {
      issue.description = rawIssue.description || rawIssue.body;
    }

    if (rawIssue.assignee) {
      issue.assignee = {
        id: rawIssue.assignee.id || rawIssue.assignee.accountId,
        name: rawIssue.assignee.name || rawIssue.assignee.displayName,
        email: rawIssue.assignee.email || rawIssue.assignee.emailAddress
      };
    }

    if (rawIssue.reporter) {
      issue.reporter = {
        id: rawIssue.reporter.id || rawIssue.reporter.accountId,
        name: rawIssue.reporter.name || rawIssue.reporter.displayName,
        email: rawIssue.reporter.email || rawIssue.reporter.emailAddress
      };
    }

    if (rawIssue.priority?.name || rawIssue.priority) {
      issue.priority = rawIssue.priority?.name || rawIssue.priority;
    }

    if (rawIssue.labels || rawIssue.tags) {
      issue.labels = rawIssue.labels || rawIssue.tags || [];
    }

    if (rawIssue.self || rawIssue.url) {
      issue.url = rawIssue.self || rawIssue.url;
    }

    return issue;
  }

  protected async retryRequest<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts || 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  }

  // Utility method to validate configuration
  protected validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new Error('Base URL is required');
    }

    if (!this.config.auth) {
      throw new Error('Authentication configuration is required');
    }

    if (!this.config.auth.type) {
      throw new Error('Authentication type is required');
    }

    if (!this.config.auth.credentials) {
      throw new Error('Authentication credentials are required');
    }
  }
} 