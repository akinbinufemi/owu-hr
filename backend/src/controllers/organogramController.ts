import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

interface OrganogramNode {
  id: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  department: string;
  photo?: string;
  workEmail: string;
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
            if (a.department !== b.department) {
              return a.department.localeCompare(b.department);
            }
            return a.jobTitle.localeCompare(b.jobTitle);
          });
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootNodes);

    // Calculate statistics
    const totalEmployees = allStaff.length;
    const departmentCounts = allStaff.reduce((acc, staff) => {
      acc[staff.department] = (acc[staff.department] || 0) + 1;
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