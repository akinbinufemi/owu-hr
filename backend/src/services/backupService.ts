import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface BackupMetadata {
  version: string;
  timestamp: string;
  databaseUrl: string;
  totalRecords: number;
  backupId: string;
  createdBy: string;
  tables: {
    [tableName: string]: number;
  };
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    admins: any[];
    staff: any[];
    categories: any[];
    salaryStructures: any[];
    loans: any[];
    loanRepayments: any[];
    issues: any[];
    issueComments: any[];
    documents: any[];
    auditTrails: any[];
    payrollSchedules: any[];
    systemSettings: any[];
    shareableLinks: any[];
  };
}

export class BackupService {
  /**
   * Export all data from the database with relationships
   */
  async exportAllData(createdBy: string = 'System'): Promise<BackupData> {
    try {
      console.log('🚀 Starting data export...');

      // Fetch all data from database with relationships
      const [
        admins,
        staff,
        categories,
        salaryStructures,
        loans,
        loanRepayments,
        issues,
        issueComments,
        documents,
        auditTrails,
        payrollSchedules,
        systemSettings,
        shareableLinks
      ] = await Promise.all([
        // Admins with relationships
        prisma.admin.findMany({
          include: {
            createdByAdmin: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }),

        // Staff with all relationships
        prisma.staff.findMany({
          include: {
            reportingManager: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                jobTitle: true
              }
            },
            subordinates: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                jobTitle: true
              }
            },
            position: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            departmentCategory: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            jobType: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }),

        // Categories
        prisma.category.findMany(),

        // Salary structures with staff info
        prisma.salaryStructure.findMany({
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                employeeId: true
              }
            }
          }
        }),

        // Loans with relationships
        prisma.loan.findMany({
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                employeeId: true
              }
            },
            updatedByAdmin: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }),

        // Loan repayments
        prisma.loanRepayment.findMany({
          include: {
            loan: {
              select: {
                id: true,
                staffId: true,
                amount: true
              }
            }
          }
        }),

        // Issues with relationships
        prisma.issue.findMany({
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                employeeId: true
              }
            },
            admin: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            issueCategory: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }),

        // Issue comments
        prisma.issueComment.findMany({
          include: {
            issue: {
              select: {
                id: true,
                ticketNumber: true,
                title: true
              }
            }
          }
        }),

        // Documents
        prisma.document.findMany({
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                employeeId: true
              }
            }
          }
        }),

        // Audit trails
        prisma.auditTrail.findMany({
          include: {
            admin: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }),

        // Payroll schedules
        prisma.payrollSchedule.findMany(),

        // System settings
        prisma.systemSettings.findMany(),

        // Shareable links
        prisma.shareableLink.findMany()
      ]);

      // Calculate record counts
      const tableCounts = {
        admins: admins.length,
        staff: staff.length,
        categories: categories.length,
        salaryStructures: salaryStructures.length,
        loans: loans.length,
        loanRepayments: loanRepayments.length,
        issues: issues.length,
        issueComments: issueComments.length,
        documents: documents.length,
        auditTrails: auditTrails.length,
        payrollSchedules: payrollSchedules.length,
        systemSettings: systemSettings.length,
        shareableLinks: shareableLinks.length
      };

      const totalRecords = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);

      console.log('📊 Data export summary:');
      Object.entries(tableCounts).forEach(([table, count]) => {
        console.log(`   - ${table}: ${count} records`);
      });
      console.log(`   - Total: ${totalRecords} records`);

      // Create backup metadata
      const backupId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const metadata: BackupMetadata = {
        version: '1.0.0',
        timestamp,
        databaseUrl: this.maskDatabaseUrl(process.env.DATABASE_URL || ''),
        totalRecords,
        backupId,
        createdBy,
        tables: tableCounts
      };

      // Create backup data structure
      const backupData: BackupData = {
        metadata,
        data: {
          admins,
          staff,
          categories,
          salaryStructures,
          loans,
          loanRepayments,
          issues,
          issueComments,
          documents,
          auditTrails,
          payrollSchedules,
          systemSettings,
          shareableLinks
        }
      };

      console.log('✅ Data export completed successfully');
      return backupData;

    } catch (error) {
      console.error('❌ Data export failed:', error);
      throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate backup data structure
   */
  validateBackupData(data: any): data is BackupData {
    try {
      // Check if data has required structure
      if (!data || typeof data !== 'object') {
        return false;
      }

      // Check metadata
      if (!data.metadata || typeof data.metadata !== 'object') {
        return false;
      }

      const requiredMetadataFields = ['version', 'timestamp', 'totalRecords', 'backupId'];
      for (const field of requiredMetadataFields) {
        if (!(field in data.metadata)) {
          return false;
        }
      }

      // Check data structure
      if (!data.data || typeof data.data !== 'object') {
        return false;
      }

      const requiredDataFields = [
        'admins', 'staff', 'categories', 'salaryStructures', 'loans',
        'loanRepayments', 'issues', 'issueComments', 'documents',
        'auditTrails', 'payrollSchedules', 'systemSettings', 'shareableLinks'
      ];

      for (const field of requiredDataFields) {
        if (!(field in data.data) || !Array.isArray(data.data[field])) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Backup validation error:', error);
      return false;
    }
  }

  /**
   * Import backup data to database with transaction safety
   */
  async importBackupData(backupData: BackupData): Promise<void> {
    try {
      console.log('🚀 Starting data import...');
      console.log(`📊 Importing ${backupData.metadata.totalRecords} total records`);

      await prisma.$transaction(async (tx) => {
        console.log('🗑️ Clearing existing data...');

        // Clear existing data in reverse dependency order to avoid foreign key constraints
        await tx.issueComment.deleteMany();
        await tx.issue.deleteMany();
        await tx.loanRepayment.deleteMany();
        await tx.loan.deleteMany();
        await tx.document.deleteMany();
        await tx.auditTrail.deleteMany();
        await tx.salaryStructure.deleteMany();
        await tx.payrollSchedule.deleteMany();
        await tx.shareableLink.deleteMany();
        await tx.staff.deleteMany();
        await tx.category.deleteMany();
        await tx.systemSettings.deleteMany();
        await tx.admin.deleteMany();

        console.log('📥 Importing new data...');

        // Import data in dependency order
        if (backupData.data.admins.length > 0) {
          console.log(`   - Importing ${backupData.data.admins.length} admins...`);
          for (const admin of backupData.data.admins) {
            const { createdByAdmin, ...adminData } = admin;
            await tx.admin.create({ data: adminData });
          }
        }

        if (backupData.data.systemSettings.length > 0) {
          console.log(`   - Importing ${backupData.data.systemSettings.length} system settings...`);
          await tx.systemSettings.createMany({
            data: backupData.data.systemSettings
          });
        }

        if (backupData.data.categories.length > 0) {
          console.log(`   - Importing ${backupData.data.categories.length} categories...`);
          await tx.category.createMany({
            data: backupData.data.categories
          });
        }

        if (backupData.data.staff.length > 0) {
          console.log(`   - Importing ${backupData.data.staff.length} staff members...`);
          for (const staffMember of backupData.data.staff) {
            const { reportingManager, subordinates, position, departmentCategory, jobType, ...staffData } = staffMember;
            await tx.staff.create({ data: staffData });
          }
        }

        if (backupData.data.salaryStructures.length > 0) {
          console.log(`   - Importing ${backupData.data.salaryStructures.length} salary structures...`);
          for (const salary of backupData.data.salaryStructures) {
            const { staff, ...salaryData } = salary;
            await tx.salaryStructure.create({ data: salaryData });
          }
        }

        if (backupData.data.loans.length > 0) {
          console.log(`   - Importing ${backupData.data.loans.length} loans...`);
          for (const loan of backupData.data.loans) {
            const { staff, updatedByAdmin, ...loanData } = loan;
            await tx.loan.create({ data: loanData });
          }
        }

        if (backupData.data.loanRepayments.length > 0) {
          console.log(`   - Importing ${backupData.data.loanRepayments.length} loan repayments...`);
          for (const repayment of backupData.data.loanRepayments) {
            const { loan, ...repaymentData } = repayment;
            await tx.loanRepayment.create({ data: repaymentData });
          }
        }

        if (backupData.data.issues.length > 0) {
          console.log(`   - Importing ${backupData.data.issues.length} issues...`);
          for (const issue of backupData.data.issues) {
            const { staff, admin, issueCategory, ...issueData } = issue;
            await tx.issue.create({ data: issueData });
          }
        }

        if (backupData.data.issueComments.length > 0) {
          console.log(`   - Importing ${backupData.data.issueComments.length} issue comments...`);
          for (const comment of backupData.data.issueComments) {
            const { issue, ...commentData } = comment;
            await tx.issueComment.create({ data: commentData });
          }
        }

        if (backupData.data.documents.length > 0) {
          console.log(`   - Importing ${backupData.data.documents.length} documents...`);
          for (const document of backupData.data.documents) {
            const { staff, ...documentData } = document;
            await tx.document.create({ data: documentData });
          }
        }

        if (backupData.data.auditTrails.length > 0) {
          console.log(`   - Importing ${backupData.data.auditTrails.length} audit trails...`);
          for (const audit of backupData.data.auditTrails) {
            const { admin, staff, ...auditData } = audit;
            await tx.auditTrail.create({ data: auditData });
          }
        }

        if (backupData.data.payrollSchedules.length > 0) {
          console.log(`   - Importing ${backupData.data.payrollSchedules.length} payroll schedules...`);
          await tx.payrollSchedule.createMany({
            data: backupData.data.payrollSchedules
          });
        }

        if (backupData.data.shareableLinks.length > 0) {
          console.log(`   - Importing ${backupData.data.shareableLinks.length} shareable links...`);
          await tx.shareableLink.createMany({
            data: backupData.data.shareableLinks
          });
        }

        console.log('✅ Data import completed successfully');
      });

    } catch (error) {
      console.error('❌ Data import failed:', error);
      throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mask sensitive information in database URL
   */
  private maskDatabaseUrl(url: string): string {
    try {
      return url.replace(/\/\/.*@/, '//***:***@');
    } catch {
      return 'hidden';
    }
  }

  /**
   * Get database connection statistics
   */
  async getDatabaseStats(): Promise<{ [tableName: string]: number }> {
    try {
      const [
        adminCount,
        staffCount,
        categoryCount,
        salaryCount,
        loanCount,
        loanRepaymentCount,
        issueCount,
        issueCommentCount,
        documentCount,
        auditCount,
        payrollCount,
        settingsCount,
        shareableLinkCount
      ] = await Promise.all([
        prisma.admin.count(),
        prisma.staff.count(),
        prisma.category.count(),
        prisma.salaryStructure.count(),
        prisma.loan.count(),
        prisma.loanRepayment.count(),
        prisma.issue.count(),
        prisma.issueComment.count(),
        prisma.document.count(),
        prisma.auditTrail.count(),
        prisma.payrollSchedule.count(),
        prisma.systemSettings.count(),
        prisma.shareableLink.count()
      ]);

      return {
        admins: adminCount,
        staff: staffCount,
        categories: categoryCount,
        salaryStructures: salaryCount,
        loans: loanCount,
        loanRepayments: loanRepaymentCount,
        issues: issueCount,
        issueComments: issueCommentCount,
        documents: documentCount,
        auditTrails: auditCount,
        payrollSchedules: payrollCount,
        systemSettings: settingsCount,
        shareableLinks: shareableLinkCount
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }
}

export const backupService = new BackupService();