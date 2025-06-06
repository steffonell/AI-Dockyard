import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Current user routes
router.get('/me', UserController.getCurrentUser);

// User management routes
router.get('/', requireAdmin, UserController.getUsers);
router.get('/:id', UserController.getUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', requireAdmin, UserController.deleteUser);

// Password management
router.post('/:id/change-password', UserController.changePassword);

// User statistics
router.get('/:id/stats', UserController.getUserStats);

export { router as userRoutes }; 