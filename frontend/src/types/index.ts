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

// Issue types
export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee?: User;
  reporter: User;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  jiraKey?: string;
  jiraUrl?: string;
  comments: Comment[];
  attachments: Attachment[];
}

export type IssueStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

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

// Template types
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