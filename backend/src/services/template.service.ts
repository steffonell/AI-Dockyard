import Handlebars from 'handlebars';
import { logger } from '../utils/logger';

export interface TemplateContext {
  issue: {
    id: string;
    title: string;
    description?: string;
    status: string;
    extKey: string;
    assignee?: {
      name: string;
      email: string;
    };
    [key: string]: any;
  };
  user: {
    name: string;
    email: string;
    role: string;
  };
  company?: {
    name: string;
  };
  tracker?: {
    type: string;
    baseUrl?: string;
  };
  [key: string]: any;
}

export class TemplateService {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Helper to format dates
    this.handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString();
    });

    // Helper to format issue status
    this.handlebars.registerHelper('formatStatus', (status: string) => {
      return status.replace(/_/g, ' ').toUpperCase();
    });

    // Helper for conditional rendering
    this.handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper to truncate text
    this.handlebars.registerHelper('truncate', (text: string, length: number = 100) => {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    });

    // Helper to convert to uppercase
    this.handlebars.registerHelper('upper', (text: string) => {
      return text ? text.toUpperCase() : '';
    });

    // Helper to convert to lowercase
    this.handlebars.registerHelper('lower', (text: string) => {
      return text ? text.toLowerCase() : '';
    });

    // Helper to join array elements
    this.handlebars.registerHelper('join', (array: any[], separator: string = ', ') => {
      return Array.isArray(array) ? array.join(separator) : '';
    });

    // Helper to check if value exists
    this.handlebars.registerHelper('exists', function(this: any, value: any, options: any) {
      return value ? options.fn(this) : options.inverse(this);
    });
  }

  async renderTemplate(templateBody: string, context: TemplateContext): Promise<string> {
    try {
      const template = this.handlebars.compile(templateBody);
      const rendered = template(context);
      
      logger.debug('Template rendered successfully', {
        templateLength: templateBody.length,
        contextKeys: Object.keys(context),
        renderedLength: rendered.length
      });

      return rendered;
    } catch (error) {
      logger.error('Template rendering failed:', error);
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateTemplate(templateBody: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Try to compile the template
      this.handlebars.compile(templateBody);
    } catch (error) {
      errors.push(`Template compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check for common issues
    if (!templateBody.trim()) {
      errors.push('Template body cannot be empty');
    }

    // Check for unmatched handlebars brackets
    const openBrackets = (templateBody.match(/\{\{/g) || []).length;
    const closeBrackets = (templateBody.match(/\}\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push('Unmatched handlebars brackets');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  extractVariables(templateBody: string): string[] {
    const variables: Set<string> = new Set();
    
    try {
      // Parse the template to extract variables
      const ast = this.handlebars.parse(templateBody);
      
      const extractFromNode = (node: any) => {
        if (node.type === 'MustacheStatement' || node.type === 'BlockStatement') {
          if (node.path && node.path.original) {
            variables.add(node.path.original);
          }
        }
        
        if (node.body) {
          node.body.forEach(extractFromNode);
        }
        
        if (node.program) {
          extractFromNode(node.program);
        }
        
        if (node.inverse) {
          extractFromNode(node.inverse);
        }
      };
      
      ast.body.forEach(extractFromNode);
    } catch (error) {
      logger.warn('Failed to extract variables from template:', error);
    }

    return Array.from(variables);
  }

  async previewTemplate(templateBody: string, sampleContext?: Partial<TemplateContext>): Promise<string> {
    const defaultContext: TemplateContext = {
      issue: {
        id: 'sample-id',
        title: 'Sample Issue Title',
        description: 'This is a sample issue description for preview purposes.',
        status: 'open',
        extKey: 'PROJ-123',
        assignee: {
          name: 'John Doe',
          email: 'john.doe@example.com'
        }
      },
      user: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'developer'
      },
      company: {
        name: 'Sample Company'
      },
      tracker: {
        type: 'jira',
        baseUrl: 'https://company.atlassian.net'
      }
    };

    const context = { ...defaultContext, ...sampleContext };
    
    try {
      return await this.renderTemplate(templateBody, context);
    } catch (error) {
      return `Preview Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

export const templateService = new TemplateService(); 