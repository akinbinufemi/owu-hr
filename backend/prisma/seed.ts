import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Set password expiry (90 days from now)
  const now = new Date();
  const passwordExpiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

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

  console.log('✅ Admin user created:', admin.email);

  // Create sample staff members
  const staffMembers = [
    {
      employeeId: 'OWU001',
      fullName: 'John Doe',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      nationality: 'Nigerian',
      address: '123 Palace Road, Owu Kingdom',
      personalEmail: 'john.doe@email.com',
      workEmail: 'john.doe@owupalace.com',
      phoneNumbers: ['+234-801-234-5678'],
      jobTitle: 'Senior Administrator',
      department: 'Administration',
      dateOfJoining: new Date('2020-01-15'),
      employmentType: 'FULL_TIME' as const,
      workLocation: 'Main Palace',
      emergencyContactName: 'Jane Doe',
      emergencyContactRelationship: 'Spouse',
      emergencyContactPhone: '+234-802-345-6789',
      accountDetails: 'GTBank 0140530101',
      isExternallyPaid: false,
    },
    {
      employeeId: 'OWU002',
      fullName: 'Sarah Johnson',
      dateOfBirth: new Date('1988-08-22'),
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      nationality: 'Nigerian',
      address: '456 Royal Avenue, Owu Kingdom',
      personalEmail: 'sarah.johnson@email.com',
      workEmail: 'sarah.johnson@owupalace.com',
      phoneNumbers: ['+234-803-456-7890'],
      jobTitle: 'Finance Manager',
      department: 'Finance',
      dateOfJoining: new Date('2019-03-10'),
      employmentType: 'FULL_TIME' as const,
      workLocation: 'Finance Wing',
      emergencyContactName: 'Mary Johnson',
      emergencyContactRelationship: 'Mother',
      emergencyContactPhone: '+234-804-567-8901',
      accountDetails: 'FCMB 3681820012',
      isExternallyPaid: false,
    },
    {
      employeeId: 'OWU003',
      fullName: 'Michael Brown',
      dateOfBirth: new Date('1985-12-03'),
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      nationality: 'Nigerian',
      address: '789 Crown Street, Owu Kingdom',
      personalEmail: 'michael.brown@email.com',
      workEmail: 'michael.brown@owupalace.com',
      phoneNumbers: ['+234-805-678-9012'],
      jobTitle: 'Security Chief',
      department: 'Security',
      dateOfJoining: new Date('2018-06-20'),
      employmentType: 'FULL_TIME' as const,
      workLocation: 'Security Post',
      emergencyContactName: 'Lisa Brown',
      emergencyContactRelationship: 'Spouse',
      emergencyContactPhone: '+234-806-789-0123',
      accountDetails: 'Opay 8101266987',
      isExternallyPaid: false,
    },
    {
      employeeId: 'OWU004',
      fullName: 'Grace Adebayo',
      dateOfBirth: new Date('1992-04-18'),
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      nationality: 'Nigerian',
      address: '321 Heritage Lane, Owu Kingdom',
      personalEmail: 'grace.adebayo@email.com',
      workEmail: 'grace.adebayo@owupalace.com',
      phoneNumbers: ['+234-807-890-1234'],
      jobTitle: 'Cultural Affairs Officer',
      department: 'Cultural Affairs',
      dateOfJoining: new Date('2021-09-01'),
      employmentType: 'FULL_TIME' as const,
      workLocation: 'Cultural Center',
      emergencyContactName: 'Adebayo Adebayo',
      emergencyContactRelationship: 'Father',
      emergencyContactPhone: '+234-808-901-2345',
      accountDetails: 'Keystone Bank 2635780903',
      isExternallyPaid: true, // External payment example
    },
  ];

  const createdStaff = [];
  for (const staffData of staffMembers) {
    const staff = await prisma.staff.upsert({
      where: { employeeId: staffData.employeeId },
      update: {},
      create: staffData,
    });
    createdStaff.push(staff);
    console.log(`✅ Staff member created/updated: ${staff.fullName} (${staff.employeeId})`);
  }

  // Set reporting relationships
  await prisma.staff.update({
    where: { employeeId: 'OWU002' },
    data: { reportingManagerId: createdStaff[0].id }, // Sarah reports to John
  });

  await prisma.staff.update({
    where: { employeeId: 'OWU003' },
    data: { reportingManagerId: createdStaff[0].id }, // Michael reports to John
  });

  await prisma.staff.update({
    where: { employeeId: 'OWU004' },
    data: { reportingManagerId: createdStaff[0].id }, // Grace reports to John
  });

  // Create salary structures
  const salaryStructures = [
    {
      staffId: createdStaff[0].id,
      basicSalary: 500000,
      housingAllowance: 200000,
      transportAllowance: 100000,
      medicalAllowance: 50000,
      taxDeduction: 75000,
      pensionDeduction: 40000,
    },
    {
      staffId: createdStaff[1].id,
      basicSalary: 400000,
      housingAllowance: 150000,
      transportAllowance: 80000,
      medicalAllowance: 40000,
      taxDeduction: 60000,
      pensionDeduction: 32000,
    },
    {
      staffId: createdStaff[2].id,
      basicSalary: 350000,
      housingAllowance: 120000,
      transportAllowance: 70000,
      medicalAllowance: 35000,
      taxDeduction: 52500,
      pensionDeduction: 28000,
    },
    {
      staffId: createdStaff[3].id,
      basicSalary: 300000,
      housingAllowance: 100000,
      transportAllowance: 60000,
      medicalAllowance: 30000,
      taxDeduction: 45000,
      pensionDeduction: 24000,
    },
  ];

  for (const salaryData of salaryStructures) {
    const salary = await prisma.salaryStructure.create({
      data: salaryData,
    });
    console.log(`✅ Salary structure created for staff ID: ${salary.staffId}`);
  }

  // Create sample loans
  const loans = [
    {
      staffId: createdStaff[1].id,
      amount: 1000000,
      reason: 'Home renovation',
      repaymentTerms: 12,
      monthlyDeduction: 90000,
      status: 'APPROVED' as const,
      approvedDate: new Date('2024-01-15'),
      startDate: new Date('2024-02-01'),
      outstandingBalance: 720000,
      installmentsPaid: 3,
    },
    {
      staffId: createdStaff[2].id,
      amount: 500000,
      reason: 'Medical emergency',
      repaymentTerms: 6,
      monthlyDeduction: 85000,
      status: 'PENDING' as const,
      outstandingBalance: 500000,
      installmentsPaid: 0,
    },
  ];

  for (const loanData of loans) {
    const loan = await prisma.loan.create({
      data: loanData,
    });
    console.log(`✅ Loan created: ${loan.reason} - ₦${loan.amount}`);
  }

  // Create sample issues
  const issues = [
    {
      ticketNumber: 'TKT-001',
      staffId: createdStaff[1].id,
      category: 'PAYROLL_DISCREPANCY' as const,
      title: 'Incorrect overtime calculation',
      description: 'The overtime hours for December were not calculated correctly in the payroll.',
      status: 'OPEN' as const,
      priority: 'HIGH' as const,
      assignedTo: admin.id,
    },
    {
      ticketNumber: 'TKT-002',
      category: 'WORKPLACE_CONFLICT' as const,
      title: 'Interdepartmental communication issue',
      description: 'There seems to be a communication breakdown between Finance and Administration departments.',
      status: 'IN_PROGRESS' as const,
      priority: 'MEDIUM' as const,
      assignedTo: admin.id,
    },
  ];

  for (const issueData of issues) {
    const issue = await prisma.issue.upsert({
      where: { ticketNumber: issueData.ticketNumber },
      update: {},
      create: issueData,
    });
    console.log(`✅ Issue created/updated: ${issue.ticketNumber} - ${issue.title}`);
  }

  // Create default system settings
  const defaultSettings = [
    {
      key: 'company_name',
      value: 'Owu Palace',
      description: 'Company name displayed throughout the system',
      category: 'general',
      updatedBy: admin.id
    },
    {
      key: 'max_login_attempts',
      value: '5',
      description: 'Maximum number of failed login attempts before account lockout',
      category: 'security',
      updatedBy: admin.id
    },
    {
      key: 'session_timeout',
      value: '24',
      description: 'Session timeout in hours',
      category: 'security',
      updatedBy: admin.id
    },
    {
      key: 'password_min_length',
      value: '8',
      description: 'Minimum password length requirement',
      category: 'security',
      updatedBy: admin.id
    },
    {
      key: 'backup_frequency',
      value: 'daily',
      description: 'Frequency of automatic database backups',
      category: 'backup',
      updatedBy: admin.id
    }
  ];

  for (const settingData of defaultSettings) {
    const setting = await prisma.systemSettings.upsert({
      where: { key: settingData.key },
      update: {},
      create: settingData,
    });
    console.log(`✅ System setting created: ${setting.key}`);
  }

  // Create default categories
  const defaultCategories = [
    // Positions
    { name: 'Administrator', type: 'POSITION' as const, description: 'Administrative roles' },
    { name: 'Manager', type: 'POSITION' as const, description: 'Management positions' },
    { name: 'Officer', type: 'POSITION' as const, description: 'Officer level positions' },
    { name: 'Assistant', type: 'POSITION' as const, description: 'Assistant roles' },
    
    // Departments
    { name: 'Administration', type: 'DEPARTMENT' as const, description: 'Administrative department' },
    { name: 'Finance', type: 'DEPARTMENT' as const, description: 'Finance and accounting' },
    { name: 'Security', type: 'DEPARTMENT' as const, description: 'Security department' },
    { name: 'Cultural Affairs', type: 'DEPARTMENT' as const, description: 'Cultural affairs department' },
    { name: 'Human Resources', type: 'DEPARTMENT' as const, description: 'HR department' },
    
    // Job Types
    { name: 'Full Time', type: 'JOB_TYPE' as const, description: 'Full-time employment' },
    { name: 'Part Time', type: 'JOB_TYPE' as const, description: 'Part-time employment' },
    { name: 'Contract', type: 'JOB_TYPE' as const, description: 'Contract-based employment' },
    { name: 'Temporary', type: 'JOB_TYPE' as const, description: 'Temporary employment' },
    
    // Issue Categories
    { name: 'Payroll Issues', type: 'ISSUE_CATEGORY' as const, description: 'Payroll related problems' },
    { name: 'Workplace Conflicts', type: 'ISSUE_CATEGORY' as const, description: 'Workplace conflict issues' },
    { name: 'Policy Violations', type: 'ISSUE_CATEGORY' as const, description: 'Policy violation reports' },
    { name: 'Performance Issues', type: 'ISSUE_CATEGORY' as const, description: 'Performance related concerns' },
    { name: 'Attendance Issues', type: 'ISSUE_CATEGORY' as const, description: 'Attendance problems' },
    { name: 'General Inquiries', type: 'ISSUE_CATEGORY' as const, description: 'General questions and inquiries' }
  ];

  for (const categoryData of defaultCategories) {
    const category = await prisma.category.upsert({
      where: { 
        name_type: {
          name: categoryData.name,
          type: categoryData.type
        }
      },
      update: {},
      create: categoryData,
    });
    console.log(`✅ Category created: ${category.name} (${category.type})`);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`- Admin users: 1`);
  console.log(`- Staff members: ${createdStaff.length}`);
  console.log(`- Salary structures: ${salaryStructures.length}`);
  console.log(`- Loans: ${loans.length}`);
  console.log(`- Issues: ${issues.length}`);
  console.log(`- System settings: ${defaultSettings.length}`);
  console.log(`- Categories: ${defaultCategories.length}`);
  console.log('\n🔐 Admin Login:');
  console.log('Email: admin@owupalace.com');
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });