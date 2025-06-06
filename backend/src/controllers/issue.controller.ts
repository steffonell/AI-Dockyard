import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { JiraClient } from '../clients/jira.client';
import { TrackerClient } from '../clients/tracker.client';

const prisma = new PrismaClient();

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Validation schemas
const createIssueSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  assigneeId: z.string().optional(),
  trackerId: z.string(),
  externalId: z.string().optional(),
  labels: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional()
});

const updateIssueSchema = createIssueSchema.partial();

const queryIssuesSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('20'),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().optional(),
  trackerId: z.string().optional(),
  search: z.string().optional()
});

export class IssueController {
  // Get all issues with filtering and pagination
  static async getIssues(req: AuthenticatedRequest, res: Response) {
    try {
      const query = queryIssuesSchema.parse(req.query);
      const { page, limit, status, priority, assigneeId, trackerId, search } = query;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assigneeId) where.assigneeId = assigneeId;
      if (trackerId) where.trackerId = trackerId;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [issues, total] = await Promise.all([
        prisma.issue.findMany({
          where,
          skip,
          take: limit,
          include: {
            assignee: {
              select: { id: true, email: true, name: true }
            },
            tracker: {
              select: { id: true, name: true, type: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.issue.count({ where })
      ]);

      res.json({
        issues,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching issues:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch issues' });
    }
  }

  // Get single issue by ID
  static async getIssue(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const issue = await prisma.issue.findUnique({
        where: { id },
        include: {
          assignee: {
            select: { id: true, email: true, name: true }
          },
          tracker: {
            select: { id: true, name: true, type: true, config: true }
          }
        }
      });

      if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      res.json(issue);
    } catch (error) {
      logger.error('Error fetching issue:', { error });
      res.status(500).json({ error: 'Failed to fetch issue' });
    }
  }

  // Create new issue
  static async createIssue(req: AuthenticatedRequest, res: Response) {
    try {
      const data = createIssueSchema.parse(req.body);
      const userId = req.user?.id;

      // Verify tracker exists
      const tracker = await prisma.tracker.findUnique({
        where: { id: data.trackerId }
      });

      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      // Verify assignee exists if provided
      if (data.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: data.assigneeId }
        });
        if (!assignee) {
          return res.status(404).json({ error: 'Assignee not found' });
        }
      }

      const issue = await prisma.issue.create({
        data: {
          ...data,
          createdById: userId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined
        },
        include: {
          assignee: {
            select: { id: true, email: true, name: true }
          },
          tracker: {
            select: { id: true, name: true, type: true }
          },
          createdBy: {
            select: { id: true, email: true, name: true }
          }
        }
      });

      // Sync with external tracker if configured
      if (tracker.config && issue.externalId) {
        try {
          await IssueController.syncWithExternalTracker(issue, tracker);
        } catch (syncError) {
          logger.warn('Failed to sync with external tracker:', { error: syncError });
        }
      }

      res.status(201).json(issue);
    } catch (error) {
      logger.error('Error creating issue:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create issue' });
    }
  }

  // Update issue
  static async updateIssue(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = updateIssueSchema.parse(req.body);

      const existingIssue = await prisma.issue.findUnique({
        where: { id },
        include: { tracker: true }
      });

      if (!existingIssue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      // Verify assignee exists if provided
      if (data.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: data.assigneeId }
        });
        if (!assignee) {
          return res.status(404).json({ error: 'Assignee not found' });
        }
      }

      const issue = await prisma.issue.update({
        where: { id },
        data: {
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          updatedAt: new Date()
        },
        include: {
          assignee: {
            select: { id: true, email: true, name: true }
          },
          tracker: {
            select: { id: true, name: true, type: true }
          }
        }
      });

      // Sync with external tracker if configured
      if (existingIssue.tracker.config && issue.externalId) {
        try {
          await IssueController.syncWithExternalTracker(issue, existingIssue.tracker);
        } catch (syncError) {
          logger.warn('Failed to sync with external tracker:', { error: syncError });
        }
      }

      res.json(issue);
    } catch (error) {
      logger.error('Error updating issue:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update issue' });
    }
  }

  // Delete issue
  static async deleteIssue(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const issue = await prisma.issue.findUnique({
        where: { id }
      });

      if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
      }

      await prisma.issue.delete({
        where: { id }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting issue:', { error });
      res.status(500).json({ error: 'Failed to delete issue' });
    }
  }

  // Sync issues from external tracker
  static async syncIssues(req: AuthenticatedRequest, res: Response) {
    try {
      const { trackerId } = req.params;

      const tracker = await prisma.tracker.findUnique({
        where: { id: trackerId }
      });

      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      if (!tracker.config) {
        return res.status(400).json({ error: 'Tracker not configured for external sync' });
      }

      let client: TrackerClient;
      
      if (tracker.type === 'JIRA') {
        client = new JiraClient(tracker.config as any);
      } else {
        return res.status(400).json({ error: 'Unsupported tracker type' });
      }

      // Test connection first
      const isConnected = await client.testConnection();
      if (!isConnected) {
        return res.status(400).json({ error: 'Failed to connect to external tracker' });
      }

      // Fetch issues from external tracker
      const externalIssues = await client.getIssues();
      
      let syncedCount = 0;
      let errorCount = 0;

      for (const externalIssue of externalIssues) {
        try {
          await prisma.issue.upsert({
            where: {
              trackerId_externalId: {
                trackerId: tracker.id,
                externalId: externalIssue.id
              }
            },
            update: {
              title: externalIssue.title,
              description: externalIssue.description,
              status: externalIssue.status as any,
              priority: externalIssue.priority as any,
              updatedAt: new Date()
            },
            create: {
              title: externalIssue.title,
              description: externalIssue.description,
              status: externalIssue.status as any,
              priority: externalIssue.priority as any,
              externalId: externalIssue.id,
              trackerId: tracker.id,
              createdById: req.user?.id || tracker.createdById
            }
          });
          syncedCount++;
        } catch (syncError) {
          logger.error('Error syncing individual issue:', { error: syncError });
          errorCount++;
        }
      }

      res.json({
        message: 'Sync completed',
        syncedCount,
        errorCount,
        totalExternal: externalIssues.length
      });
    } catch (error) {
      logger.error('Error syncing issues:', { error });
      res.status(500).json({ error: 'Failed to sync issues' });
    }
  }

  // Helper method to sync with external tracker
  private static async syncWithExternalTracker(issue: any, tracker: any) {
    if (!tracker.config) return;

    let client: TrackerClient;
    
    if (tracker.type === 'JIRA') {
      client = new JiraClient(tracker.config);
    } else {
      throw new Error('Unsupported tracker type');
    }

    // This would typically update the external issue
    // Implementation depends on the specific tracker API
    logger.info('Syncing issue with external tracker:', {
      issueId: issue.id,
      externalId: issue.externalId,
      trackerType: tracker.type
    });
  }
} 