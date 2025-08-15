# 🔐 OWU Palace HRMS - Security Guide

## 🚨 **Security Issues Fixed**

### **Issue 1: Public Admin Registration Vulnerability**

**Problem**: The login page allowed anyone to create admin accounts through a public registration endpoint.

**Solution**: 
- ✅ **Removed registration link** from login page
- ✅ **Disabled public registration endpoint** - now returns 403 Forbidden
- ✅ **Secure admin creation** - only SUPER_ADMIN users can create new admin accounts through the admin panel

### **Issue 2: Missing Password Expiry System**

**Problem**: Passwords never expired, creating a security risk.

**Solution**:
- ✅ **90-day password expiry** implemented
- ✅ **Automatic expiry checking** with daily scheduled tasks
- ✅ **Password change enforcement** for expired passwords
- ✅ **Expiry warnings** 7 days before expiration

---

## 🔒 **Current Security Features**

### **Authentication & Authorization**
- JWT-based authentication with secure tokens
- Role-based access control (SUPER_ADMIN, ADMIN, HR_MANAGER, VIEWER)
- Permission-based authorization system
- Account lockout for inactive accounts

### **Password Security**
- **Strong password requirements**:
  - Minimum 8 characters
  - Must include uppercase, lowercase, numbers, and special characters
  - Common weak passwords blocked
- **90-day password expiry** with automatic enforcement
- **Password change history** (prevents reusing current password)
- **Secure password hashing** with bcrypt (12 rounds)

### **Rate Limiting & Protection**
- **Login rate limiting**: 5 attempts per 5 minutes
- **API rate limiting**: 100 requests per 15 minutes
- **Strict rate limiting** for sensitive endpoints
- **SQL injection prevention** middleware
- **Input sanitization** for all requests

### **Security Headers**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HTTPS)
- X-XSS-Protection

---

## 👥 **Admin Account Management**

### **Creating New Admin Accounts**

Only SUPER_ADMIN users can create new admin accounts:

1. **Login as SUPER_ADMIN**
2. **Navigate to Admin Panel** → User Management
3. **Click "Create New Admin"**
4. **Fill in details**:
   - Full Name
   - Email Address
   - Temporary Password
   - Role (ADMIN, HR_MANAGER, VIEWER)
   - Permissions

### **New Admin First Login Process**

1. **New admin receives credentials** from SUPER_ADMIN
2. **First login** → System forces password change
3. **Password expires in 90 days** from creation
4. **Must meet strong password requirements**

### **Admin Roles & Permissions**

#### **SUPER_ADMIN**
- Full system access
- Can create/modify/delete other admins
- Can access all features and data
- Can manage system settings

#### **ADMIN**
- Can manage staff records
- Can process payroll
- Can handle loans and issues
- Cannot manage other admins

#### **HR_MANAGER**
- Can manage staff records
- Can view reports
- Can handle HR-related issues
- Limited system access

#### **VIEWER**
- Read-only access to most data
- Can view reports
- Cannot modify any records

---

## 🔐 **Password Expiry System**

### **How It Works**

1. **Password Creation**: Every password gets a 90-day expiry date
2. **Daily Checks**: System checks for expired passwords at 6 AM daily
3. **Automatic Enforcement**: Expired passwords trigger mandatory change
4. **Warning System**: Users get warnings 7 days before expiry
5. **Login Blocking**: Expired passwords cannot be used for login

### **Password Expiry Workflow**

```
Day 1: Password created → Expires in 90 days
Day 83: Warning shown → "Password expires in 7 days"
Day 90: Password expires → Must change before login
Day 91+: Login blocked → "Password expired, must change"
```

### **Checking Password Status**

**For Users**:
- Login dashboard shows days until expiry
- Warning notifications appear 7 days before
- Settings page shows password information

**For Admins**:
- Admin panel shows password status for all users
- Weekly summary reports via console logs
- API endpoint: `GET /api/auth/password-info`

### **Scheduled Tasks**

The system runs automated tasks:

- **Daily at 6 AM**: Check for expired passwords
- **Weekly on Mondays at 9 AM**: Generate summary reports

---

## 🛡️ **Security Best Practices**

### **For System Administrators**

1. **Regular Security Audits**
   - Review admin accounts monthly
   - Check for unused accounts
   - Monitor login patterns

