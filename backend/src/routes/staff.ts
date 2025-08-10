import { Router } from 'express';
import { 
  getAllStaff, 
  getStaffById, 
  createStaff, 
  updateStaff, 
  deleteStaff, 
  getStaffAuditTrail,
  getStaffOptions
} from '../controllers/staffController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All staff routes require authentication
router.use(authenticateToken);

router.get('/', getAllStaff);
router.get('/options', getStaffOptions);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.get('/:id/audit', getStaffAuditTrail);

export default router;