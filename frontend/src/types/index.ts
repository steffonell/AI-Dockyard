// Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'lead' | 'developer';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Issue types - Updated to match backend Prisma schema
export interface Issue {
  id: string;
  trackerId: string;
  extKey: string; // External key from tracker (e.g., PROJ-123)
  assigneeId?: string;
  title: string;
  description?: string;
  status: IssueStatus;
  payloadJson: any; // Raw JSON from external tracker
  createdAt: string;
  updatedAt: string;
  // Relations
  tracker?: Tracker;
  assignee?: User;
  prompts?: Prompt[];
}

export type IssueStatus = 'open' | 'in_progress' | 'done' | 'closed' | 'cancelled';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

// Tracker types
export interface Tracker {
  id: string;
  companyId: string;
  type: TrackerType;
  baseUrl?: string;
  authJson: any;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  company?: Company;
  issues?: Issue[];
}

export type TrackerType = 'jira' | 'teamwork';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  trackers?: Tracker[];
  templates?: PromptTemplate[];
}

export interface Prompt {
  id: string;
  issueId: string;
  templateId: string;
  creatorId: string;
  createdAt: string;
  // Relations
  issue?: Issue;
  template?: PromptTemplate;
  creator?: User;
  versions?: PromptVersion[];
  generationEvents?: GenerationEvent[];
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  bodyText: string;
  tokensEstimate?: number;
  createdAt: string;
  // Relations
  prompt?: Prompt;
  outputs?: Output[];
}

// Legacy types for backward compatibility
export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IssueFilters {
  status?: IssueStatus[];
  priority?: IssuePriority[];
  assignee?: string[];
  search?: string;
  labels?: string[];
}

// Template types - Updated to match backend
export interface PromptTemplate {
  id: string;
  companyId: string;
  creatorId: string;
  name: string;
  bodyMd: string; // Markdown body
  lintJson: any; // JSON schema for validation
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  company?: Company;
  creator?: User;
  prompts?: Prompt[];
}

// Legacy Template interface for backward compatibility
export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: TemplateVariable[];
  category: string;
  isActive: boolean;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

// Output and GenerationEvent types
export interface Output {
  id: string;
  promptVersionId: string;
  blobText?: string;
  filePath?: string;
  checksum?: string;
  createdAt: string;
  // Relations
  promptVersion?: PromptVersion;
}

export interface GenerationEvent {
  id: string;
  promptId: string;
  userId: string;
  tokensIn?: number;
  tokensOut?: number;
  ide?: string;
  timestamp: string;
  // Relations
  prompt?: Prompt;
  user?: User;
}

// Prompt types
export interface GeneratedPrompt {
  id: string;
  content: string;
  template: Template;
  issue: Issue;
  variables: Record<string, any>;
  tokenCount: number;
  createdBy: User;
  createdAt: string;
}

export interface PromptHistory {
  id: string;
  prompt: GeneratedPrompt;
  output?: string;
  feedback?: PromptFeedback;
  createdAt: string;
}

export interface PromptFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  isUseful: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
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

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

// UI State types
export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  autoHide?: boolean;
  duration?: number;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Form types
export interface FormField<T = any> {
  name: string;
  value: T;
  error?: string;
  touched: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | undefined;
}

// Statistics types
export interface DashboardStats {
  totalPrompts: number;
  avgTokensPerPrompt: number;
  activeUsers: number;
  successRate: number;
  promptsToday: number;
  promptsThisWeek: number;
  promptsThisMonth: number;
}

export interface UsageMetrics {
  date: string;
  promptCount: number;
  tokenCount: number;
  userCount: number;
} 