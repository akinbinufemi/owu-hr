import prisma from '../config/database';

/**
 * Check for expired passwords and mark them as requiring change
 */
export const checkExpiredPasswords = async (): Promise<void> => {
  try {
    const now = new Date();
    
    // Find admins with expired passwords
    const expiredAdmins = await prisma.admin.findMany({
      where: {
        passwordExpiresAt: {
          lt: now
        },
        mustChangePassword: false,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordExpiresAt: true
      }
    });

    if (expiredAdmins.length > 0) {
      // Mark them as requiring password change
      await prisma.admin.updateMany({
        where: {
          id: {
            in: expiredAdmins.map(admin => admin.id)
          }
        },
        data: {
          mustChangePassword: true
        }
      });

      console.log(`🔐 Marked ${expiredAdmins.length} admin(s) as requiring password change due to expiry`);
      
      // Log expired admins (for monitoring/alerting)
      expiredAdmins.forEach(admin => {
        console.log(`   - ${admin.email} (expired: ${admin.passwordExpiresAt})`);
      });
    }

  } catch (error) {
    console.error('Error checking expired passwords:', error);
  }
};

/**
 * Get admins with passwords expiring soon (within specified days)
 */
export const getPasswordsExpiringSoon = async (withinDays: number = 7): Promise<any[]> => {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (withinDays * 24 * 60 * 60 * 1000));

    const expiringSoon = await prisma.admin.findMany({
      where: {
        passwordExpiresAt: {
          gte: now,
          lte: futureDate
        },
        isActive: true,
        mustChangePassword: false
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordExpiresAt: true
      }
    });

    return expiringSoon;
  } catch (error) {
    console.error('Error getting passwords expiring soon:', error);
    return [];
  }
};

/**
 * Calculate days until password expires
 */
export const getDaysUntilExpiry = (passwordExpiresAt: Date | null): number | null => {
  if (!passwordExpiresAt) return null;
  
  const now = new Date();
  const diffTime = passwordExpiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Check if password is expired
 */
export const isPasswordExpired = (passwordExpiresAt: Date | null): boolean => {
  if (!passwordExpiresAt) return false;
  
  const now = new Date();
  return passwordExpiresAt < now;
};

/**
 * Get password expiry statistics
 */
export const getPasswordExpiryStats = async (): Promise<{
  total: number;
  expired: number;
  expiringSoon: number;
  healthy: number;
}> => {
  try {
    const now = new Date();
    const soonDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

    const [total, expired, expiringSoon] = await Promise.all([
      prisma.admin.count({
        where: { isActive: true }
      }),
      prisma.admin.count({
        where: {
          isActive: true,
          passwordExpiresAt: {
            lt: now
          }
        }
      }),
      prisma.admin.count({
        where: {
          isActive: true,
          passwordExpiresAt: {
            gte: now,
            lte: soonDate
          }
        }
      })
    ]);

    return {
      total,
      expired,
      expiringSoon,
      healthy: total - expired - expiringSoon
    };
  } catch (error) {
    console.error('Error getting password expiry stats:', error);
    return { total: 0, expired: 0, expiringSoon: 0, healthy: 0 };
  }
};