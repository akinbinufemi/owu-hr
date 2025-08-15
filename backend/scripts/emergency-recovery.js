#!/usr/bin/env node

/**
 * Emergency Database Recovery Script
 * This script helps recover access when login fails due to database issues
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function emergencyRecovery() {
  console.log('🚨 Starting emergency database recovery...');
  
  try {
    // Check if database is accessible
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if Admin table exists and has the new columns
    console.log('🔍 Checking Admin table structure...');
    
    try {
      const adminCount = await prisma.admin.count();
      console.log(`📊 Found ${adminCount} admin records`);
      
      // Try to access new password expiry fields
      const adminWithExpiry = await prisma.admin.findFirst({
        select: {
          id: true,
          email: true,
          passwordChangedAt: true,
          passwordExpiresAt: true,
          mustChangePassword: true
        }
      });
      
      if (adminWithExpiry) {
        console.log('✅ Password expiry fields exist');
      }
    } catch (error) {
      console.log('❌ Password expiry fields missing, need to run migration');
      console.log('Run: npx prisma migrate deploy');
      return;
    }

    // Reset the default admin user
    console.log('🔄 Resetting default admin user...');
    
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
        mustChangePassword: false
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
        mustChangePassword: false
      },
    });

    console.log('✅ Admin user reset successfully');
    console.log('📧 Email: admin@owupalace.com');
    console.log('🔑 Password: admin123');
    console.log(`⏰ Password expires: ${passwordExpiresAt.toISOString()}`);

    // Check for other admin users that might need password expiry updates
    const adminsWithoutExpiry = await prisma.admin.findMany({
      where: {
        passwordExpiresAt: null
      }
    });

    if (adminsWithoutExpiry.length > 0) {
      console.log(`🔄 Updating ${adminsWithoutExpiry.length} admin(s) without password expiry...`);
      
      for (const admin of adminsWithoutExpiry) {
        await prisma.admin.update({
          where: { id: admin.id },
          data: {
            passwordChangedAt: now,
            passwordExpiresAt: passwordExpiresAt,
            mustChangePassword: false
          }
        });
      }
      
      console.log('✅ All admin users updated with password expiry');
    }

    console.log('🎉 Emergency recovery completed successfully!');
    console.log('');
    console.log('You can now login with:');
    console.log('Email: admin@owupalace.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Emergency recovery failed:', error);
    
    if (error.code === 'P1001') {
      console.log('');
      console.log('🔧 Database connection failed. Please check:');
      console.log('1. DATABASE_URL environment variable');
      console.log('2. Database server is running');
      console.log('3. Network connectivity');
    } else if (error.code === 'P2021') {
      console.log('');
      console.log('🔧 Table does not exist. Please run:');
      console.log('npx prisma migrate deploy');
      console.log('npx prisma db seed');
    } else {
      console.log('');
      console.log('🔧 Possible solutions:');
      console.log('1. Run: npx prisma migrate deploy');
      console.log('2. Run: npx prisma db seed');
      console.log('3. Check database connection');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the recovery
emergencyRecovery()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });