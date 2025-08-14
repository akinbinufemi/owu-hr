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

// All organogram routes require authentication
router.use(authenticateToken);

router.get('/', getOrganogram);
router.get('/flat', getOrganogramFlat);
router.get('/department/:department', getDepartmentHierarchy);
router.get('/staff/:id', getStaffDetails);

// Share functionality (requires authentication)
router.post('/share', createShareableLink);

// Public shared organogram (no authentication required)
router.get('/public/:shareId', (req, res, next) => {
  // Remove authentication requirement for public shares
  getSharedOrganogram(req, res);
});

export default router;