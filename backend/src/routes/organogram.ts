import { Router } from 'express';
import { 
  getOrganogram,
  getStaffDetails,
  getDepartmentHierarchy,
  getOrganogramFlat,
  createShareableLink,
  getSharedOrganogram
} from '../controllers/organogramController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public shared organogram (no authentication required) - MUST be before auth middleware
router.get('/public/:shareId', getSharedOrganogram);

// All other organogram routes require authentication
router.use(authenticateToken);

router.get('/', getOrganogram);
router.get('/flat', getOrganogramFlat);
router.get('/department/:department', getDepartmentHierarchy);
router.get('/staff/:id', getStaffDetails);

// Share functionality (requires authentication)
router.post('/share', createShareableLink);

export default router;