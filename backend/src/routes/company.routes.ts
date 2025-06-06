import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Company management routes
router.get('/', CompanyController.getCompanies);
router.get('/:id', CompanyController.getCompany);
router.post('/', requireAdmin, CompanyController.createCompany);
router.put('/:id', requireAdmin, CompanyController.updateCompany);
router.delete('/:id', requireAdmin, CompanyController.deleteCompany);

// Company statistics
router.get('/:id/stats', CompanyController.getCompanyStats);

export { router as companyRoutes }; 