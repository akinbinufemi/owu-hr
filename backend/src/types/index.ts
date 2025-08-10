// Database model types
export interface Staff {
  id: string;
  employeeId: string;
  
  // Personal Information
  fullName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  nationality: string;
  photo?: string;
  
  // Contact Information
  address: string;
  personalEmail: string;
  workEmail: string;
  phoneNumbers: string[];
  
  // Job Information
  jobTitle: string;
  department: string;
  reportingManagerId?: string;
  dateOfJoining: Date;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  workLocation: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  
  // System fields
  isExternallyPaid: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryStructure {
  id: string;
  staffId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowances: { name: string; amount: number }[];
  taxDeduction: number;
  pensionDeduction: number;
  loanDeduction: number;
  otherDeductions: { name: string; amount: number }[];
  effectiveDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Loan {
  id: string;
  staffId: string;
  amount: number;
  reason: string;
  repaymentTerms: number;
  monthlyDeduction: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedDate?: Date;
  startDate?: Date; // Start month of deduction
  outstandingBalance: number;
  installmentsPaid: number;
  statusComments?: string; // Comments when status is changed
  updatedBy?: string; // Admin who last updated the loan
  isPaused?: boolean; // Pause loan repayment
  pausedAt?: Date; // When loan was paused
  pauseReason?: string; // Reason for pausing
  createdAt: Date;
  updatedAt: Date;
}

export interface Issue {
  id: string;
  ticketNumber: string;
  staffId?: string;
  category: 'WORKPLACE_CONFLICT' | 'PAYROLL_DISCREPANCY' | 'POLICY_VIOLATION' | 'PERFORMANCE_ISSUE' | 'ATTENDANCE_ISSUE' | 'OTHER';
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueComment {
  id: string;
  issueId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface Document {
  id: string;
  staffId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  category: 'CV' | 'OFFER_LETTER' | 'CONTRACT' | 'IDENTIFICATION' | 'CERTIFICATE' | 'OTHER';
  uploadedAt: Date;
}

export interface AuditTrail {
  id: string;
  entityType: 'STAFF' | 'SALARY' | 'LOAN' | 'ISSUE';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes: Record<string, { old: any; new: any }>;
  performedBy: string;
  timestamp: Date;
}

export interface Admin {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'HR_MANAGER' | 'VIEWER';
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  updatedBy: string;
  updatedAt: Date;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Request types
export interface CreateStaffRequest {
  employeeId: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  nationality: string;
  address: string;
  personalEmail: string;
  workEmail: string;
  phoneNumbers: string[];
  jobTitle: string;
  department: string;
  reportingManagerId?: string;
  dateOfJoining: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  workLocation: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  isExternallyPaid?: boolean;
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {
  id: string;
}

export interface CreateSalaryStructureRequest {
  staffId: string;
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  medicalAllowance?: number;
  otherAllowances?: { name: string; amount: number }[];
  taxDeduction?: number;
  pensionDeduction?: number;
  loanDeduction?: number;
  otherDeductions?: { name: string; amount: number }[];
  effectiveDate?: string;
}

export interface CreateLoanRequest {
  staffId: string;
  amount: number;
  reason: string;
  repaymentTerms: number;
  startDate?: string; // Start month of deduction
}

export interface UpdateLoanStatusRequest {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  statusComments: string;
  startDate?: string;
}

export interface CreateIssueRequest {
  staffId?: string;
  category: 'WORKPLACE_CONFLICT' | 'PAYROLL_DISCREPANCY' | 'POLICY_VIOLATION' | 'PERFORMANCE_ISSUE' | 'ATTENDANCE_ISSUE' | 'OTHER';
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Dashboard types
export interface DashboardMetrics {
  totalStaff: number;
  activeStaff: number;
  recentHires: number;
  openIssues: number;
  pendingLoans: number;
  totalPayroll: number;
}

export interface DashboardNotification {
  id: string;
  type: 'birthday' | 'anniversary' | 'loan_due' | 'issue_overdue';
  title: string;
  message: string;
  date: Date;
  staffId?: string;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface StaffFilters extends PaginationParams {
  department?: string;
  employmentType?: string;
  isActive?: boolean;
  isExternallyPaid?: boolean;
}

export interface LoanFilters extends PaginationParams {
  status?: string;
  staffId?: string;
}

export interface IssueFilters extends PaginationParams {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
}