import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { TemplateService } from '../services/template.service';

const prisma = new PrismaClient();

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Validation schemas
const createTemplateSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1).max(255),
  bodyMd: z.string().min(1),
  lintJson: z.object({}).passthrough()
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
  isActive: z.boolean().optional()
});

const queryTemplatesSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('20'),
  companyId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional()
});

export class TemplateController {
  // Get all templates with filtering and pagination
  static async getTemplates(req: AuthenticatedRequest, res: Response) {
    try {
      const query = queryTemplatesSchema.parse(req.query);
      const { page, limit, companyId, isActive, search } = query;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (companyId) where.companyId = companyId;
      if (typeof isActive === 'boolean') where.isActive = isActive;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { bodyMd: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [templates, total] = await Promise.all([
        prisma.promptTemplate.findMany({
          where,
          skip,
          take: limit,
          include: {
            creator: {
              select: { id: true, email: true, name: true }
            },
            company: {
              select: { id: true, name: true }
            },
            _count: {
              select: { prompts: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.promptTemplate.count({ where })
      ]);

      res.json({
        templates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching templates:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  // Get single template by ID
  static async getTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const template = await prisma.promptTemplate.findUnique({
        where: { id },
        include: {
          creator: {
            select: { id: true, email: true, name: true }
          },
          company: {
            select: { id: true, name: true }
          },
          prompts: {
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      logger.error('Error fetching template:', { error });
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  }

  // Create new template
  static async createTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const data = createTemplateSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: data.companyId }
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Validate template using template service
      const templateService = new TemplateService();
      const validation = templateService.validateTemplate(data.bodyMd);
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Template validation failed', 
          details: validation.errors 
        });
      }

      const template = await prisma.promptTemplate.create({
        data: {
          ...data,
          creatorId: userId
        },
        include: {
          creator: {
            select: { id: true, email: true, name: true }
          },
          company: {
            select: { id: true, name: true }
          }
        }
      });

      res.status(201).json(template);
    } catch (error) {
      logger.error('Error creating template:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create template' });
    }
  }

  // Update template
  static async updateTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = updateTemplateSchema.parse(req.body);
      const userId = req.user?.userId;

      const existingTemplate = await prisma.promptTemplate.findUnique({
        where: { id },
        include: { company: true }
      });

      if (!existingTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check if user has permission to update (creator or admin role)
      if (existingTemplate.creatorId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions to update this template' });
      }

      // Validate template if bodyMd or lintJson changed
      if (data.bodyMd) {
        const templateService = new TemplateService();
        const bodyMd = data.bodyMd || existingTemplate.bodyMd;
        
        const validation = templateService.validateTemplate(bodyMd);
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Template validation failed', 
            details: validation.errors 
          });
        }
      }

      const template = await prisma.promptTemplate.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          creator: {
            select: { id: true, email: true, name: true }
          },
          company: {
            select: { id: true, name: true }
          }
        }
      });

      res.json(template);
    } catch (error) {
      logger.error('Error updating template:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update template' });
    }
  }

  // Delete template (soft delete by setting isActive to false)
  static async deleteTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const template = await prisma.promptTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check if user has permission to delete (creator or admin role)
      if (template.creatorId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions to delete this template' });
      }

      // Soft delete - set isActive to false
      await prisma.promptTemplate.update({
        where: { id },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting template:', { error });
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }

  // Render template with variables
  static async renderTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { variables } = req.body;

      const template = await prisma.promptTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (!template.isActive) {
        return res.status(400).json({ error: 'Template is not active' });
      }

      const templateService = new TemplateService();
      const rendered = await templateService.renderTemplate(template.bodyMd, variables || {});

      res.json({
        rendered,
        originalTemplate: template.bodyMd,
        variables
      });
    } catch (error) {
      logger.error('Error rendering template:', { error });
      res.status(500).json({ error: 'Failed to render template' });
    }
  }

  // Clone template
  static async cloneTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, companyId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      const originalTemplate = await prisma.promptTemplate.findUnique({
        where: { id }
      });

      if (!originalTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Verify target company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });

      if (!company) {
        return res.status(404).json({ error: 'Target company not found' });
      }

      const clonedTemplate = await prisma.promptTemplate.create({
        data: {
          name: name || `${originalTemplate.name} (Copy)`,
          bodyMd: originalTemplate.bodyMd,
          lintJson: originalTemplate.lintJson,
          companyId,
          creatorId: userId,
          isActive: true
        },
        include: {
          creator: {
            select: { id: true, email: true, name: true }
          },
          company: {
            select: { id: true, name: true }
          }
        }
      });

      res.status(201).json(clonedTemplate);
    } catch (error) {
      logger.error('Error cloning template:', { error });
      res.status(500).json({ error: 'Failed to clone template' });
    }
  }
} 