import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/NotificationToast';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import axios from 'axios';

interface PasswordExpiryInfo {
  passwordExpiresAt: string | null;
  mustChangePassword: boolean;
  daysUntilExpiry: number | null;
  isExpired: boolean;
}

const ProfileSettings: React.FC = () => {
  const { admin, updateAdmin } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwordExpiry, setPasswordExpiry] = useState<PasswordExpiryInfo | null>(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    fullName: admin?.fullName || '',
    email: admin?.email || ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    fetchPasswordExpiryInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPasswordExpiryInfo = async () => {
    try {
      const response = await axios.get('/auth/password-expiry');
      if (response.data.success) {
        setPasswordExpiry(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch password expiry info:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put('/auth/profile', profileForm);
      if (response.data.success) {
        success('Profile updated successfully');
        updateAdmin(response.data.data);
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      error('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      if (response.data.success) {
        success('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
        fetchPasswordExpiryInfo(); // Refresh expiry info
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordExpiryStatus = () => {
    if (!passwordExpiry) return null;

    if (passwordExpiry.isExpired) {
      return {
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: '🚨',
        message: 'Your password has expired and must be changed immediately'
      };
    }

    if (passwordExpiry.mustChangePassword) {
      return {
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: '⚠️',
        message: 'You are required to change your password'
      };
    }

    if (passwordExpiry.daysUntilExpiry !== null) {
      if (passwordExpiry.daysUntilExpiry <= 7) {
        return {
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: '⏰',
          message: `Your password will expire in ${passwordExpiry.daysUntilExpiry} day(s)`
        };
      }

      return {
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: '✅',
        message: `Your password will expire in ${passwordExpiry.daysUntilExpiry} day(s)`
      };
    }

    return {
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: 'ℹ️',
      message: 'Password expiry information not available'
    };
  };

  const expiryStatus = getPasswordExpiryStatus();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
      </div>

      {/* Password Expiry Alert */}
      {expiryStatus && (
        <div className={`p-4 rounded-lg border ${expiryStatus.color}`}>
          <div className="flex items-center">
            <span className="text-xl mr-3">{expiryStatus.icon}</span>
            <div>
              <p className="font-medium">{expiryStatus.message}</p>
              {passwordExpiry?.passwordExpiresAt && (
                <p className="text-sm mt-1">
                  Password expires on: {new Date(passwordExpiry.passwordExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-500">Update your personal information</p>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
            <FormField
              label="Full Name"
              name="fullName"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
              required
            />
            
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              required
            />

            <div className="pt-4">
              <Button
                type="submit"
                loading={loading}
                className="w-full"
              >
                Update Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Account Security */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Account Security</h2>
            <p className="text-sm text-gray-500">Manage your password and security settings</p>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Account Info */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Role</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  admin?.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                  admin?.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                  admin?.role === 'HR_MANAGER' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {admin?.role?.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Account Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  admin?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {admin?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {admin?.lastLogin && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Last Login</span>
                  <span className="text-sm text-gray-500">
                    {new Date(admin.lastLogin).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              {!showPasswordForm ? (
                <Button
                  onClick={() => setShowPasswordForm(true)}
                  variant="outline"
                  className="w-full"
                >
                  Change Password
                </Button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <FormField
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                  
                  <FormField
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    helpText="Password must be at least 8 characters long"
                  />
                  
                  <FormField
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />

                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={loading}
                      className="flex-1"
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Policy Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Password Policy</h2>
          <p className="text-sm text-gray-500">Current password requirements</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm text-gray-700">Minimum 8 characters</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm text-gray-700">At least one special character</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm text-gray-700">Password expires every 90 days</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm text-gray-700">Cannot reuse last 5 passwords</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;