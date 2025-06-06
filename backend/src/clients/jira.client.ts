import { 
  TrackerClient, 
  TrackerClientConfig, 
  TrackerIssue, 
  TrackerProject, 
  TrackerUser, 
  TrackerSyncResult 
} from './tracker.client';
import { logger } from '../utils/logger';

interface JiraOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
}

interface JiraTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

interface JiraIssueResponse {
  expand: string;
  id: string;
  self: string;
  key: string;
  fields: {
    summary: string;
    description?: {
      content: any[];
    };
    status: {
      name: string;
      id: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
    };
    reporter?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
    };
    priority?: {
      name: string;
      id: string;
    };
    labels: string[];
    created: string;
    updated: string;
  };
}

interface JiraProjectResponse {
  expand: string;
  self: string;
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
}

export class JiraClient extends TrackerClient {
  private oauthConfig: JiraOAuthConfig;
  private accessToken?: string;

  constructor(config: TrackerClientConfig) {
    super(config);
    this.validateConfig();
    
    this.oauthConfig = {
      clientId: config.auth.credentials.clientId,
      clientSecret: config.auth.credentials.clientSecret,
      redirectUri: config.auth.credentials.redirectUri
    };

    if (config.auth.credentials.accessToken) {
      this.oauthConfig.accessToken = config.auth.credentials.accessToken;
      this.accessToken = config.auth.credentials.accessToken;
    }

    if (config.auth.credentials.refreshToken) {
      this.oauthConfig.refreshToken = config.auth.credentials.refreshToken;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      if (this.accessToken) {
        // Test if current token is valid
        const isValid = await this.testConnection();
        if (isValid) {
          return true;
        }
      }

      // Try to refresh token if we have a refresh token
      if (this.oauthConfig.refreshToken) {
        return await this.refreshAccessToken();
      }

      // If no valid token and no refresh token, need to go through OAuth flow
      logger.warn('No valid access token available. OAuth flow required.');
      return false;
    } catch (error) {
      logger.error('Jira authentication failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/rest/api/3/myself');
      return true;
    } catch (error) {
      logger.error('Jira connection test failed:', error);
      return false;
    }
  }

  async getProjects(): Promise<TrackerProject[]> {
    try {
      const response = await this.makeRequest('/rest/api/3/project');
      
      return response.map((project: JiraProjectResponse) => {
        const trackerProject: TrackerProject = {
          id: project.id,
          key: project.key,
          name: project.name,
          url: project.self
        };
        
        if (project.description) {
          trackerProject.description = project.description;
        }
        
        return trackerProject;
      });
    } catch (error) {
      logger.error('Failed to fetch Jira projects:', error);
      throw new Error('Failed to fetch projects from Jira');
    }
  }

  async getProject(projectKey: string): Promise<TrackerProject | null> {
    try {
      const response: JiraProjectResponse = await this.makeRequest(`/rest/api/3/project/${projectKey}`);
      
      const project: TrackerProject = {
        id: response.id,
        key: response.key,
        name: response.name,
        url: response.self
      };
      
      if (response.description) {
        project.description = response.description;
      }
      
      return project;
    } catch (error) {
      logger.error(`Failed to fetch Jira project ${projectKey}:`, error);
      return null;
    }
  }

  async getIssues(projectKey: string, options: {
    limit?: number;
    offset?: number;
    updatedSince?: Date;
    status?: string[];
  } = {}): Promise<TrackerIssue[]> {
    try {
      const { limit = 50, offset = 0, updatedSince, status } = options;
      
      let jql = `project = "${projectKey}"`;
      
      if (updatedSince) {
        const dateStr = updatedSince.toISOString().split('T')[0];
        jql += ` AND updated >= "${dateStr}"`;
      }
      
      if (status && status.length > 0) {
        const statusList = status.map(s => `"${s}"`).join(',');
        jql += ` AND status IN (${statusList})`;
      }
      
      jql += ' ORDER BY updated DESC';

      const response = await this.makeRequest('/rest/api/3/search', {
        method: 'POST',
        body: {
          jql,
          startAt: offset,
          maxResults: limit,
          fields: [
            'summary',
            'description',
            'status',
            'assignee',
            'reporter',
            'priority',
            'labels',
            'created',
            'updated'
          ]
        }
      });

      return response.issues.map((issue: JiraIssueResponse) => this.normalizeJiraIssue(issue));
    } catch (error) {
      logger.error('Failed to fetch Jira issues:', error);
      throw new Error('Failed to fetch issues from Jira');
    }
  }

  async getIssue(issueKey: string): Promise<TrackerIssue | null> {
    try {
      const response: JiraIssueResponse = await this.makeRequest(`/rest/api/3/issue/${issueKey}`);
      return this.normalizeJiraIssue(response);
    } catch (error) {
      logger.error(`Failed to fetch Jira issue ${issueKey}:`, error);
      return null;
    }
  }

