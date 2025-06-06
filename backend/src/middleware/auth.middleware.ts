import { Request, Response, NextFunction } from 'express';
import { jwtService, UserRole } from '../services/jwt.service';
import { logger } from '../utils/logger';
import { prisma } from '../utils/database';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = jwtService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const payload = jwtService.verifyAccessToken(token);
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (requiredRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!requiredRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

// Role hierarchy: admin > lead > developer
export const requireMinimumRole = (minimumRole: UserRole) => {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.developer]: 1,
    [UserRole.lead]: 2,
    [UserRole.admin]: 3
  };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoleLevel = roleHierarchy[req.user.role];
    const requiredRoleLevel = roleHierarchy[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: minimumRole,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

// Check if user is admin
export const requireAdmin = requireRole([UserRole.admin]);

// Check if user is at least a lead
export const requireLead = requireMinimumRole(UserRole.lead);

// Resource ownership check
export const requireOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admin can access any resource
    if (req.user.role === UserRole.admin) {
      next();
      return;
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      res.status(400).json({ error: 'Resource user ID not found' });
      return;
    }

    if (req.user.userId !== resourceUserId) {
      res.status(403).json({ error: 'Access denied: not resource owner' });
      return;
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = jwtService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      next();
      return;
    }

    const payload = jwtService.verifyAccessToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true }
    });

    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole
      };
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
};

export type { AuthenticatedRequest }; 