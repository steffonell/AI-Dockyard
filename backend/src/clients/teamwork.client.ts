import axios from 'axios';
import { logger } from '../utils/logger';
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
  description?: string;
  status: string;
  'project-id': string;
  'project-name': string;
  'responsible-party-id'?: string;
  'responsible-party-names'?: string;
  'responsible-party-email'?: string;
  'created-on': string;
  'last-changed-on': string;
  priority?: string;
  tags?: { name: string }[];
}

interface TeamworkProjectResponse {
  id: string;
  name: string;
  description?: string;
  status: string;
  'created-on': string;
  'last-changed-on': string;
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
    const issue: TrackerIssue = {
      id: task.id,
      key: task.id, // Teamwork doesn't have task keys like Jira
      title: task.name,
      status: this.normalizeStatus(task.status),
      createdAt: new Date(task['created-on']),
      updatedAt: new Date(task['last-changed-on']),
      rawData: task
    };

    // Handle optional description
    if (task.description) {
      issue.description = task.description;
    }

    // Handle URL
    if (task.id) {
      issue.url = `${this.baseUrl}/tasks/${task.id}`;
    }

    // Handle assignee
    if (task['responsible-party-id']) {
      issue.assignee = {
        id: task['responsible-party-id'],
        name: task['responsible-party-names'] || '',
        email: task['responsible-party-email'] || ''
      };
    }

    // Handle priority
    if (task.priority) {
      issue.priority = task.priority;
    }

    // Handle labels/tags
    if (task.tags && task.tags.length > 0) {
      issue.labels = task.tags.map(tag => tag.name);
    }

    return issue;
  }

  private normalizeStatus(teamworkStatus: string): string {
    // Map Teamwork status to standard status values
    switch (teamworkStatus?.toLowerCase()) {
      case 'new':
      case 'notstarted': return 'open';
      case 'inprogress': return 'in_progress';
      case 'completed': return 'done';
      case 'cancelled': return 'cancelled';
      default: return teamworkStatus || 'open';
    }
  }
} 