import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';
import DataTable from '../components/ui/DataTable';
import { useToast } from '../components/ui/NotificationToast';
import axios from 'axios';

interface Admin {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'HR_MANAGER' | 'VIEWER';
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  type: 'POSITION' | 'DEPARTMENT' | 'JOB_TYPE' | 'ISSUE_CATEGORY';
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const Settings: React.FC = () => {
  // const { admin } = useAuth(); // Commented out as not currently used
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'system' | 'security'>('users');
  const [loading, setLoading] = useState(false);
  
  // User Management State
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Admin | null>(null);
  
  // System Settings State
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategoryType, setSelectedCategoryType] = useState<'POSITION' | 'DEPARTMENT' | 'JOB_TYPE' | 'ISSUE_CATEGORY'>('POSITION');

  // Form States
  const [userForm, setUserForm] = useState<{
    email: string;
    fullName: string;
    password: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'HR_MANAGER' | 'VIEWER';
    permissions: string[];
  }>({
    email: '',
    fullName: '',
    password: '',
    role: 'ADMIN',
    permissions: []
  });

  const [settingForm, setSettingForm] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general'
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'POSITION' as 'POSITION' | 'DEPARTMENT' | 'JOB_TYPE' | 'ISSUE_CATEGORY',
    description: ''
  });

  const roles = [
    { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full system access' },
    { value: 'ADMIN', label: 'Admin', description: 'Most system features' },
    { value: 'HR_MANAGER', label: 'HR Manager', description: 'HR operations only' },
    { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' }
  ];

  const availablePermissions = [
    'manage_staff', 'manage_payroll', 'manage_loans', 'manage_issues',
    'view_reports', 'manage_files', 'manage_users', 'system_settings'
  ];

  useEffect(() => {
    fetchAdmins();
    fetchSettings();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/users');
      if (response.data.success) {
        setAdmins(response.data.data);
      }
    } catch (err) {
      error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/admin/settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (err) {
      error('Failed to fetch settings');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/admin/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (err) {
      error('Failed to fetch categories');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/admin/users', userForm);
      if (response.data.success) {
        success('User created successfully');
        setShowCreateUserModal(false);
        setUserForm({ email: '', fullName: '', password: '', role: 'ADMIN', permissions: [] });
        fetchAdmins();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const response = await axios.put(`/admin/users/${editingUser.id}`, userForm);
      if (response.data.success) {
        success('User updated successfully');
        setEditingUser(null);
        setUserForm({ email: '', fullName: '', password: '', role: 'ADMIN', permissions: [] });
        fetchAdmins();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await axios.patch(`/admin/users/${userId}/status`, { isActive: !isActive });
      if (response.data.success) {
        success(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchAdmins();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to update user status');
    }
  };

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSetting ? `/admin/settings/${editingSetting.id}` : '/admin/settings';
      const method = editingSetting ? 'put' : 'post';
      
      const response = await axios[method](url, settingForm);
      if (response.data.success) {
        success(`Setting ${editingSetting ? 'updated' : 'created'} successfully`);
        setShowSettingModal(false);
        setEditingSetting(null);
        setSettingForm({ key: '', value: '', description: '', category: 'general' });
        fetchSettings();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to save setting');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory ? `/admin/categories/${editingCategory.id}` : '/admin/categories';
      const method = editingCategory ? 'put' : 'post';
      
      const response = await axios[method](url, categoryForm);
      if (response.data.success) {
        success(`Category ${editingCategory ? 'updated' : 'created'} successfully`);
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', type: 'POSITION', description: '' });
        fetchCategories();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to save category');
    }
  };

  const handleToggleCategoryStatus = async (categoryId: string, isActive: boolean) => {
    try {
      const response = await axios.patch(`/admin/categories/${categoryId}/status`, { isActive: !isActive });
      if (response.data.success) {
        success(`Category ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchCategories();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to update category status');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const response = await axios.delete(`/admin/categories/${categoryId}`);
      if (response.data.success) {
        success('Category deleted successfully');
        fetchCategories();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to delete category');
    }
  };

  const userColumns = [
    { key: 'fullName', title: 'Name', sortable: true },
    { key: 'email', title: 'Email', sortable: true },
    { 
      key: 'role', 
      title: 'Role', 
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
          value === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
          value === 'HR_MANAGER' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    { 
      key: 'isActive', 
      title: 'Status', 
      render: (value: boolean, record: Admin) => (
        <button
          onClick={() => handleToggleUserStatus(record.id, value)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </button>
      )
    },
    { 
      key: 'lastLogin', 
      title: 'Last Login', 
      render: (value: string) => value ? new Date(value).toLocaleDateString() : 'Never'
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Admin) => (
        <button
          onClick={() => {
            setEditingUser(record);
            setUserForm({
              email: record.email,
              fullName: record.fullName,
              password: '',
              role: record.role,
              permissions: record.permissions
            });
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Edit
        </button>
      )
    }
  ];

  const settingColumns = [
    { key: 'key', title: 'Key', sortable: true },
    { key: 'value', title: 'Value', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    { key: 'description', title: 'Description' },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: SystemSetting) => (
        <button
          onClick={() => {
            setEditingSetting(record);
            setSettingForm({
              key: record.key,
              value: record.value,
              description: record.description || '',
              category: record.category
            });
            setShowSettingModal(true);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Edit
        </button>
      )
    }
  ];

  const categoryColumns = [
    { key: 'name', title: 'Name', sortable: true },
    { 
      key: 'type', 
      title: 'Type', 
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'POSITION' ? 'bg-blue-100 text-blue-800' :
          value === 'DEPARTMENT' ? 'bg-green-100 text-green-800' :
          value === 'JOB_TYPE' ? 'bg-purple-100 text-purple-800' :
          'bg-orange-100 text-orange-800'
        }`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    { key: 'description', title: 'Description' },
    { 
      key: 'isActive', 
      title: 'Status', 
      render: (value: boolean, record: Category) => (
        <button
          onClick={() => handleToggleCategoryStatus(record.id, value)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </button>
      )
    },
    { 
      key: 'createdAt', 
      title: 'Created', 
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Category) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingCategory(record);
              setCategoryForm({
                name: record.name,
                type: record.type,
                description: record.description || ''
              });
              setShowCategoryModal(true);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteCategory(record.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  const filteredCategories = categories.filter(cat => cat.type === selectedCategoryType);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading settings..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'users', label: 'User Management', icon: '👥' },
            { key: 'categories', label: 'Categories', icon: '📋' },
            { key: 'system', label: 'System Settings', icon: '⚙️' },
            { key: 'security', label: 'Security', icon: '🔒' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create User
            </button>
          </div>

          <DataTable
            data={admins}
            columns={userColumns}
            rowKey="id"
            loading={loading}
          />
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Category Management</h2>
            <button
              onClick={() => {
                setCategoryForm({ name: '', type: selectedCategoryType, description: '' });
                setShowCategoryModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Category
            </button>
          </div>

          {/* Category Type Filter */}
          <div className="flex space-x-4">
            {[
              { value: 'POSITION', label: 'Positions', icon: '💼' },
              { value: 'DEPARTMENT', label: 'Departments', icon: '🏢' },
              { value: 'JOB_TYPE', label: 'Job Types', icon: '📝' },
              { value: 'ISSUE_CATEGORY', label: 'Issue Categories', icon: '🎫' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedCategoryType(type.value as any)}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategoryType === type.value
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>

          <DataTable
            data={filteredCategories}
            columns={categoryColumns}
            rowKey="id"
            loading={loading}
          />
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
            <button
              onClick={() => setShowSettingModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Setting
            </button>
          </div>

          <DataTable
            data={settings}
            columns={settingColumns}
            rowKey="id"
            loading={loading}
          />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Minimum password length</span>
                  <span className="text-sm font-medium">8 characters</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Require special characters</span>
                  <span className="text-sm font-medium text-green-600">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Password expiry</span>
                  <span className="text-sm font-medium">90 days</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Session timeout</span>
                  <span className="text-sm font-medium">24 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Max concurrent sessions</span>
                  <span className="text-sm font-medium">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Remember me duration</span>
                  <span className="text-sm font-medium">30 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={showCreateUserModal || !!editingUser}
        onClose={() => {
          setShowCreateUserModal(false);
          setEditingUser(null);
          setUserForm({ email: '', fullName: '', password: '', role: 'ADMIN', permissions: [] });
        }}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="lg"
      >
        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
          <FormField
            label="Full Name"
            name="fullName"
            value={userForm.fullName}
            onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
            required
          />
          
          <FormField
            label="Email"
            name="email"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            required
          />
          
          <FormField
            label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
            name="password"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            required={!editingUser}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {availablePermissions.map((permission) => (
                <label key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={userForm.permissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserForm({
                          ...userForm,
                          permissions: [...userForm.permissions, permission]
                        });
                      } else {
                        setUserForm({
                          ...userForm,
                          permissions: userForm.permissions.filter(p => p !== permission)
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateUserModal(false);
                setEditingUser(null);
                setUserForm({ email: '', fullName: '', password: '', role: 'ADMIN', permissions: [] });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingModal}
        onClose={() => {
          setShowSettingModal(false);
          setEditingSetting(null);
          setSettingForm({ key: '', value: '', description: '', category: 'general' });
        }}
        title={editingSetting ? 'Edit Setting' : 'Add Setting'}
      >
        <form onSubmit={handleSaveSetting} className="space-y-4">
          <FormField
            label="Key"
            name="key"
            value={settingForm.key}
            onChange={(e) => setSettingForm({ ...settingForm, key: e.target.value })}
            required
            disabled={!!editingSetting}
          />
          
          <FormField
            label="Value"
            name="value"
            value={settingForm.value}
            onChange={(e) => setSettingForm({ ...settingForm, value: e.target.value })}
            required
          />
          
          <FormField
            label="Description"
            name="description"
            value={settingForm.description}
            onChange={(e) => setSettingForm({ ...settingForm, description: e.target.value })}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={settingForm.category}
              onChange={(e) => setSettingForm({ ...settingForm, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="security">Security</option>
              <option value="email">Email</option>
              <option value="backup">Backup</option>
              <option value="integration">Integration</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowSettingModal(false);
                setEditingSetting(null);
                setSettingForm({ key: '', value: '', description: '', category: 'general' });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {editingSetting ? 'Update Setting' : 'Add Setting'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
          setCategoryForm({ name: '', type: 'POSITION', description: '' });
        }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <FormField
            label="Name"
            name="name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={categoryForm.type}
              onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={!!editingCategory}
            >
              <option value="POSITION">Position</option>
              <option value="DEPARTMENT">Department</option>
              <option value="JOB_TYPE">Job Type</option>
              <option value="ISSUE_CATEGORY">Issue Category</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter category description..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategory(null);
                setCategoryForm({ name: '', type: 'POSITION', description: '' });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {editingCategory ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Settings;