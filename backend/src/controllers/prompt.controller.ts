import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { TemplateService } from '../services/template.service';
import OpenAI from 'openai';

const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Validation schemas
const createPromptSchema = z.object({
  issueId: z.string(),
  templateId: z.string(),
  variables: z.object({}).passthrough().optional()
});

const updatePromptSchema = z.object({
  variables: z.object({}).passthrough().optional()
});

const createVersionSchema = z.object({
  bodyText: z.string().min(1),
  tokensEstimate: z.number().optional()
});

const queryPromptsSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('20'),
  issueId: z.string().optional(),
  templateId: z.string().optional(),
  creatorId: z.string().optional()
});

// Validation schema for chat completion
const chatCompletionSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'developer']),
    content: z.string()
  })),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4096).optional(),
  instructions: z.string().optional()
});

export class PromptController {
  // Get all prompts with filtering and pagination
  static async getPrompts(req: AuthenticatedRequest, res: Response) {
    try {
      const query = queryPromptsSchema.parse(req.query);
      const { page, limit, issueId, templateId, creatorId } = query;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (issueId) where.issueId = issueId;
      if (templateId) where.templateId = templateId;
      if (creatorId) where.creatorId = creatorId;

      const [prompts, total] = await Promise.all([
        prisma.prompt.findMany({
          where,
          skip,
          take: limit,
          include: {
            issue: {
              select: { id: true, title: true, extKey: true, status: true }
            },
            template: {
              select: { id: true, name: true }
            },
            creator: {
              select: { id: true, email: true, name: true }
            },
            versions: {
              select: { id: true, version: true, createdAt: true, tokensEstimate: true },
              orderBy: { version: 'desc' },
              take: 1
            },
            _count: {
              select: { versions: true, generationEvents: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.prompt.count({ where })
      ]);

      res.json({
        prompts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching prompts:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch prompts' });
    }
  }

  // Get single prompt by ID
  static async getPrompt(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const prompt = await prisma.prompt.findUnique({
        where: { id },
        include: {
          issue: {
            include: {
              assignee: {
                select: { id: true, email: true, name: true }
              },
              tracker: {
                select: { id: true, type: true, baseUrl: true }
              }
            }
          },
          template: true,
          creator: {
            select: { id: true, email: true, name: true }
          },
          versions: {
            include: {
              outputs: {
                select: { id: true, filePath: true, createdAt: true }
              }
            },
            orderBy: { version: 'desc' }
          },
          generationEvents: {
            select: { id: true, tokensIn: true, tokensOut: true, ide: true, timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 10
          }
        }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      res.json(prompt);
    } catch (error) {
      logger.error('Error fetching prompt:', { error });
      res.status(500).json({ error: 'Failed to fetch prompt' });
    }
  }

  // Create new prompt
  static async createPrompt(req: AuthenticatedRequest, res: Response) {
    try {
      const data = createPromptSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      // Verify issue exists
      const issue = await prisma.issue.findUnique({
        where: { id: data.issueId },
        include: {
          assignee: true,
          tracker: {
            include: { company: true }
          }
        }
      });

      if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      // Verify template exists and is active
      const template = await prisma.promptTemplate.findUnique({
        where: { id: data.templateId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (!template.isActive) {
        return res.status(400).json({ error: 'Template is not active' });
      }

      // Create the prompt
      const prompt = await prisma.prompt.create({
        data: {
          issueId: data.issueId,
          templateId: data.templateId,
          creatorId: userId
        },
        include: {
          issue: {
            select: { id: true, title: true, extKey: true, status: true }
          },
          template: {
            select: { id: true, name: true }
          },
          creator: {
            select: { id: true, email: true, name: true }
          }
        }
      });

      // Generate initial version if variables provided
      if (data.variables) {
        try {
          const templateService = new TemplateService();
          const context = {
            issue: {
              id: issue.id,
              title: issue.title,
              description: issue.description || '',
              status: issue.status,
              extKey: issue.extKey,
              ...(issue.assignee && {
                assignee: {
                  name: issue.assignee.name,
                  email: issue.assignee.email
                }
              })
            },
            user: {
              name: req.user?.email || '',
              email: req.user?.email || '',
              role: req.user?.role || ''
            },
            ...(issue.tracker.company && {
              company: {
                name: issue.tracker.company.name
              }
            }),
            ...(issue.tracker && {
              tracker: {
                type: issue.tracker.type,
                baseUrl: issue.tracker.baseUrl || undefined
              }
            }),
            ...data.variables
          };

          const renderedText = await templateService.renderTemplate(template.bodyMd, context);
          
          await prisma.promptVersion.create({
            data: {
              promptId: prompt.id,
              version: 1,
              bodyText: renderedText,
              tokensEstimate: Math.ceil(renderedText.length / 4) // Rough estimate
            }
          });
        } catch (renderError) {
          logger.warn('Failed to render initial prompt version:', { error: renderError });
        }
      }

      res.status(201).json(prompt);
    } catch (error) {
      logger.error('Error creating prompt:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create prompt' });
    }
  }

  // Update prompt (mainly for regenerating with new variables)
  static async updatePrompt(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = updatePromptSchema.parse(req.body);
      const userId = req.user?.userId;

      const prompt = await prisma.prompt.findUnique({
        where: { id },
        include: {
          issue: {
            include: {
              assignee: true,
              tracker: { include: { company: true } }
            }
          },
          template: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Check if user has permission to update
      if (prompt.creatorId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions to update this prompt' });
      }

      // Generate new version if variables provided
      if (data.variables) {
        const templateService = new TemplateService();
        const context = {
          issue: {
            id: prompt.issue.id,
            title: prompt.issue.title,
            description: prompt.issue.description || '',
            status: prompt.issue.status,
            extKey: prompt.issue.extKey,
            ...(prompt.issue.assignee && {
              assignee: {
                name: prompt.issue.assignee.name,
                email: prompt.issue.assignee.email
              }
            })
          },
          user: {
            name: req.user?.email || '',
            email: req.user?.email || '',
            role: req.user?.role || ''
          },
          ...(prompt.issue.tracker.company && {
            company: {
              name: prompt.issue.tracker.company.name
            }
          }),
          ...(prompt.issue.tracker && {
            tracker: {
              type: prompt.issue.tracker.type,
              baseUrl: prompt.issue.tracker.baseUrl || undefined
            }
          }),
          ...data.variables
        };

        const renderedText = await templateService.renderTemplate(prompt.template.bodyMd, context);
        const nextVersion = (prompt.versions[0]?.version || 0) + 1;
        
        await prisma.promptVersion.create({
          data: {
            promptId: prompt.id,
            version: nextVersion,
            bodyText: renderedText,
            tokensEstimate: Math.ceil(renderedText.length / 4)
          }
        });
      }

      // Return updated prompt
      const updatedPrompt = await prisma.prompt.findUnique({
        where: { id },
        include: {
          issue: {
            select: { id: true, title: true, extKey: true, status: true }
          },
          template: {
            select: { id: true, name: true }
          },
          creator: {
            select: { id: true, email: true, name: true }
          },
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      });

      res.json(updatedPrompt);
    } catch (error) {
      logger.error('Error updating prompt:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update prompt' });
    }
  }

  // Delete prompt
  static async deletePrompt(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const prompt = await prisma.prompt.findUnique({
        where: { id }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Check if user has permission to delete
      if (prompt.creatorId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions to delete this prompt' });
      }

      await prisma.prompt.delete({
        where: { id }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting prompt:', { error });
      res.status(500).json({ error: 'Failed to delete prompt' });
    }
  }

  // Create new prompt version
  static async createVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = createVersionSchema.parse(req.body);
      const userId = req.user?.userId;

      const prompt = await prisma.prompt.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      // Check if user has permission to create versions
      if (prompt.creatorId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions to create versions for this prompt' });
      }

      const nextVersion = (prompt.versions[0]?.version || 0) + 1;

      const version = await prisma.promptVersion.create({
        data: {
          promptId: id,
          version: nextVersion,
          bodyText: data.bodyText,
          tokensEstimate: data.tokensEstimate || Math.ceil(data.bodyText.length / 4)
        }
      });

      res.status(201).json(version);
    } catch (error) {
      logger.error('Error creating prompt version:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create prompt version' });
    }
  }

  // Get prompt versions
  static async getVersions(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const prompt = await prisma.prompt.findUnique({
        where: { id }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      const versions = await prisma.promptVersion.findMany({
        where: { promptId: id },
        include: {
          outputs: {
            select: { id: true, filePath: true, createdAt: true }
          }
        },
        orderBy: { version: 'desc' }
      });

      res.json(versions);
    } catch (error) {
      logger.error('Error fetching prompt versions:', { error });
      res.status(500).json({ error: 'Failed to fetch prompt versions' });
    }
  }

  // Record generation event
  static async recordGeneration(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { tokensIn, tokensOut, ide } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      const prompt = await prisma.prompt.findUnique({
        where: { id }
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      const event = await prisma.generationEvent.create({
        data: {
          promptId: id,
          userId,
          tokensIn,
          tokensOut,
          ide
        }
      });

      res.status(201).json(event);
    } catch (error) {
      logger.error('Error recording generation event:', { error });
      res.status(500).json({ error: 'Failed to record generation event' });
    }
  }

  // Chat completion endpoint
  static async chatCompletion(req: AuthenticatedRequest, res: Response) {
    try {
      const data = chatCompletionSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      // Log the generation event
      logger.info('Chat completion request:', {
        userId,
        model: data.model,
        messageCount: data.messages.length
      });

      // Prepare the request parameters
      const requestParams: any = {
        model: data.model,
        messages: data.messages.map(msg => ({
          role: msg.role === 'developer' ? 'user' : msg.role, // Map developer to user for OpenAI API
          content: msg.content
        }))
      };

      // Add optional parameters only if they are defined
      if (data.temperature !== undefined) {
        requestParams.temperature = data.temperature;
      }
      if (data.max_tokens !== undefined) {
        requestParams.max_tokens = data.max_tokens;
      }

      // Make request to OpenAI
      const response = await openai.chat.completions.create(requestParams);

      // Extract the response text
      const responseText = response.choices[0]?.message?.content || '';

      // Note: Generation events are designed for prompt-based generation
      // For standalone chat completion, we just log the usage without database storage

      res.json({
        response: responseText,
        usage: response.usage,
        model: data.model
      });

    } catch (error) {
      logger.error('Error in chat completion:', { error });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }

      if (error instanceof Error && error.message.includes('API key')) {
        return res.status(500).json({ 
          error: 'OpenAI API configuration error' 
        });
      }

      res.status(500).json({ 
        error: 'Failed to generate completion' 
      });
    }
  }
} 