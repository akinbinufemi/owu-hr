const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@owupalace.com' },
    update: {
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'SUPER_ADMIN',
      permissions: ['manage_staff', 'manage_payroll', 'manage_loans', 'manage_issues', 'view_reports', 'manage_files', 'manage_users', 'system_settings'],
      isActive: true,
    },
    create: {
      email: 'admin@owupalace.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'SUPER_ADMIN',
      permissions: ['manage_staff', 'manage_payroll', 'manage_loans', 'manage_issues', 'view_reports', 'manage_files', 'manage_users', 'system_settings'],
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Check if staff already exists
  const existingStaff = await prisma.staff.findMany();
  if (existingStaff.length > 0) {
    console.log('📋 Staff data already exists, skipping staff creation');
    
    // Check if loans exist
    const existingLoans = await prisma.loan.findMany();
    if (existingLoans.length === 0) {
      console.log('💰 Creating sample loans...');
      
      // Create sample loans using existing staff
      const loans = [
        {
          staffId: existingStaff[0].id,
          amount: 1000000,
          reason: 'Home renovation',
          repaymentTerms: 12,
          monthlyDeduction: 90000,
          status: 'APPROVED',
          approvedDate: new Date('2024-01-15'),
          startDate: new Date('2024-02-01'),
          outstandingBalance: 720000,
          installmentsPaid: 3,
        },
        {
          staffId: existingStaff[1] ? existingStaff[1].id : existingStaff[0].id,
          amount: 500000,
          reason: 'Medical emergency',
          repaymentTerms: 6,
          monthlyDeduction: 85000,
          status: 'PENDING',
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
    } else {
      console.log('💰 Loan data already exists, skipping loan creation');
    }
    
    console.log('🎉 Database seeding completed!');
    return;
  }

  // Create sample staff members if none exist
  const staffMembers = [
    {
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
      basicSalary: 500000,
      allowances: {
        housing: 200000,
        transport: 50000,
        meal: 30000
      },
      isActive: true,
    },
    {
      employeeId: 'OWU002',
      fullName: 'Jane Smith',
      dateOfBirth: new Date('1988-08-22'),
      gender: 'FEMALE',
      maritalStatus: 'SINGLE',
      nationality: 'Nigerian',
      address: '456 Royal Avenue, Owu Kingdom',
      personalEmail: 'jane.smith@email.com',
      workEmail: 'jane.smith@owupalace.com',
      phoneNumbers: ['+234-802-345-6789'],
      jobTitle: 'Finance Manager',
      department: 'Finance',
      dateOfJoining: new Date('2019-03-10'),
      employmentType: 'FULL_TIME',
      workLocation: 'Main Palace',
      basicSalary: 600000,
      allowances: {
        housing: 250000,
        transport: 60000,
        meal: 35000
      },
      isActive: true,
    },
  ];

  const createdStaff = [];
  for (const staffData of staffMembers) {
    const staff = await prisma.staff.create({
      data: staffData,
    });
    createdStaff.push(staff);
    console.log(`✅ Staff created: ${staff.fullName} (${staff.employeeId})`);
  }

  // Create sample loans
  const loans = [
    {
      staffId: createdStaff[0].id,
      amount: 1000000,
      reason: 'Home renovation',
      repaymentTerms: 12,
      monthlyDeduction: 90000,
      status: 'APPROVED',
      approvedDate: new Date('2024-01-15'),
      startDate: new Date('2024-02-01'),
      outstandingBalance: 720000,
      installmentsPaid: 3,
    },
    {
      staffId: createdStaff[1].id,
      amount: 500000,
      reason: 'Medical emergency',
      repaymentTerms: 6,
      monthlyDeduction: 85000,
      status: 'PENDING',
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

  console.log('🎉 Database seeding completed!');
  console.log('📊 Summary:');
  console.log(`- Admin users: 1`);
  console.log(`- Staff members: ${createdStaff.length}`);
  console.log(`- Loans: ${loans.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });