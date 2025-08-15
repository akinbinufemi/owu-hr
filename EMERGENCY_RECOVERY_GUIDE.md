# 🚨 Emergency Database Recovery Guide

## ⚠️ SECURITY NOTICE
This guide contains sensitive information for database recovery. Keep it secure and only share with authorized administrators.

## 🔒 Secure Recovery Methods

### Method 1: Using Emergency Access Token (Recommended)

**Step 1: Get Emergency Access Token**
```
Emergency Token: owu-palace-emergency-2025-secure-token-change-this
```
⚠️ **IMPORTANT**: Change this token in production environment variables!

**Step 2: Check Database Status**
```bash
curl -H "X-Emergency-Token: owu-palace-emergency-2025-secure-token-change-this" \
     https://owu-hr.onrender.com/api/system/db-status
```

**Step 3: Emergency Reseed (if needed)**
```bash
curl -X POST \
     -H "X-Emergency-Token: owu-palace-emergency-2025-secure-token-change-this" \
     -H "Content-Type: application/json" \
     https://owu-hr.onrender.com/api/system/emergency-reseed
```

### Method 2: Using SUPER_ADMIN Authentication

If you have access to a SUPER_ADMIN account:

**Step 1: Login and get JWT token**
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@owupalace.com","password":"admin123"}' \
     https://owu-hr.onrender.com/api/auth/login
```

**Step 2: Use JWT token for system operations**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://owu-hr.onrender.com/api/system/db-status
```

### Method 3: Direct Server Access (Most Secure)

If you have access to the Render.com console:

**Step 1: Open Render Console**
1. Go to Render.com dashboard
2. Open your backend service
3. Go to "Shell" tab

**Step 2: Run Recovery Script**
```bash
node scripts/emergency-recovery.js
```

**Step 3: Or Run Prisma Commands**
```bash
# Apply migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

## 🔐 Security Features Implemented

### Authentication Requirements
- **Emergency Token**: Secure token-based access for emergencies
- **SUPER_ADMIN Only**: Regular access requires SUPER_ADMIN role
- **Rate Limiting**: Strict rate limits on system endpoints
- **Environment Checks**: Additional validation for production environments

### Security Headers Required
```
X-Emergency-Token: [Your secure token]
```
OR
```
Authorization: Bearer [SUPER_ADMIN JWT token]
```

### Production Safety
- Emergency access disabled by default in production
- Requires explicit environment variable: `ALLOW_EMERGENCY_RESEED=true`
- Secure token validation
- Audit logging of all emergency operations

## 🎯 Default Credentials After Recovery

After successful recovery, you can login with:
- **Email**: `admin@owupalace.com`
- **Password**: `admin123`
- **Role**: `SUPER_ADMIN`

⚠️ **IMPORTANT**: Change the default password immediately after login!

## 🛡️ Security Best Practices

### 1. Change Emergency Token
Update the `EMERGENCY_ACCESS_TOKEN` in your environment variables:
```
EMERGENCY_ACCESS_TOKEN=your-unique-secure-token-here
```

### 2. Disable Emergency Access in Production
After recovery, set:
```
ALLOW_EMERGENCY_RESEED=false
```

### 3. Monitor Access Logs
Check your backend logs for any unauthorized access attempts:
```
🚨 Emergency database reseed requested by: [user/token]
```

### 4. Regular Security Audits
- Review admin accounts monthly
- Check for unusual login patterns
- Monitor system endpoint usage
- Update emergency tokens regularly

## 🚨 If You Suspect Security Breach

1. **Immediately change emergency token**
2. **Disable emergency access**: `ALLOW_EMERGENCY_RESEED=false`
3. **Review all admin accounts**
4. **Check audit logs for suspicious activity**
5. **Force password reset for all admin users**

## 📞 Emergency Contacts

- **System Administrator**: [Your contact]
- **Database Administrator**: [Your contact]
- **Security Team**: [Your contact]

---

**Last Updated**: January 2025  
**Classification**: CONFIDENTIAL  
**Access Level**: SUPER_ADMIN Only