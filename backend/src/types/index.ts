import { Request } from 'express';

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// User types
export type UserRole = 'admin' | 'lead' | 'developer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Tracker types
export type TrackerType = 'jira' | 'teamwork';

export interface TrackerClient {
  authenticate(): Promise<void>;
  fetchIssues(deltaFilter?: Date): Promise<Issue[]>;
  fetchIssue(externalKey: string): Promise<Issue>;
}

// Issue types
export type IssueStatus = 'open' | 'in_progress' | 'done' | 'closed' | 'cancelled';

export interface Issue {
  id: string;
  trackerId: string;
  extKey: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: IssueStatus;
  payloadJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueFilters {
  status?: IssueStatus[];
  assigneeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Template types
export interface PromptTemplate {
  id: string;
  companyId: string;
  creatorId: string;
  name: string;
  bodyMd: string;
  lintJson: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

// Prompt generation types
export interface GeneratePromptRequest {
  issueId: string;
  templateId: string;
  variables?: Record<string, unknown>;
}

export interface GeneratedPrompt {
  promptVersionId: string;
  promptText: string;
  tokensEstimate: number;
}

// Output types
export interface Output {
  id: string;
  promptVersionId: string;
  blobText?: string;
  filePath?: string;
  checksum?: string;
  createdAt: Date;
}

// Analytics types
export interface StatsSummary {
  promptsToday: number;
  avgTokensPerPrompt: number;
  activeUsers: number;
  successRate: number;
}

export interface GenerationEvent {
  id: string;
  promptId: string;
  userId: string;
  tokensIn?: number;
  tokensOut?: number;
  ide?: string;
  timestamp: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// Request context types
export interface AuthenticatedRequest extends Request {
  user: User;
}

// Configuration types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;
  bcryptRounds: number;
  uploadDir: string;
  maxFileSize: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

// Queue job types
export interface SyncJobData {
  trackerId: string;
  deltaFilter?: Date;
}

export interface JobResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors?: string[];
} 