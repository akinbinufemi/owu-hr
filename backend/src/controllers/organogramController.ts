import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

interface OrganogramNode {
  id: string;
  employeeId: string;
  fullName: string;
  jobTitle: string | null;
  department: string | null;
  photo?: string;
  workEmail: string | null;
  reportingManagerId?: string;
  children: OrganogramNode[];
  level: number;
}

export const getOrganogram = async (req: AuthRequest, res: Response) => {
  try {
    // Get all staff with their reporting relationships
    const allStaff = await prisma.staff.findMany({
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        jobTitle: true,
        department: true,
        photo: true,
        workEmail: true,
        reportingManagerId: true,
        isActive: true
      },
      where: {
        isActive: true
      },
      orderBy: [
        { department: 'asc' },
        { jobTitle: 'asc' },
        { fullName: 'asc' }
      ]
    });

    // Build the organizational hierarchy
    const staffMap = new Map<string, OrganogramNode>();
    const rootNodes: OrganogramNode[] = [];

    // First pass: Create all nodes
    allStaff.forEach(staff => {
      const node: OrganogramNode = {
        id: staff.id,
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        jobTitle: staff.jobTitle,
        department: staff.department,
        photo: staff.photo || undefined,
        workEmail: staff.workEmail,
        reportingManagerId: staff.reportingManagerId || undefined,
        children: [],
        level: 0
      };
      staffMap.set(staff.id, node);
    });

    // Second pass: Build the hierarchy
    staffMap.forEach(node => {
      if (node.reportingManagerId && staffMap.has(node.reportingManagerId)) {
        const manager = staffMap.get(node.reportingManagerId)!;
        manager.children.push(node);
      } else {
        // This is a root node (no manager or manager not found)
        rootNodes.push(node);
      }
    });

    // Third pass: Calculate levels
    const calculateLevels = (nodes: OrganogramNode[], level: number = 0) => {
      nodes.forEach(node => {
        node.level = level;
        if (node.children.length > 0) {
          calculateLevels(node.children, level + 1);
        }
      });
    };

    calculateLevels(rootNodes);

    // Sort children by department and job title
    const sortChildren = (nodes: OrganogramNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          node.children.sort((a, b) => {
            const aDept = a.department || 'Unassigned';
            const bDept = b.department || 'Unassigned';
            if (aDept !== bDept) {
              return aDept.localeCompare(bDept);
            }
            const aTitle = a.jobTitle || 'No Title';
            const bTitle = b.jobTitle || 'No Title';
            return aTitle.localeCompare(bTitle);
          });
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootNodes);

    // Calculate statistics
    const totalEmployees = allStaff.length;
    const departmentCounts = allStaff.reduce((acc, staff) => {
      const dept = staff.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxLevel = Math.max(...Array.from(staffMap.values()).map(node => node.level));

    res.json({
      success: true,
      data: {
        organogram: rootNodes,
        statistics: {
          totalEmployees,
          departmentCounts,
          maxLevel: maxLevel + 1,
          rootNodes: rootNodes.length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get organogram error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch organizational chart'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getStaffDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        reportingManager: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            jobTitle: true,
            department: true
          }
        },
        subordinates: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            jobTitle: true,
            department: true
          },
          where: {
            isActive: true
          }
        }
      }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STAFF_NOT_FOUND',
          message: 'Staff member not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: staff,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get staff details error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch staff details'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getDepartmentHierarchy = async (req: AuthRequest, res: Response) => {
  try {
    const { department } = req.params;

    // Get all staff in the specified department
    const departmentStaff = await prisma.staff.findMany({
      where: {
        department: {
          equals: department,
          mode: 'insensitive'
        },
        isActive: true
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        jobTitle: true,
        department: true,
        photo: true,
        workEmail: true,
        reportingManagerId: true
      },
      orderBy: [
        { jobTitle: 'asc' },
        { fullName: 'asc' }
      ]
    });

    if (departmentStaff.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'No staff found in the specified department'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Build hierarchy for this department
    const staffMap = new Map<string, OrganogramNode>();
    const rootNodes: OrganogramNode[] = [];

    // Create nodes
    departmentStaff.forEach(staff => {
      const node: OrganogramNode = {
        id: staff.id,
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        jobTitle: staff.jobTitle,
        department: staff.department,
        photo: staff.photo || undefined,
        workEmail: staff.workEmail,
        reportingManagerId: staff.reportingManagerId || undefined,
        children: [],
        level: 0
      };
      staffMap.set(staff.id, node);
    });

    // Build hierarchy
    staffMap.forEach(node => {
      if (node.reportingManagerId && staffMap.has(node.reportingManagerId)) {
        const manager = staffMap.get(node.reportingManagerId)!;
        manager.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Calculate levels
    const calculateLevels = (nodes: OrganogramNode[], level: number = 0) => {
      nodes.forEach(node => {
        node.level = level;
        if (node.children.length > 0) {
          calculateLevels(node.children, level + 1);
        }
      });
    };

    calculateLevels(rootNodes);

    res.json({
      success: true,
      data: {
        department,
        hierarchy: rootNodes,
        totalStaff: departmentStaff.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get department hierarchy error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch department hierarchy'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const createShareableLink = async (req: AuthRequest, res: Response) => {
  try {
    // Generate a unique share ID
    const shareId = require('crypto').randomBytes(16).toString('hex');
    
    // Set expiry to 72 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    // Get current organogram data
    const allStaff = await prisma.staff.findMany({
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        jobTitle: true,
        department: true,
        photo: true,
        workEmail: true,
        reportingManagerId: true,
        isActive: true
      },
      where: {
        isActive: true
      },
      orderBy: [
        { department: 'asc' },
        { jobTitle: 'asc' },
        { fullName: 'asc' }
      ]
    });

    // Store the shareable link in database (you might need to create this table)
    // For now, we'll use a simple in-memory store or file system
    // In production, you should create a proper database table
    
    const shareData = {
      shareId,
      organogramData: allStaff,
      createdAt: new Date(),
      expiresAt,
      createdBy: req.admin?.id
    };

    // Store in a simple JSON file for now (in production, use database)
    const fs = require('fs');
    const path = require('path');
    
    const shareDir = path.join(process.cwd(), 'temp', 'shares');
    if (!fs.existsSync(shareDir)) {
      fs.mkdirSync(shareDir, { recursive: true });
    }
    
    const shareFilePath = path.join(shareDir, `${shareId}.json`);
    fs.writeFileSync(shareFilePath, JSON.stringify(shareData, null, 2));

    res.json({
      success: true,
      data: {
        shareId,
        expiresAt,
        validFor: '72 hours'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create shareable link error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create shareable link'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getSharedOrganogram = async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;

    // Read the shared data
    const fs = require('fs');
    const path = require('path');
    
    const shareFilePath = path.join(process.cwd(), 'temp', 'shares', `${shareId}.json`);
    
    if (!fs.existsSync(shareFilePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHARE_NOT_FOUND',
          message: 'Shared link not found or has expired'
        },
        timestamp: new Date().toISOString()
      });
    }

    const shareData = JSON.parse(fs.readFileSync(shareFilePath, 'utf8'));
    
    // Check if link has expired
    if (new Date() > new Date(shareData.expiresAt)) {
      // Delete expired file
      fs.unlinkSync(shareFilePath);
      return res.status(410).json({
        success: false,
        error: {
          code: 'SHARE_EXPIRED',
          message: 'This shared link has expired'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Build the organizational hierarchy from stored data
    const allStaff = shareData.organogramData;
    const staffMap = new Map<string, OrganogramNode>();
    const rootNodes: OrganogramNode[] = [];

    // First pass: Create all nodes
    allStaff.forEach((staff: any) => {
      const node: OrganogramNode = {
        id: staff.id,
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        jobTitle: staff.jobTitle,
        department: staff.department,
        photo: staff.photo || undefined,
        workEmail: staff.workEmail,
        reportingManagerId: staff.reportingManagerId || undefined,
        children: [],
        level: 0
      };
      staffMap.set(staff.id, node);
    });

    // Second pass: Build the hierarchy
    staffMap.forEach(node => {
      if (node.reportingManagerId && staffMap.has(node.reportingManagerId)) {
        const manager = staffMap.get(node.reportingManagerId)!;
        manager.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Third pass: Calculate levels
    const calculateLevels = (nodes: OrganogramNode[], level: number = 0) => {
      nodes.forEach(node => {
        node.level = level;
        if (node.children.length > 0) {
          calculateLevels(node.children, level + 1);
        }
      });
    };

    calculateLevels(rootNodes);

    // Calculate statistics
    const totalEmployees = allStaff.length;
    const departmentCounts = allStaff.reduce((acc: any, staff: any) => {
      const dept = staff.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxLevel = Math.max(...Array.from(staffMap.values()).map(node => node.level));

    res.json({
      success: true,
      data: {
        organogram: rootNodes,
        statistics: {
          totalEmployees,
          departmentCounts,
          maxLevel: maxLevel + 1,
          rootNodes: rootNodes.length
        },
        shareInfo: {
          createdAt: shareData.createdAt,
          expiresAt: shareData.expiresAt
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get shared organogram error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch shared organizational chart'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getOrganogramFlat = async (req: AuthRequest, res: Response) => {
  try {
    // Get all staff with their manager information for flat representation
    const allStaff = await prisma.staff.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        jobTitle: true,
        department: true,
        photo: true,
        workEmail: true,
        reportingManagerId: true,
        reportingManager: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            jobTitle: true,
            department: true
          }
        }
      },
      orderBy: [
        { department: 'asc' },
        { jobTitle: 'asc' },
        { fullName: 'asc' }
      ]
    });

    // Calculate hierarchy levels
    const staffMap = new Map<string, any>();
    allStaff.forEach(staff => {
      staffMap.set(staff.id, { ...staff, level: 0, path: [] });
    });

    // Calculate levels and paths
    const calculateLevel = (staffId: string, visited = new Set<string>()): number => {
      if (visited.has(staffId)) {
        return 0; // Circular reference protection
      }
      
      const staff = staffMap.get(staffId);
      if (!staff || !staff.reportingManagerId) {
        return 0;
      }
      
      visited.add(staffId);
      const level = 1 + calculateLevel(staff.reportingManagerId, visited);
      visited.delete(staffId);
      
      return level;
    };

    // Update levels
    staffMap.forEach((staff, id) => {
      staff.level = calculateLevel(id);
    });

    const flatOrganogram = Array.from(staffMap.values()).map(staff => ({
      id: staff.id,
      employeeId: staff.employeeId,
      fullName: staff.fullName,
      jobTitle: staff.jobTitle,
      department: staff.department,
      photo: staff.photo,
      workEmail: staff.workEmail,
      level: staff.level,
      reportingManager: staff.reportingManager
    }));

    res.json({
      success: true,
      data: {
        organogram: flatOrganogram,
        totalEmployees: allStaff.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get flat organogram error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch flat organizational chart'
      },
      timestamp: new Date().toISOString()
    });
  }
};