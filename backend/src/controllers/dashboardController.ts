import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
  try {
    // Get current date for calculations
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total staff count
    const totalStaff = await prisma.staff.count({
      where: { isActive: true }
    });

    // Get active staff count
    const activeStaff = await prisma.staff.count({
      where: { isActive: true }
    });

    // Get recent hires (last 30 days)
    const recentHires = await prisma.staff.count({
      where: {
        isActive: true,
        dateOfJoining: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Get open issues count
    const openIssues = await prisma.issue.count({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      }
    });

    // Get pending loans count
    const pendingLoans = await prisma.loan.count({
      where: {
        status: 'PENDING'
      }
    });

    // Calculate total payroll (sum of basic salaries for active staff)
    const payrollData = await prisma.salaryStructure.aggregate({
      where: {
        isActive: true,
        staff: {
          isActive: true,
          isExternallyPaid: false
        }
      },
      _sum: {
        basicSalary: true,
        housingAllowance: true,
        transportAllowance: true,
        medicalAllowance: true
      }
    });

    const totalPayroll = (
      Number(payrollData._sum.basicSalary || 0) +
      Number(payrollData._sum.housingAllowance || 0) +
      Number(payrollData._sum.transportAllowance || 0) +
      Number(payrollData._sum.medicalAllowance || 0)
    );

    res.json({
      success: true,
      data: {
        totalStaff,
        activeStaff,
        recentHires,
        openIssues,
        pendingLoans,
        totalPayroll
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard metrics'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getDashboardNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const notifications = [];

    // Get upcoming birthdays (next 7 days)
    const upcomingBirthdays = await prisma.staff.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true
      }
    });

    // Filter birthdays in the next 7 days
    const birthdayNotifications = upcomingBirthdays.filter(staff => {
      const birthday = new Date(staff.dateOfBirth);
      const thisYear = now.getFullYear();
      const birthdayThisYear = new Date(thisYear, birthday.getMonth(), birthday.getDate());
      
      // If birthday already passed this year, check next year
      if (birthdayThisYear < now) {
        birthdayThisYear.setFullYear(thisYear + 1);
      }
      
      const daysUntilBirthday = Math.ceil((birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilBirthday <= 7 && daysUntilBirthday >= 0;
    }).map(staff => ({
      id: `birthday-${staff.id}`,
      type: 'birthday' as const,
      title: 'Upcoming Birthday',
      message: `${staff.fullName}'s birthday is coming up`,
      date: staff.dateOfBirth,
      staffId: staff.id
    }));

    notifications.push(...birthdayNotifications);

    // Get work anniversaries (next 7 days)
    const upcomingAnniversaries = await prisma.staff.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        dateOfJoining: true
      }
    });

    const anniversaryNotifications = upcomingAnniversaries.filter(staff => {
      const joinDate = new Date(staff.dateOfJoining);
      const thisYear = now.getFullYear();
      const anniversaryThisYear = new Date(thisYear, joinDate.getMonth(), joinDate.getDate());
      
      // If anniversary already passed this year, check next year
      if (anniversaryThisYear < now) {
        anniversaryThisYear.setFullYear(thisYear + 1);
      }
      
      const daysUntilAnniversary = Math.ceil((anniversaryThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilAnniversary <= 7 && daysUntilAnniversary >= 0;
    }).map(staff => ({
      id: `anniversary-${staff.id}`,
      type: 'anniversary' as const,
      title: 'Work Anniversary',
      message: `${staff.fullName}'s work anniversary is coming up`,
      date: staff.dateOfJoining,
      staffId: staff.id
    }));

    notifications.push(...anniversaryNotifications);

    // Get overdue issues (open for more than 30 days)
    const overdueDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const overdueIssues = await prisma.issue.findMany({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        },
        createdAt: {
          lt: overdueDate
        }
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        createdAt: true
      },
      take: 5
    });

    const overdueNotifications = overdueIssues.map(issue => ({
      id: `overdue-${issue.id}`,
      type: 'issue_overdue' as const,
      title: 'Overdue Issue',
      message: `Issue ${issue.ticketNumber}: ${issue.title} is overdue`,
      date: issue.createdAt
    }));

    notifications.push(...overdueNotifications);

    res.json({
      success: true,
      data: notifications.slice(0, 10), // Limit to 10 notifications
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard notifications'
      },
      timestamp: new Date().toISOString()
    });
  }
};

export const getDepartmentChart = async (req: AuthRequest, res: Response) => {
  try {
    const departmentData = await prisma.staff.groupBy({
      by: ['department'],
      where: {
        isActive: true
      },
      _count: {
        id: true
      }
    });

    const chartData = {
      labels: departmentData.map(dept => dept.department),
      datasets: [{
        label: 'Staff Count',
        data: departmentData.map(dept => dept._count.id),
        backgroundColor: [
          '#0ea5e9', // Primary blue
          '#10b981', // Green
          '#f59e0b', // Yellow
          '#ef4444', // Red
          '#8b5cf6', // Purple
          '#06b6d4', // Cyan
          '#84cc16', // Lime
          '#f97316'  // Orange
        ]
      }]
    };

    res.json({
      success: true,
      data: chartData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Department chart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch department chart data'
      },
      timestamp: new Date().toISOString()
    });
  }
};