import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { PasswordService } from '../services/password.service';

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
const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'lead', 'developer']).optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

const queryUsersSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).default('20'),
  role: z.enum(['admin', 'lead', 'developer']).optional(),
  search: z.string().optional()
});

export class UserController {
  // Get current user profile
  static async getCurrentUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignedIssues: true,
              createdPrompts: true,
              createdTemplates: true,
              generationEvents: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      logger.error('Error fetching current user:', { error });
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  // Get all users with filtering and pagination (admin only)
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const query = queryUsersSchema.parse(req.query);
      const { page, limit, role, search } = query;
      
      const skip = (page - 1) * limit;
      
      const where: any = {};
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                assignedIssues: true,
                createdPrompts: true,
                createdTemplates: true,
                generationEvents: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Get user by ID
  static async getUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.userId;

      // Users can only view their own profile unless they're admin
      if (id !== currentUserId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignedIssues: true,
              createdPrompts: true,
              createdTemplates: true,
              generationEvents: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      logger.error('Error fetching user:', { error });
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  // Update user profile
  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = updateUserSchema.parse(req.body);
      const currentUserId = req.user?.userId;

      // Users can only update their own profile unless they're admin
      if (id !== currentUserId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Only admins can change roles
      if (data.role && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can change user roles' });
      }

      // Check if email is already taken by another user
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: data.email }
        });

        if (emailExists) {
          return res.status(400).json({ error: 'Email already in use' });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json(user);
    } catch (error) {
      logger.error('Error updating user:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // Change password
  static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = changePasswordSchema.parse(req.body);
      const currentUserId = req.user?.userId;

      // Users can only change their own password
      if (id !== currentUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const passwordService = new PasswordService();
      const isCurrentPasswordValid = await passwordService.verifyPassword(
        data.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await passwordService.hashPassword(data.newPassword);

      // Update password
      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Error changing password:', { error });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  // Delete user (admin only)
  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.userId;

      // Only admins can delete users
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Prevent self-deletion
      if (id === currentUserId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await prisma.user.delete({
        where: { id }
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting user:', { error });
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  // Get user statistics
  static async getUserStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.userId;

      // Users can only view their own stats unless they're admin
      if (id !== currentUserId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const [
        assignedIssuesCount,
        createdPromptsCount,
        createdTemplatesCount,
        totalGenerations,
        totalTokensUsed
      ] = await Promise.all([
        prisma.issue.count({ where: { assigneeId: id } }),
        prisma.prompt.count({ where: { creatorId: id } }),
        prisma.promptTemplate.count({ where: { creatorId: id } }),
        prisma.generationEvent.count({ where: { userId: id } }),
        prisma.generationEvent.aggregate({
          where: { userId: id },
          _sum: {
            tokensIn: true,
            tokensOut: true
          }
        })
      ]);

      const stats = {
        assignedIssues: assignedIssuesCount,
        createdPrompts: createdPromptsCount,
        createdTemplates: createdTemplatesCount,
        totalGenerations,
        totalTokensIn: totalTokensUsed._sum.tokensIn || 0,
        totalTokensOut: totalTokensUsed._sum.tokensOut || 0,
        totalTokens: (totalTokensUsed._sum.tokensIn || 0) + (totalTokensUsed._sum.tokensOut || 0)
      };

      res.json(stats);
    } catch (error) {
      logger.error('Error fetching user stats:', { error });
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  }
} 