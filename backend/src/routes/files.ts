import { Router } from 'express';
import { 
  uploadFiles,
  uploadMiddleware,
  getFiles,
  downloadFile,
  deleteFile,
  getFileInfo
} from '../controllers/fileController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for file uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 upload requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// All file routes require authentication
router.use(authenticateToken);

router.get('/', getFiles);
router.post('/upload', uploadRateLimit, uploadMiddleware, uploadFiles);
router.get('/:id', getFileInfo);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

export default router;