import { Router } from 'express';
import { PromptController } from '../controllers/prompt.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Prompt management routes
router.get('/', PromptController.getPrompts);
router.get('/:id', PromptController.getPrompt);
router.post('/', PromptController.createPrompt);
router.put('/:id', PromptController.updatePrompt);
router.delete('/:id', PromptController.deletePrompt);

// Prompt version routes
router.get('/:id/versions', PromptController.getVersions);
router.post('/:id/versions', PromptController.createVersion);

// Analytics routes
router.post('/:id/generation', PromptController.recordGeneration);

export { router as promptRoutes }; 