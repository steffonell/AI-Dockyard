import axios from 'axios';
import { logger } from '../utils/logger';
import { teamworkRateLimiter } from '../utils/rate-limiter';
import { 
  TrackerClient, 
  TrackerIssue, 
  TrackerProject, 
  TrackerUser, 
  TrackerSyncResult,
  TrackerClientConfig 
} from './tracker.client';

interface TeamworkAuthConfig {
  apiKey: string;
  site: string; // e.g., 'mycompany.teamwork.com'
}

interface TeamworkTaskResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  createdOn: string;
  lastChangedOn: string;
  dueDate?: string;
  completedOn?: string;
  projectId: string;
  projectName: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface TeamworkProjectResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  createdOn: string;
  lastChangedOn: string;
}

export class TeamworkClient extends TrackerClient {
  private teamworkAuth: TeamworkAuthConfig;

  constructor(authConfig: TeamworkAuthConfig) {
    const config: TrackerClientConfig = {
      baseUrl: `https://${authConfig.site}`,
      auth: {
        type: 'api_key',
        credentials: {
          apiKey: authConfig.apiKey
        }
      }
    };
    
    super(config);
    this.teamworkAuth = authConfig;
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/projects/api/v3/projects.json?pageSize=1');
      return !!response;
    } catch (error) {
      logger.error('Teamwork authentication failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/projects/api/v3/projects.json?pageSize=1');
      return true;
    } catch (error) {
      logger.error('Teamwork connection test failed:', error);
      return false;
    }
  }

  async getProjects(): Promise<TrackerProject[]> {
    try {
      const response = await this.makeRequest('/projects/api/v3/projects.json');
      const projects = response.projects || [];
      
      return projects.map((project: TeamworkProjectResponse) => ({
        id: project.id,
        key: project.id, // Teamwork doesn't have project keys like Jira
        name: project.name,
        description: project.description,
        url: `${this.baseUrl}/projects/${project.id}`
      }));
    } catch (error) {
      logger.error('Failed to fetch Teamwork projects:', error);
      throw new Error('Failed to fetch projects from Teamwork');
    }
  }

  async getProject(projectId: string): Promise<TrackerProject | null> {
    try {
      const response = await this.makeRequest(`/projects/api/v3/projects/${projectId}.json`);
      const project = response.project;
      
      if (!project) return null;
      
      return {
        id: project.id,
        key: project.id,
        name: project.name,
        description: project.description,
        url: `${this.baseUrl}/projects/${project.id}`
      };
    } catch (error) {
      logger.error(`Failed to fetch Teamwork project ${projectId}:`, error);
      return null;
    }
  }

  async getIssues(projectId: string = '', options: {
    limit?: number;
    offset?: number;
    updatedSince?: Date;
    status?: string[];
  } = {}): Promise<TrackerIssue[]> {
    try {
      const { limit = 250, updatedSince, status } = options;
      
      let url = '/projects/api/v3/tasks.json';
      const params = new URLSearchParams();
      
      // If projectId is provided, get tasks for specific project
      if (projectId) {
        url = `/projects/api/v3/projects/${projectId}/tasks.json`;
      }
      
      params.append('pageSize', limit.toString());
      
      if (updatedSince) {
        const dateStr = updatedSince.toISOString().split('T')[0];
        params.append('updatedAfter', dateStr);
      }
      
      if (status && status.length > 0) {
        // Map common status values to Teamwork status
        const teamworkStatus = status.map(s => {
          switch (s.toLowerCase()) {
            case 'open':
            case 'new': return 'new';
            case 'in_progress':
            case 'in progress': return 'inprogress';
            case 'done':
            case 'completed': return 'completed';
            default: return s;
          }
        });
        teamworkStatus.forEach(s => params.append('status[]', s));
      }
      
      const fullUrl = `${url}?${params.toString()}`;
      const response = await this.makeRequest(fullUrl);
      const tasks = response.tasks || [];
      
      return tasks.map((task: TeamworkTaskResponse) => this.normalizeTeamworkTask(task));
    } catch (error) {
      logger.error('Failed to fetch Teamwork tasks:', error);
      throw new Error('Failed to fetch tasks from Teamwork');
    }
  }

  async getIssue(taskId: string): Promise<TrackerIssue | null> {
    try {
      const response = await this.makeRequest(`/projects/api/v3/tasks/${taskId}.json`);
      const task = response.task;
      
      if (!task) return null;
      
      return this.normalizeTeamworkTask(task);
    } catch (error) {
      logger.error(`Failed to fetch Teamwork task ${taskId}:`, error);
      return null;
    }
  }

  async getUsers(projectId?: string): Promise<TrackerUser[]> {
    try {
      let url = '/projects/api/v3/people.json';
      if (projectId) {
        url = `/projects/api/v3/projects/${projectId}/people.json`;
      }
      
      const response = await this.makeRequest(url);
      const people = response.people || [];
      
      return people.map((person: any) => ({
        id: person.id,
        name: person['first-name'] + ' ' + person['last-name'],
        email: person['email-address']
      }));
    } catch (error) {
      logger.error('Failed to fetch Teamwork users:', error);
      throw new Error('Failed to fetch users from Teamwork');
    }
  }

  async syncIssues(projectId: string = '', lastSyncTime?: Date): Promise<TrackerSyncResult> {
    const result: TrackerSyncResult = {
      success: false,
      issuesProcessed: 0,
      issuesCreated: 0,
      issuesUpdated: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      const options: any = { limit: 1000 };
      if (lastSyncTime) {
        options.updatedSince = lastSyncTime;
      }
      
      const tasks = await this.getIssues(projectId, options);
      result.issuesProcessed = tasks.length;
      
      // Note: Actual database operations would happen in the controller
      // This is just the sync logic for fetching from Teamwork
      logger.info(`Synced ${tasks.length} tasks from Teamwork ${projectId ? `project ${projectId}` : '(all projects)'}`);
      
      result.success = true;
      result.issuesCreated = tasks.length; // Simplified - in reality you'd check if they exist
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      logger.error('Teamwork sync failed:', error);
    }

    return result;
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    const credentials = Buffer.from(`${this.teamworkAuth.apiKey}:x`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`
    };
  }

  private normalizeTeamworkTask(task: TeamworkTaskResponse): TrackerIssue {
    // Use the parent class normalization method to ensure proper type handling
    return this.normalizeIssue({
      id: task.id,
      key: task.id,
      title: task.name,
      summary: task.name, // Alternative property name support
      description: task.description,
      status: task.status,
      assignee: task.assignedTo ? {
        id: task.assignedTo.id,
        name: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
        displayName: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
        email: task.assignedTo.emailAddress,
        emailAddress: task.assignedTo.emailAddress
      } : null,
      reporter: task.createdBy ? {
        id: task.createdBy.id,
        name: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
        displayName: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
        email: ''
      } : null,
      priority: task.priority,
      created: task.createdOn,
      createdAt: task.createdOn,
      updated: task.lastChangedOn,
      updatedAt: task.lastChangedOn,
      url: `${this.baseUrl}/tasks/${task.id}`,
      self: `${this.baseUrl}/tasks/${task.id}`,
      labels: [],
      tags: []
    });
  }

  private mapTeamworkStatus(teamworkStatus: string): 'open' | 'in_progress' | 'done' | 'closed' | 'cancelled' {
    switch (teamworkStatus.toLowerCase()) {
      case 'new':
      case 'active': return 'open';
      case 'inprogress':
      case 'in-progress': return 'in_progress';
      case 'completed':
      case 'complete': return 'done';
      case 'closed': return 'closed';
      default: return 'open';
    }
  }

  // Override makeRequest to add rate limiting
  protected async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    // Check rate limit before making request
    const rateLimitCheck = await teamworkRateLimiter.checkLimit({
      apiKey: this.teamworkAuth.apiKey
    });

    if (!rateLimitCheck.allowed) {
      const resetTime = rateLimitCheck.resetTime;
      const waitTime = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
      
      const error = new Error(`Teamwork API rate limit exceeded. Please try again in ${waitTime} seconds.`);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).retryAfter = waitTime;
      
      logger.warn('Teamwork API rate limit exceeded', { 
        endpoint, 
        waitTime,
        resetTime: resetTime ? new Date(resetTime).toISOString() : undefined
      });
      
      throw error;
    }

    // Make the actual request using parent class method
    return super.makeRequest(endpoint, options);
  }
} 