2. **Password Management**
   - Enforce strong passwords
   - Monitor expiry reports
   - Disable accounts for terminated employees

3. **Access Control**
   - Use principle of least privilege
   - Regular permission reviews
   - Remove unnecessary access

4. **Monitoring & Logging**
   - Monitor failed login attempts
   - Check audit trails regularly
   - Set up alerts for security events

### **For Admin Users**

1. **Password Security**
   - Use unique, strong passwords
   - Change passwords before expiry
   - Never share credentials

2. **Account Security**
   - Log out when finished
   - Don't save passwords in browsers
   - Report suspicious activity

3. **Data Protection**
   - Only access necessary data
   - Follow data privacy policies
   - Secure physical access to systems

---

## 🚨 **Security Incident Response**

### **Suspected Unauthorized Access**

1. **Immediate Actions**:
   - Change affected passwords immediately
   - Disable compromised accounts
   - Check audit logs for unauthorized activities

2. **Investigation**:
   - Review login logs
   - Check data access patterns
   - Identify scope of potential breach

3. **Recovery**:
   - Reset all potentially affected passwords
   - Review and update security measures
   - Document incident and lessons learned

### **Password Compromise**

1. **Force password change** for affected account
2. **Review recent activities** in audit logs
3. **Check for data access** during compromise period
4. **Update security policies** if needed

---

## 📊 **Security Monitoring**

### **Daily Monitoring**

Check these daily:
- Failed login attempts
- Password expiry warnings
- Unusual access patterns
- System error logs

### **Weekly Reviews**

Review these weekly:
- Password expiry statistics
- Admin account status
- Permission changes
- Security incident reports

### **Monthly Audits**

Conduct monthly:
- Complete admin account review
- Permission audit
- Security policy review
- System update checks

---

## 🔧 **Security Configuration**

### **Environment Variables**

Ensure these are set securely:

```env
# Strong JWT secret (change in production)
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production

# File encryption key (change in production)
FILE_ENCRYPTION_KEY=your-super-secure-encryption-key-change-this-in-production

# Database connection (use strong password)
DATABASE_URL=postgresql://username:strong_password@host:port/database

# Bcrypt rounds (12 recommended for production)
BCRYPT_ROUNDS=12
```

### **Database Security**

1. **Use strong database passwords**
2. **Restrict database access** to application only
3. **Enable database logging** for audit trails
4. **Regular database backups** with encryption

### **Network Security**

1. **Use HTTPS** for all connections
2. **Restrict API access** to authorized IPs if possible
3. **Use firewall** to block unnecessary ports
4. **Regular security updates** for all components

---

## 📋 **Security Checklist**

### **Initial Setup**
- [ ] Change default admin password
- [ ] Set strong JWT secrets
- [ ] Configure HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable audit logging

### **Regular Maintenance**
- [ ] Review admin accounts monthly
- [ ] Check password expiry reports weekly
- [ ] Update system dependencies regularly
- [ ] Monitor security logs daily
- [ ] Backup data regularly

### **Incident Response**
- [ ] Document security procedures
- [ ] Test incident response plan
- [ ] Train staff on security practices
- [ ] Maintain emergency contact list
- [ ] Regular security assessments

---

## 🆘 **Emergency Procedures**

### **Lost SUPER_ADMIN Access**

If you lose SUPER_ADMIN access:

1. **Database Access Method**:
   ```sql
   -- Connect to database directly
   UPDATE admins SET role = 'SUPER_ADMIN' WHERE email = 'your-email@domain.com';
   ```

2. **Backup Admin Account**:
   - Always maintain at least 2 SUPER_ADMIN accounts
   - Keep backup credentials secure and separate

### **System Compromise**

If system is compromised:

1. **Immediate Actions**:
   - Take system offline if necessary
   - Change all admin passwords
   - Review all recent activities

2. **Recovery Steps**:
   - Restore from clean backup if needed
   - Update all security credentials
   - Patch security vulnerabilities
   - Monitor for continued threats

---

## 📞 **Support & Reporting**

### **Security Issues**

Report security issues to:
- System Administrator
- IT Security Team
- Emergency contact: [Your emergency contact]

### **Password Issues**

For password-related problems:
- Contact SUPER_ADMIN for password resets
- Use secure channels for communication
- Never share passwords via email or chat

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025