import { Router } from 'express';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  toggleUserStatus,
  getSystemSettings,
  createSystemSetting,
  updateSystemSetting,
  deleteSystemSetting,
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { strictRateLimit } from '../middleware/rateLimiting';

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

// User Management Routes
router.get('/users', getAllUsers);
router.post('/users', strictRateLimit, createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', toggleUserStatus);

// System Settings Routes
router.get('/settings', getSystemSettings);
router.post('/settings', createSystemSetting);
router.put('/settings/:id', updateSystemSetting);
router.delete('/settings/:id', deleteSystemSetting);

// Category Management Routes
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id/status', toggleCategoryStatus);
router.delete('/categories/:id', deleteCategory);

export default router;