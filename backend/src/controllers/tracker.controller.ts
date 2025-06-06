import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { JiraClient } from '../clients/jira.client';
import { TeamworkClient } from '../clients/teamwork.client';
import { TrackerClient } from '../clients/tracker.client';

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
const createTrackerSchema = z.object({
  companyId: z.string(),
  type: z.enum(['jira', 'teamwork']),
  baseUrl: z.string().url().optional(),
  authJson: z.object({}).passthrough()
});

const updateTrackerSchema = createTrackerSchema.partial();

const queryTrackersSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('20'),
  companyId: z.string().optional(),
  type: z.enum(['jira', 'teamwork']).optional()
});

export class TrackerController {
  // Get all trackers with filtering and pagination
  static async getTrackers(req: AuthenticatedRequest, res: Response) {
    try {
      const query = queryTrackersSchema.parse(req.query);
      const { page, limit, companyId, type } = query;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (companyId) where.companyId = companyId;
      if (type) where.type = type;

      const [trackers, total] = await Promise.all([
        prisma.tracker.findMany({
          where,
          skip,
          take: limit,
          include: {
            company: {
              select: { id: true, name: true }
            },
            _count: {
              select: { issues: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.tracker.count({ where })
      ]);

      // Remove sensitive auth information from response
      const sanitizedTrackers = trackers.map((tracker: any) => ({
        ...tracker,
        authJson: undefined // Don't expose auth details
      }));

      res.json({
        trackers: sanitizedTrackers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching trackers:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch trackers' });
    }
  }

  // Get single tracker by ID
  static async getTracker(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const tracker = await prisma.tracker.findUnique({
        where: { id },
        include: {
          company: {
            select: { id: true, name: true }
          },
          issues: {
            select: {
              id: true,
              title: true,
              extKey: true,
              status: true,
              createdAt: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { issues: true }
          }
        }
      });

      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      // Remove sensitive auth information from response
      const sanitizedTracker = {
        ...tracker,
        authJson: undefined
      };

      res.json(sanitizedTracker);
    } catch (error) {
      logger.error('Error fetching tracker:', { error });
      res.status(500).json({ error: 'Failed to fetch tracker' });
    }
  }

  // Create new tracker (admin or lead only)
  static async createTracker(req: AuthenticatedRequest, res: Response) {
    try {
      // Check if user has permission
      if (!['admin', 'lead'].includes(req.user?.role || '')) {
        return res.status(403).json({ error: 'Admin or lead access required' });
      }

      const data = createTrackerSchema.parse(req.body);

      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: data.companyId }
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Test connection before creating
      let client: TrackerClient;
      
      if (data.type === 'jira') {
        client = new JiraClient(data.authJson as any);
      } else if (data.type === 'teamwork') {
        client = new TeamworkClient(data.authJson as any);
      } else {
        return res.status(400).json({ error: 'Unsupported tracker type' });
      }

      const isConnected = await client.testConnection();
      if (!isConnected) {
        return res.status(400).json({ error: 'Failed to connect to tracker with provided credentials' });
      }

      const tracker = await prisma.tracker.create({
        data,
        include: {
          company: {
            select: { id: true, name: true }
          },
          _count: {
            select: { issues: true }
          }
        }
      });

      // Remove sensitive auth information from response
      const sanitizedTracker = {
        ...tracker,
        authJson: undefined
      };

      res.status(201).json(sanitizedTracker);
    } catch (error) {
      logger.error('Error creating tracker:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create tracker' });
    }
  }

  // Update tracker (admin or lead only)
  static async updateTracker(req: AuthenticatedRequest, res: Response) {
    try {
      // Check if user has permission
      if (!['admin', 'lead'].includes(req.user?.role || '')) {
        return res.status(403).json({ error: 'Admin or lead access required' });
      }

      const { id } = req.params;
      const data = updateTrackerSchema.parse(req.body);

      const existingTracker = await prisma.tracker.findUnique({
        where: { id }
      });

      if (!existingTracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      // Test connection if auth data is being updated
      if (data.authJson || data.type) {
        const authJson = data.authJson || existingTracker.authJson;
        const type = data.type || existingTracker.type;

        let client: TrackerClient;
        
        if (type === 'jira') {
          client = new JiraClient(authJson as any);
        } else if (type === 'teamwork') {
          client = new TeamworkClient(authJson as any);
        } else {
          return res.status(400).json({ error: 'Unsupported tracker type' });
        }

        const isConnected = await client.testConnection();
        if (!isConnected) {
          return res.status(400).json({ error: 'Failed to connect to tracker with provided credentials' });
        }
      }

      const tracker = await prisma.tracker.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          company: {
            select: { id: true, name: true }
          },
          _count: {
            select: { issues: true }
          }
        }
      });

      // Remove sensitive auth information from response
      const sanitizedTracker = {
        ...tracker,
        authJson: undefined
      };

      res.json(sanitizedTracker);
    } catch (error) {
      logger.error('Error updating tracker:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update tracker' });
    }
  }

  // Delete tracker (admin only)
  static async deleteTracker(req: AuthenticatedRequest, res: Response) {
    try {
      // Check if user has permission
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      // Check if tracker has associated issues
      const issueCount = await prisma.issue.count({
        where: { trackerId: id }
      });

      if (issueCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete tracker with associated issues',
          details: `This tracker has ${issueCount} associated issues`
        });
      }

      await prisma.tracker.delete({
        where: { id }
      });

      res.json({ message: 'Tracker deleted successfully' });
    } catch (error) {
      logger.error('Error deleting tracker:', { error });
      res.status(500).json({ error: 'Failed to delete tracker' });
    }
  }

