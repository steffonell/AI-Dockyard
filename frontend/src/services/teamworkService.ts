import apiClient from './apiClient';

export interface TeamworkProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamworkTask {
  id: string;
  name: string;
  description?: string;
  status: string;
  projectId: string;
  projectName: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  createdAt: string;
  updatedAt: string;
  priority?: string;
  tags?: string[];
}

export interface TeamworkApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  projectId?: string;
  filters?: any;
  message?: string;
}

export class TeamworkService {
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.get<TeamworkApiResponse<any>>('/teamwork/test-connection');
      return {
        success: response.data.success,
        message: response.data.success ? 'Connection successful' : 'Connection failed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed'
      };
    }
  }

  static async getProjects(): Promise<TeamworkProject[]> {
    try {
      const response = await apiClient.get<TeamworkApiResponse<TeamworkProject[]>>('/teamwork/projects');
      console.log('Projects API response:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Failed to fetch Teamwork projects:', error);
      throw new Error(error.message || 'Failed to fetch projects');
    }
  }

  static async getAllTasks(filters: {
    completedOnly?: boolean;
    status?: string[];
    updatedAfter?: string;
  } = {}): Promise<TeamworkTask[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.completedOnly !== undefined) {
        params.append('completedOnly', filters.completedOnly.toString());
      }
      
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(s => params.append('status[]', s));
      }
      
      if (filters.updatedAfter) {
        params.append('updatedAfter', filters.updatedAfter);
      }

      const url = `/teamwork/tasks${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<TeamworkApiResponse<TeamworkTask[]>>(url);
      console.log('All tasks API response:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Failed to fetch Teamwork tasks:', error);
      throw new Error(error.message || 'Failed to fetch tasks');
    }
  }

  static async getProjectTasks(projectId: string, filters: {
    completedOnly?: boolean;
    status?: string[];
    updatedAfter?: string;
  } = {}): Promise<TeamworkTask[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.completedOnly !== undefined) {
        params.append('completedOnly', filters.completedOnly.toString());
      }
      
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(s => params.append('status[]', s));
      }
      
      if (filters.updatedAfter) {
        params.append('updatedAfter', filters.updatedAfter);
      }

      const url = `/teamwork/projects/${projectId}/tasks${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<TeamworkApiResponse<TeamworkTask[]>>(url);
      console.log('Project tasks API response:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error(`Failed to fetch tasks for project ${projectId}:`, error);
      throw new Error(error.message || 'Failed to fetch project tasks');
    }
  }
}

export default TeamworkService; 