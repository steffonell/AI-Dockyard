import { apiClient } from './apiClient';
import { Issue, IssueFilters, PaginatedResponse, ApiResponse } from '../types';

export interface IssueQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assigneeId?: string;
  trackerId?: string;
  search?: string;
}

export interface CreateIssueData {
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigneeId?: string;
  trackerId: string;
  externalId?: string;
  labels?: string[];
  dueDate?: string;
}

export interface UpdateIssueData extends Partial<CreateIssueData> {}

export class IssueService {
  static async getIssues(params: IssueQueryParams = {}): Promise<PaginatedResponse<Issue>> {
    const searchParams = new URLSearchParams();
    
    // Status mapping from frontend to backend values (now using lowercase to match Prisma schema)
    const statusMapping: Record<string, string> = {
      'open': 'open',
      'in_progress': 'in_progress', 
      'done': 'done',
      'closed': 'closed',
      'cancelled': 'cancelled'
    };
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        let finalValue = value.toString();
        
        // Map status values if this is a status parameter
        if (key === 'status' && statusMapping[finalValue]) {
          finalValue = statusMapping[finalValue];
        }
        
        searchParams.append(key, finalValue);
      }
    });

    const response = await apiClient.get<{
      issues: Issue[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/issues?${searchParams.toString()}`);

    return {
      data: response.data.issues,
      pagination: {
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.pages,
      },
    };
  }

  static async getIssue(id: string): Promise<Issue> {
    const response = await apiClient.get<Issue>(`/issues/${id}`);
    return response.data;
  }

  static async createIssue(data: CreateIssueData): Promise<Issue> {
    const response = await apiClient.post<Issue>('/issues', data);
    return response.data;
  }

  static async updateIssue(id: string, data: UpdateIssueData): Promise<Issue> {
    const response = await apiClient.put<Issue>(`/issues/${id}`, data);
    return response.data;
  }

  static async deleteIssue(id: string): Promise<void> {
    await apiClient.delete(`/issues/${id}`);
  }

  static async syncIssues(trackerId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(`/issues/sync/${trackerId}`);
    return response.data;
  }
}

export default IssueService; 