  // Test tracker connection
  static async testConnection(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const tracker = await prisma.tracker.findUnique({
        where: { id }
      });

      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      let client: TrackerClient;
      
      if (tracker.type === 'jira') {
        client = new JiraClient(tracker.authJson as any);
      } else if (tracker.type === 'teamwork') {
        client = new TeamworkClient(tracker.authJson as any);
      } else {
        return res.status(400).json({ error: 'Unsupported tracker type' });
      }

      const isConnected = await client.testConnection();
      
      res.json({
        connected: isConnected,
        trackerType: tracker.type,
        baseUrl: tracker.baseUrl,
        lastSync: tracker.lastSync
      });
    } catch (error) {
      logger.error('Error testing tracker connection:', { error });
      res.status(500).json({ error: 'Failed to test tracker connection' });
    }
  }

  // Sync tracker issues
  static async syncTracker(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const tracker = await prisma.tracker.findUnique({
        where: { id }
      });

      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      let client: TrackerClient;
      
      if (tracker.type === 'jira') {
        client = new JiraClient(tracker.authJson as any);
      } else if (tracker.type === 'teamwork') {
        client = new TeamworkClient(tracker.authJson as any);
      } else {
        return res.status(400).json({ error: 'Unsupported tracker type' });
      }

      // Test connection first
      const isConnected = await client.testConnection();
      if (!isConnected) {
        return res.status(400).json({ error: 'Failed to connect to tracker' });
      }

      // Fetch issues from external tracker
      const externalIssues = await client.getIssues(''); // Use empty string or get from config
      
      let syncedCount = 0;
      let errorCount = 0;

      for (const externalIssue of externalIssues) {
        try {
          await prisma.issue.upsert({
            where: {
              trackerId_extKey: {
                trackerId: tracker.id,
                extKey: externalIssue.id
              }
            },
            update: {
              title: externalIssue.title,
              description: externalIssue.description,
              status: externalIssue.status as any,
              payloadJson: externalIssue,
              updatedAt: new Date()
            },
            create: {
              title: externalIssue.title,
              description: externalIssue.description,
              status: externalIssue.status as any,
              extKey: externalIssue.id,
              trackerId: tracker.id,
              payloadJson: externalIssue
            }
          });
          syncedCount++;
        } catch (syncError) {
          logger.error('Error syncing individual issue:', { error: syncError });
          errorCount++;
        }
      }

      // Update last sync time
      await prisma.tracker.update({
        where: { id },
        data: { lastSync: new Date() }
      });

      res.json({
        message: 'Sync completed',
        syncedCount,
        errorCount,
        totalExternal: externalIssues.length
      });
    } catch (error) {
      logger.error('Error syncing tracker:', { error });
      res.status(500).json({ error: 'Failed to sync tracker' });
    }
  }
} 