import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

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
const createCompanySchema = z.object({
  name: z.string().min(1).max(255)
});

const updateCompanySchema = createCompanySchema.partial();

const queryCompaniesSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('20'),
  search: z.string().optional()
});

export class CompanyController {
  // Get all companies with filtering and pagination
  static async getCompanies(req: AuthenticatedRequest, res: Response) {
    try {
      const query = queryCompaniesSchema.parse(req.query);
      const { page, limit, search } = query;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where,
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                trackers: true,
                templates: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.company.count({ where })
      ]);

      res.json({
        companies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching companies:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch companies' });
    }
  }

  // Get single company by ID
  static async getCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          trackers: {
            select: {
              id: true,
              type: true,
              baseUrl: true,
              lastSync: true,
              createdAt: true
            }
          },
          templates: {
            select: {
              id: true,
              name: true,
              isActive: true,
              createdAt: true
            },
            where: { isActive: true },
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              trackers: true,
              templates: true
            }
          }
        }
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json(company);
    } catch (error) {
      logger.error('Error fetching company:', { error });
      res.status(500).json({ error: 'Failed to fetch company' });
    }
  }

  // Create new company (admin only)
  static async createCompany(req: AuthenticatedRequest, res: Response) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const data = createCompanySchema.parse(req.body);

      // Check if company name already exists
      const existingCompany = await prisma.company.findFirst({
        where: { name: data.name }
      });

      if (existingCompany) {
        return res.status(400).json({ error: 'Company name already exists' });
      }

      const company = await prisma.company.create({
        data,
        include: {
          _count: {
            select: {
              trackers: true,
              templates: true
            }
          }
        }
      });

      res.status(201).json(company);
    } catch (error) {
      logger.error('Error creating company:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create company' });
    }
  }

  // Update company (admin only)
  static async updateCompany(req: AuthenticatedRequest, res: Response) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;
      const data = updateCompanySchema.parse(req.body);

      const existingCompany = await prisma.company.findUnique({
        where: { id }
      });

      if (!existingCompany) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Check if new name already exists (if name is being changed)
      if (data.name && data.name !== existingCompany.name) {
        const nameExists = await prisma.company.findFirst({
          where: { name: data.name }
        });

        if (nameExists) {
          return res.status(400).json({ error: 'Company name already exists' });
        }
      }

      const company = await prisma.company.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          _count: {
            select: {
              trackers: true,
              templates: true
            }
          }
        }
      });

      res.json(company);
    } catch (error) {
      logger.error('Error updating company:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update company' });
    }
  }

  // Delete company (admin only)
  static async deleteCompany(req: AuthenticatedRequest, res: Response) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              trackers: true,
              templates: true
            }
          }
        }
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Check if company has associated data
      if (company._count.trackers > 0 || company._count.templates > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete company with associated trackers or templates',
          details: {
            trackers: company._count.trackers,
            templates: company._count.templates
          }
        });
      }

      await prisma.company.delete({
        where: { id }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting company:', { error });
      res.status(500).json({ error: 'Failed to delete company' });
    }
  }

  // Get company statistics
  static async getCompanyStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: { id }
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const [
        trackersCount,
        templatesCount,
        activeTemplatesCount,
        totalIssues,
        totalPrompts
      ] = await Promise.all([
        prisma.tracker.count({ where: { companyId: id } }),
        prisma.promptTemplate.count({ where: { companyId: id } }),
        prisma.promptTemplate.count({ where: { companyId: id, isActive: true } }),
        prisma.issue.count({
          where: {
            tracker: { companyId: id }
          }
        }),
        prisma.prompt.count({
          where: {
            template: { companyId: id }
          }
        })
      ]);

      const stats = {
        trackers: trackersCount,
        templates: templatesCount,
        activeTemplates: activeTemplatesCount,
        totalIssues,
        totalPrompts
      };

      res.json(stats);
    } catch (error) {
      logger.error('Error fetching company stats:', { error });
      res.status(500).json({ error: 'Failed to fetch company statistics' });
    }
  }
} 