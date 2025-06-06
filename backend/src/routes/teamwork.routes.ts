import { Router, Request, Response } from 'express';
import { teamworkService, TeamworkApiResponse } from '../services/teamwork.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/teamwork/projects
 * Retrieve all projects accessible to the authenticated user
 */
router.get('/projects', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching Teamwork projects');
    const result: TeamworkApiResponse = await teamworkService.getProjects();
    
    if (result.success) {
      res.json(result);
    } else {
      // Check if it's a rate limit error
      if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
        res.status(429).json(result);
      } else {
        res.status(500).json(result);
      }
    }
  } catch (error) {
    logger.error('Unexpected error in projects endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/teamwork/projects/:id/tasks
 * Retrieve all tasks for a specific project
 * Query parameters:
 * - completedOnly: true/false (default: false)
 * - status[]: array of status values (new, completed, etc.)
 * - updatedAfter: YYYY-MM-DD format
 */
router.get('/projects/:id/tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completedOnly, status, updatedAfter } = req.query;
    
    logger.info(`Fetching tasks for project ${id}`, { completedOnly, status, updatedAfter });
    
    // Parse query parameters
    const filters: any = {};
    
    if (completedOnly !== undefined) {
      filters.completedOnly = completedOnly === 'true';
    }
    
    if (status) {
      // Handle array of status values
      filters.status = Array.isArray(status) ? status as string[] : [status as string];
    }
    
    if (updatedAfter) {
      filters.updatedAfter = updatedAfter as string;
    }
    
    const result: TeamworkApiResponse = await teamworkService.getProjectTasks(id, filters);
    
    if (result.success) {
      res.json(result);
    } else {
      // Check if it's a rate limit error
      if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
        res.status(429).json(result);
      } else {
        res.status(500).json(result);
      }
    }
  } catch (error) {
    logger.error(`Unexpected error in project tasks endpoint for project ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/teamwork/tasks
 * Retrieve all tasks across all projects
 * Query parameters: same as project tasks endpoint
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { completedOnly, status, updatedAfter } = req.query;
    
    logger.info('Fetching all Teamwork tasks', { completedOnly, status, updatedAfter });
    
    // Parse query parameters
    const filters: any = {};
    
    if (completedOnly !== undefined) {
      filters.completedOnly = completedOnly === 'true';
    }
    
    if (status) {
      // Handle array of status values  
      filters.status = Array.isArray(status) ? status as string[] : [status as string];
    }
    
    if (updatedAfter) {
      filters.updatedAfter = updatedAfter as string;
    }
    
    const result: TeamworkApiResponse = await teamworkService.getAllTasks(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      // Check if it's a rate limit error
      if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
        res.status(429).json(result);
      } else {
        res.status(500).json(result);
      }
    }
  } catch (error) {
    logger.error('Unexpected error in all tasks endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/teamwork/test-connection
 * Test the connection to Teamwork API
 */
router.get('/test-connection', async (req: Request, res: Response) => {
  try {
    logger.info('Testing Teamwork API connection');
    const result: TeamworkApiResponse = await teamworkService.testConnection();
    
    if (result.success) {
      res.json(result);
    } else {
      // Check if it's a rate limit error
      if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
        res.status(429).json(result);
      } else {
        res.status(500).json(result);
      }
    }
  } catch (error) {
    logger.error('Unexpected error in test connection endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/teamwork/clear-cache
 * Clear the Teamwork service cache (for testing/troubleshooting)
 */
router.post('/clear-cache', async (req: Request, res: Response) => {
  try {
    logger.info('Clearing Teamwork service cache');
    teamworkService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear cache'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export { router as teamworkRoutes }; 