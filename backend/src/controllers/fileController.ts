import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

// File upload configuration
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Create subdirectories for different file types
const createSubDirectories = () => {
  const subDirs = ['documents', 'photos', 'temp'];
  subDirs.forEach(dir => {
    const dirPath = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

createSubDirectories();

// File validation function
const validateFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds 10MB limit' };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { isValid: false, error: 'File type not allowed' };
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'File extension not allowed' };
  }

  // Basic virus scanning (check for suspicious patterns)
  const suspiciousPatterns = [
    /\x00/g, // Null bytes
    /<script/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /vbscript:/gi, // VBScript protocol
    /data:/gi // Data URLs
  ];

  const fileBuffer = fs.readFileSync(file.path);
  const fileContent = fileBuffer.toString('utf8', 0, Math.min(1024, fileBuffer.length));
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileContent)) {
      return { isValid: false, error: 'File contains suspicious content' };
    }
  }

  return { isValid: true };
};

// Encrypt file content
const encryptFile = (filePath: string, encryptionKey: string): string => {
  const fileContent = fs.readFileSync(filePath);
  const encrypted = CryptoJS.AES.encrypt(fileContent.toString('base64'), encryptionKey).toString();
  
  const encryptedFilePath = filePath + '.enc';
  fs.writeFileSync(encryptedFilePath, encrypted);
  
  // Remove original file
  fs.unlinkSync(filePath);
  
  return encryptedFilePath;
};

// Decrypt file content
const decryptFile = (encryptedFilePath: string, encryptionKey: string): Buffer => {
  const encryptedContent = fs.readFileSync(encryptedFilePath, 'utf8');
  const decrypted = CryptoJS.AES.decrypt(encryptedContent, encryptionKey);
  const decryptedBase64 = decrypted.toString(CryptoJS.enc.Utf8);
  
  return Buffer.from(decryptedBase64, 'base64');
};

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'documents';
    const destPath = path.join(UPLOAD_DIR, category);
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

export const uploadMiddleware = upload.array('files', 5);

export const uploadFiles = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files provided'
        },
        timestamp: new Date().toISOString()
      });
    }

    const { category = 'documents', staffId, encrypt = false } = req.body;
    const encryptionKey = process.env.FILE_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
          errors.push({
            filename: file.originalname,
            error: validation.error
          });
          // Remove invalid file
          fs.unlinkSync(file.path);
          continue;
        }

        let finalFilePath = file.path;
        let isEncrypted = false;

        // Encrypt file if requested and it's a sensitive document
        if (encrypt === 'true' || encrypt === true) {
          finalFilePath = encryptFile(file.path, encryptionKey);
          isEncrypted = true;
        }

        // Save file metadata to database
        const fileRecord = await prisma.document.create({
          data: {
            fileName: file.filename,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            filePath: finalFilePath,
            category: category.toUpperCase(),
            staffId: staffId || req.admin!.id // Use admin ID if no staff specified
          }
        });

        uploadedFiles.push({
          id: fileRecord.id,
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          category,
          isEncrypted
        });

      } catch (fileError) {
        console.error('File processing error:', fileError);
        errors.push({
          filename: file.originalname,
          error: 'Failed to process file'
        });
        
        // Clean up file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.json({
      success: true,
      data: {
        uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload files'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category = '', 
      staffId = '',
      search = ''
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};
    
    if (category) {
      where.category = category;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    if (search) {
      where.OR = [
        { fileName: { contains: search as string, mode: 'insensitive' } },
        { originalName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Get files with pagination
    const [files, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take,
        orderBy: {
          uploadedAt: 'desc'
        },
        include: {
          staff: {
            select: {
              fullName: true,
              employeeId: true
            }
          }
        }
      }),
      prisma.document.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        files: files.map(file => ({
          id: file.id,
          fileName: file.originalName,
          fileSize: Number(file.fileSize),
          mimeType: file.fileType,
          category: file.category,
          isEncrypted: false, // Since the schema doesn't have this field
          createdAt: file.uploadedAt,
          staff: file.staff
        })),
        pagination: {
          page: Number(page),
          limit: take,
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch files'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get file metadata from database
    const fileRecord = await prisma.document.findUnique({
      where: { id }
    });

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const filePath = fileRecord.filePath;

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND_ON_DISK',
          message: 'File not found on disk'
        },
        timestamp: new Date().toISOString()
      });
    }

    let fileBuffer: Buffer;

    // For now, just read the file directly (encryption can be added later)
    fileBuffer = fs.readFileSync(filePath);

    // Set appropriate headers
    res.setHeader('Content-Type', fileRecord.fileType);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);

    // Send file
    res.send(fileBuffer);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to download file'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get file metadata from database
    const fileRecord = await prisma.document.findUnique({
      where: { id }
    });

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Delete file from disk
    if (fs.existsSync(fileRecord.filePath)) {
      fs.unlinkSync(fileRecord.filePath);
    }

    // Delete file record from database
    await prisma.document.delete({
      where: { id }
    });

    res.json({
      success: true,
      data: {
        message: 'File deleted successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete file'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getFileInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const fileRecord = await prisma.document.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            fullName: true,
            employeeId: true
          }
        }
      }
    });

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        id: fileRecord.id,
        fileName: fileRecord.originalName,
        fileSize: Number(fileRecord.fileSize),
        mimeType: fileRecord.fileType,
        category: fileRecord.category,
        isEncrypted: false, // Since the schema doesn't have this field
        createdAt: fileRecord.uploadedAt,
        staff: fileRecord.staff
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch file info'
      },
      timestamp: new Date().toISOString()
    });
  }
};