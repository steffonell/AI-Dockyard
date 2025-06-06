import { Router } from 'express';
import { TrackerController } from '../controllers/tracker.controller';
import { authenticateToken, requireAdmin, requireLead } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Tracker management routes
router.get('/', TrackerController.getTrackers);
router.get('/:id', TrackerController.getTracker);
router.post('/', requireLead, TrackerController.createTracker);
router.put('/:id', requireLead, TrackerController.updateTracker);
router.delete('/:id', requireAdmin, TrackerController.deleteTracker);

// Tracker utility routes
router.post('/:id/test', TrackerController.testConnection);
router.post('/:id/sync', TrackerController.syncTracker);

export { router as trackerRoutes }; 