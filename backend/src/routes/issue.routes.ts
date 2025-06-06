import { Router } from 'express';
import { IssueController } from '../controllers/issue.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Issue management routes
router.get('/', IssueController.getIssues);
router.get('/:id', IssueController.getIssue);
router.post('/', IssueController.createIssue);
router.put('/:id', IssueController.updateIssue);
router.delete('/:id', IssueController.deleteIssue);

// Issue sync routes
router.post('/sync/:trackerId', IssueController.syncIssues);

export { router as issueRoutes }; 