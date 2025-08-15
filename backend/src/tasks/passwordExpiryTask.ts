import cron from 'node-cron';
import { checkExpiredPasswords, getPasswordsExpiringSoon, getPasswordExpiryStats } from '../utils/passwordExpiry';

/**
 * Schedule password expiry checks
 */
export const schedulePasswordExpiryTasks = (): void => {
  // Check for expired passwords daily at 6 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('🔐 Running daily password expiry check...');
    await checkExpiredPasswords();
    
    // Get statistics
    const stats = await getPasswordExpiryStats();
    console.log('📊 Password expiry statistics:', stats);
    
    // Check for passwords expiring soon
    const expiringSoon = await getPasswordsExpiringSoon(7);
    if (expiringSoon.length > 0) {
      console.log(`⚠️  ${expiringSoon.length} admin password(s) expiring within 7 days:`);
      expiringSoon.forEach(admin => {
        const daysLeft = Math.ceil((admin.passwordExpiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   - ${admin.email}: ${daysLeft} day(s) remaining`);
      });
    }
  });

  // Weekly summary on Mondays at 9 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('📅 Running weekly password expiry summary...');
    const stats = await getPasswordExpiryStats();
    
    console.log('📊 Weekly Password Security Summary:');
    console.log(`   Total active admins: ${stats.total}`);
    console.log(`   Expired passwords: ${stats.expired}`);
    console.log(`   Expiring soon (7 days): ${stats.expiringSoon}`);
    console.log(`   Healthy passwords: ${stats.healthy}`);
    
    if (stats.expired > 0 || stats.expiringSoon > 0) {
      console.log('⚠️  Action required: Some admin passwords need attention!');
    }
  });

  console.log('✅ Password expiry tasks scheduled');
};

/**
 * Run password expiry check immediately (for testing)
 */
export const runPasswordExpiryCheck = async (): Promise<void> => {
  console.log('🔐 Running immediate password expiry check...');
  await checkExpiredPasswords();
  
  const stats = await getPasswordExpiryStats();
  console.log('📊 Current password expiry statistics:', stats);
};