  async getUsers(projectKey?: string): Promise<TrackerUser[]> {
    try {
      let endpoint = '/rest/api/3/users/search';
      if (projectKey) {
        endpoint = `/rest/api/3/user/assignable/search?project=${projectKey}`;
      }

      const response = await this.makeRequest(endpoint);
      
      return response.map((user: any) => ({
        id: user.accountId,
        name: user.displayName,
        email: user.emailAddress,
        displayName: user.displayName
      }));
    } catch (error) {
      logger.error('Failed to fetch Jira users:', error);
      throw new Error('Failed to fetch users from Jira');
    }
  }

  async syncIssues(projectKey: string, lastSyncTime?: Date): Promise<TrackerSyncResult> {
    const result: TrackerSyncResult = {
      success: false,
      issuesProcessed: 0,
      issuesCreated: 0,
      issuesUpdated: 0,
      errors: [],
      lastSyncTime: new Date()
    };

    try {
      const issueOptions: {
        limit: number;
        updatedSince?: Date;
      } = { limit: 1000 };
      
      if (lastSyncTime) {
        issueOptions.updatedSince = lastSyncTime;
      }
      
      const issues = await this.getIssues(projectKey, issueOptions);

      result.issuesProcessed = issues.length;
      
      // Here you would typically save issues to your database
      // For now, we'll just log the sync
      logger.info(`Synced ${issues.length} issues from Jira project ${projectKey}`);
      
      result.success = true;
      result.issuesCreated = issues.length; // Simplified - in reality you'd check if they exist
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      logger.error('Jira sync failed:', error);
    }

    return result;
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json'
    };
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.oauthConfig.refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokenEndpoint = 'https://auth.atlassian.com/oauth/token';
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret,
          refresh_token: this.oauthConfig.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json() as JiraTokenResponse;
      
      this.accessToken = tokenData.access_token;
      this.oauthConfig.accessToken = tokenData.access_token;
      
      if (tokenData.refresh_token) {
        this.oauthConfig.refreshToken = tokenData.refresh_token;
      }

      logger.info('Jira access token refreshed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to refresh Jira access token:', error);
      return false;
    }
  }

  private normalizeJiraIssue(jiraIssue: JiraIssueResponse): TrackerIssue {
    const issue: TrackerIssue = {
      id: jiraIssue.id,
      key: jiraIssue.key,
      title: jiraIssue.fields.summary,
      status: jiraIssue.fields.status.name,
      createdAt: new Date(jiraIssue.fields.created),
      updatedAt: new Date(jiraIssue.fields.updated),
      url: jiraIssue.self,
      rawData: jiraIssue
    };

    // Handle description (Jira uses Atlassian Document Format)
    if (jiraIssue.fields.description?.content) {
      issue.description = this.extractTextFromADF(jiraIssue.fields.description.content);
    }

    // Handle assignee
    if (jiraIssue.fields.assignee) {
      issue.assignee = {
        id: jiraIssue.fields.assignee.accountId,
        name: jiraIssue.fields.assignee.displayName,
        email: jiraIssue.fields.assignee.emailAddress
      };
    }

    // Handle reporter
    if (jiraIssue.fields.reporter) {
      issue.reporter = {
        id: jiraIssue.fields.reporter.accountId,
        name: jiraIssue.fields.reporter.displayName,
        email: jiraIssue.fields.reporter.emailAddress
      };
    }

    // Handle priority
    if (jiraIssue.fields.priority) {
      issue.priority = jiraIssue.fields.priority.name;
    }

    // Handle labels
    if (jiraIssue.fields.labels && jiraIssue.fields.labels.length > 0) {
      issue.labels = jiraIssue.fields.labels;
    }

    return issue;
  }

  private extractTextFromADF(content: any[]): string {
    // Simple extraction of text from Atlassian Document Format
    // This is a basic implementation - you might want to use a proper ADF parser
    let text = '';
    
    const extractText = (nodes: any[]): void => {
      for (const node of nodes) {
        if (node.type === 'text') {
          text += node.text;
        } else if (node.content) {
          extractText(node.content);
        }
        
        if (node.type === 'paragraph' || node.type === 'heading') {
          text += '\n';
        }
      }
    };
    
    extractText(content);
    return text.trim();
  }

  // OAuth flow helpers
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.oauthConfig.clientId,
      scope: 'read:jira-user read:jira-work manage:jira-project',
      redirect_uri: this.oauthConfig.redirectUri,
      response_type: 'code'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      const tokenEndpoint = 'https://auth.atlassian.com/oauth/token';
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret,
          code,
          redirect_uri: this.oauthConfig.redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokenData: JiraTokenResponse = await response.json();
      
      this.accessToken = tokenData.access_token;
      this.oauthConfig.accessToken = tokenData.access_token;
      this.oauthConfig.refreshToken = tokenData.refresh_token;

      logger.info('Jira OAuth token exchange successful');
      return true;
    } catch (error) {
      logger.error('Failed to exchange code for token:', error);
      return false;
    }
  }
} 