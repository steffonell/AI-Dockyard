import { Request, Response } from 'express';
import { z } from 'zod';
import { jwtService, UserRole } from '../services/jwt.service';
import { passwordService } from '../services/password.service';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(UserRole).optional()
});

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true
        }
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isPasswordValid = await passwordService.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole
      };

      const { accessToken, refreshToken } = jwtService.generateTokenPair(tokenPayload);

      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt
        }
      });

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
        return;
      }

      logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);

      // Verify refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken);
      
      // Check if refresh token exists in database and is not expired
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          expiresAt: {
            gt: new Date()
          },
          revokedAt: null
        }
      });

      if (!storedToken) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Generate new tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole
      };

      const tokens = jwtService.generateTokenPair(tokenPayload);

      // Revoke old refresh token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() }
      });

      // Store new refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt
        }
      });

      logger.info('Token refreshed successfully', { userId: user.id });

      res.status(200).json({
        message: 'Token refreshed successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokens
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
        return;
      }

      logger.error('Token refresh error:', error);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get the refresh token from the Authorization header or body
      const authHeader = req.headers.authorization;
      const refreshTokenFromBody = req.body.refreshToken;
      
      if (refreshTokenFromBody) {
        // Revoke the specific refresh token
        await prisma.refreshToken.updateMany({
          where: {
            token: refreshTokenFromBody,
            userId: req.user.userId,
            revokedAt: null
          },
          data: { revokedAt: new Date() }
        });
      } else {
        // Revoke all refresh tokens for the user
        await prisma.refreshToken.updateMany({
          where: {
            userId: req.user.userId,
            revokedAt: null
          },
          data: { revokedAt: new Date() }
        });
      }

      logger.info('User logged out successfully', { userId: req.user.userId });

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, password, role = UserRole.developer } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      // Validate password strength
      const passwordValidation = passwordService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({ 
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors
        });
        return;
      }

      // Hash password
      const passwordHash = await passwordService.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
        return;
      }

      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({
        message: 'Profile retrieved successfully',
        user
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 