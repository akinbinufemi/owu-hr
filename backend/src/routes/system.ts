import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { strictRateLimit } from '../middleware/rateLimiting';

const router = Router();
const prisma = new PrismaClient();

// Security middleware for system endpoints
const systemAuth = async (req: AuthRequest, res: any, next: any) => {
  // Check for emergency access token
  const emergencyToken = req.headers['x-emergency-token'] as string;
  const validEmergencyToken = process.env.EMERGENCY_ACCESS_TOKEN;
  
  if (emergencyToken && validEmergencyToken && emergencyToken === validEmergencyToken) {
    // Allow emergency access
    return next();
  }

  // Otherwise require SUPER_ADMIN authentication
  authenticateToken(req, res, (err: any) => {
    if (err) return next(err);
    
    if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only SUPER_ADMIN users can access system endpoints'
      });
    }
    
    next();
  });
};

// Emergency database reseed endpoint - SECURED
router.post('/emergency-reseed', strictRateLimit, systemAuth, async (req: AuthRequest, res) => {
  try {
    console.log('🚨 Emergency database reseed requested by:', req.admin?.email || 'Emergency Token');

    // Additional security check
    const isDev = process.env.NODE_ENV !== 'production';
    const allowReseed = process.env.ALLOW_EMERGENCY_RESEED === 'true';
    const hasEmergencyToken = req.headers['x-emergency-token'] === process.env.EMERGENCY_ACCESS_TOKEN;

    if (!isDev && !allowReseed && !hasEmergencyToken) {
      return res.status(403).json({
        success: false,
        error: 'Emergency reseed not allowed in production without proper authorization'
      });
    }

    // Create admin user with password expiry fields
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const now = new Date();
    const passwordExpiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days

    const admin = await prisma.admin.upsert({
      where: { email: 'admin@owupalace.com' },
      update: {
        password: hashedPassword,
        fullName: 'System Administrator',
        role: 'SUPER_ADMIN',
        permissions: ['manage_staff', 'manage_payroll', 'manage_loans', 'manage_issues', 'view_reports', 'manage_files', 'manage_users', 'system_settings'],
        isActive: true,
        passwordChangedAt: now,
        passwordExpiresAt: passwordExpiresAt,
        mustChangePassword: false,
      },
      create: {
        email: 'admin@owupalace.com',
        password: hashedPassword,
        fullName: 'System Administrator',
        role: 'SUPER_ADMIN',
        permissions: ['manage_staff', 'manage_payroll', 'manage_loans', 'manage_issues', 'view_reports', 'manage_files', 'manage_users', 'system_settings'],
        isActive: true,
        passwordChangedAt: now,
        passwordExpiresAt: passwordExpiresAt,
        mustChangePassword: false,
      },
    });

    // Create sample categories
    const departments = [
      { name: 'Administration', type: 'DEPARTMENT' },
      { name: 'Finance', type: 'DEPARTMENT' },
      { name: 'Human Resources', type: 'DEPARTMENT' },
      { name: 'IT', type: 'DEPARTMENT' },
      { name: 'Operations', type: 'DEPARTMENT' }
    ];

    const positions = [
      { name: 'Manager', type: 'POSITION' },
      { name: 'Senior Officer', type: 'POSITION' },
      { name: 'Officer', type: 'POSITION' },
      { name: 'Assistant', type: 'POSITION' },
      { name: 'Intern', type: 'POSITION' }
    ];

    const jobTypes = [
      { name: 'Full-time', type: 'JOB_TYPE' },
      { name: 'Part-time', type: 'JOB_TYPE' },
      { name: 'Contract', type: 'JOB_TYPE' },
      { name: 'Temporary', type: 'JOB_TYPE' }
    ];

    // Create categories
    for (const dept of departments) {
      await prisma.category.upsert({
        where: { name_type: { name: dept.name, type: dept.type as any } },
        update: {},
        create: dept as any
      });
    }

    for (const pos of positions) {
      await prisma.category.upsert({
        where: { name_type: { name: pos.name, type: pos.type as any } },
        update: {},
        create: pos as any
      });
    }

    for (const job of jobTypes) {
      await prisma.category.upsert({
        where: { name_type: { name: job.name, type: job.type as any } },
        update: {},
        create: job as any
      });
    }

    // Create sample staff member
    const sampleStaff = await prisma.staff.upsert({
      where: { employeeId: 'OWU001' },
      update: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'MALE',
        maritalStatus: 'MARRIED',
        nationality: 'Nigerian',
        address: '123 Palace Road, Owu Kingdom',
        personalEmail: 'john.doe@email.com',
        workEmail: 'john.doe@owupalace.com',
        phoneNumbers: ['+234-801-234-5678'],
        jobTitle: 'Senior Administrator',
        department: 'Administration',
        dateOfJoining: new Date('2020-01-15'),
        employmentType: 'FULL_TIME',
        workLocation: 'Main Palace',
        emergencyContactName: 'Jane Doe',
        emergencyContactRelationship: 'Spouse',
        emergencyContactPhone: '+234-801-234-5679',
        isActive: true,
      },
      create: {
        employeeId: 'OWU001',
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'MALE',
        maritalStatus: 'MARRIED',
        nationality: 'Nigerian',
        address: '123 Palace Road, Owu Kingdom',
        personalEmail: 'john.doe@email.com',
        workEmail: 'john.doe@owupalace.com',
        phoneNumbers: ['+234-801-234-5678'],
        jobTitle: 'Senior Administrator',
        department: 'Administration',
        dateOfJoining: new Date('2020-01-15'),
        employmentType: 'FULL_TIME',
        workLocation: 'Main Palace',
        emergencyContactName: 'Jane Doe',
        emergencyContactRelationship: 'Spouse',
        emergencyContactPhone: '+234-801-234-5679',
        isActive: true,
      },
    });

    console.log('✅ Emergency reseed completed');

    res.json({
      success: true,
      message: 'Database reseeded successfully',
      data: {
        admin: {
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role
        },
        sampleStaff: {
          employeeId: sampleStaff.employeeId,
          fullName: sampleStaff.fullName
        },
        credentials: {
          email: 'admin@owupalace.com',
          password: 'admin123'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Emergency reseed failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database reseed failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Database status check endpoint - SECURED
router.get('/db-status', strictRateLimit, systemAuth, async (req: AuthRequest, res) => {
  try {
    const adminCount = await prisma.admin.count();
    const staffCount = await prisma.staff.count();
    
    // Check if password expiry fields exist
    let hasPasswordExpiry = false;
    try {
      await prisma.admin.findFirst({
        select: { passwordExpiresAt: true }
      });
      hasPasswordExpiry = true;
    } catch (error) {
      hasPasswordExpiry = false;
    }

    res.json({
      success: true,
      data: {
        database: 'connected',
        adminCount,
        staffCount,
        hasPasswordExpiry,
        migrationStatus: hasPasswordExpiry ? 'up-to-date' : 'needs-migration'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;