import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Template management routes
router.get('/', TemplateController.getTemplates);
router.get('/:id', TemplateController.getTemplate);
router.post('/', TemplateController.createTemplate);
router.put('/:id', TemplateController.updateTemplate);
router.delete('/:id', TemplateController.deleteTemplate);

// Template utility routes
router.post('/:id/render', TemplateController.renderTemplate);
router.post('/:id/clone', TemplateController.cloneTemplate);

export { router as templateRoutes }; 