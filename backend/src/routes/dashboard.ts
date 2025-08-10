import { Router } from 'express';
import { getDashboardMetrics, getDashboardNotifications, getDepartmentChart } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

router.get('/metrics', getDashboardMetrics);
router.get('/notifications', getDashboardNotifications);
router.get('/department-chart', getDepartmentChart);

export default router;