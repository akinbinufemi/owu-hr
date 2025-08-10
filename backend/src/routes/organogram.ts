import { Router } from 'express';
import { 
  getOrganogram,
  getStaffDetails,
  getDepartmentHierarchy,
  getOrganogramFlat
} from '../controllers/organogramController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All organogram routes require authentication
router.use(authenticateToken);

router.get('/', getOrganogram);
router.get('/flat', getOrganogramFlat);
router.get('/department/:department', getDepartmentHierarchy);
router.get('/staff/:id', getStaffDetails);

export default router;