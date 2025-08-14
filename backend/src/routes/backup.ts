import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import {
  createBackup,
  downloadBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  getBackupStatus
} from '../controllers/backupController';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `backup-restore-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1 // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Accept JSON and ZIP files
    const allowedMimeTypes = [
      'application/json',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    const allowedExtensions = ['.json', '.zip'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON and ZIP files are allowed for backup restore'));
    }
  }
});

// Middleware to handle multer errors
const handleUploadErrors = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the 100MB limit'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Only one file can be uploaded at a time'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.message.includes('Only JSON and ZIP files')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'Only JSON and ZIP files are allowed'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next(error);
};

// All backup routes require authentication
router.use(authenticateToken);

// Get backup system status
router.get('/status', getBackupStatus);

// Create new backup
router.post('/create', createBackup);

// List all backups
router.get('/list', listBackups);

// Download specific backup file
router.get('/download/:fileName', downloadBackup);

// Restore from backup file
router.post('/restore', upload.single('backupFile'), handleUploadErrors, restoreBackup);

// Delete specific backup file
router.delete('/:fileName', deleteBackup);

export default router;