import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import DatePicker from '../components/ui/DatePicker';

interface Category {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface AddStaffModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddStaffModal: React.FC<AddStaffModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    dateOfBirth: '',
    gender: 'MALE',
    maritalStatus: 'SINGLE',
    nationality: 'Nigerian',
    address: '',
    personalEmail: '',
    workEmail: '',
    phoneNumbers: [''],
    jobTitle: '',
    department: '',
    reportingManagerId: '',
    dateOfJoining: '',
    employmentType: 'FULL_TIME',
    workLocation: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    isExternallyPaid: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [managers, setManagers] = useState<Staff[]>([]);
  const [positions, setPositions] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Category[]>([]);
  const [jobTypes, setJobTypes] = useState<Category[]>([]);

  useEffect(() => {
    fetchManagers();
    fetchCategories();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await axios.get('/staff?limit=100');
      if (response.data.success) {
        setManagers(response.data.data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/admin/categories');
      if (response.data.success) {
        const categories = response.data.data;
        setPositions(categories.filter((cat: Category) => cat.type === 'POSITION'));
        setDepartments(categories.filter((cat: Category) => cat.type === 'DEPARTMENT'));
        setJobTypes(categories.filter((cat: Category) => cat.type === 'JOB_TYPE'));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.phoneNumbers];
    newPhones[index] = value;
    setFormData(prev => ({ ...prev, phoneNumbers: newPhones }));
  };

  const addPhoneNumber = () => {
    setFormData(prev => ({ ...prev, phoneNumbers: [...prev.phoneNumbers, ''] }));
  };

  const removePhoneNumber = (index: number) => {
    if (formData.phoneNumbers.length > 1) {
      const newPhones = formData.phoneNumbers.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, phoneNumbers: newPhones }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!formData.fullName.trim()) {
      setError('Full Name is required');
      setLoading(false);
      return;
    }

    if (!formData.employeeId.trim()) {
      setError('Employee ID is required');
      setLoading(false);
      return;
    }

    const validPhones = formData.phoneNumbers.filter(phone => phone.trim() !== '');
    if (validPhones.length === 0) {
      setError('At least one phone number is required');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/staff', {
        ...formData,
        phoneNumbers: validPhones
      });

      if (response.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Add New Staff Member
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700 bg-none border-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <DatePicker
                  value={formData.dateOfBirth}
                  onChange={(date) => setFormData(prev => ({ ...prev, dateOfBirth: date }))}
                  placeholder="Select date of birth"
                  name="dateOfBirth"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marital Status
                  </label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Email
                </label>
                <input
                  type="email"
                  name="personalEmail"
                  value={formData.personalEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  name="workEmail"
                  value={formData.workEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Numbers *
                </label>
                {formData.phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      placeholder="Phone number"
                      required={index === 0}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formData.phoneNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhoneNumber(index)}
                        className="px-2 py-2 bg-red-600 text-white rounded-md border-none cursor-pointer hover:bg-red-700"
                      >
                        -
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPhoneNumber}
                  className="px-4 py-2 bg-green-600 text-white rounded-md border-none cursor-pointer text-sm hover:bg-green-700"
                >
                  Add Phone
                </button>
              </div>
            </div>
          </div>

          {/* Job Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Job Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Position</option>
                  {positions.map(position => (
                    <option key={position.id} value={position.name}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {departments.map(department => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reporting Manager
                </label>
                <select
                  name="reportingManagerId"
                  value={formData.reportingManagerId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.fullName} ({manager.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Joining
                </label>
                <DatePicker
                  value={formData.dateOfJoining}
                  onChange={(date) => setFormData(prev => ({ ...prev, dateOfJoining: date }))}
                  placeholder="Select joining date"
                  name="dateOfJoining"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type
                </label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  {jobTypes.map(jobType => (
                    <option key={jobType.id} value={jobType.name.toUpperCase().replace(' ', '_')}>
                      {jobType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Location
                </label>
                <input
                  type="text"
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  name="emergencyContactRelationship"
                  value={formData.emergencyContactRelationship}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isExternallyPaid"
                checked={formData.isExternallyPaid}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Is Externally Paid (salary handled outside the system)
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-500 text-white rounded-md text-sm font-medium border-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-sky-500 text-white rounded-md text-sm font-medium border-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2 hover:bg-sky-600"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              {loading ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface Staff {
  id: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  department: string;
  workEmail: string;
  employmentType: string;
  isActive: boolean;
  dateOfJoining: string;
  reportingManager?: {
    id: string;
    fullName: string;
    employeeId: string;
  };
  _count: {
    subordinates: number;
  };
}

interface StaffFilters {
  search: string;
  department: string;
  employmentType: string;
  isActive: string;
}

const StaffList: React.FC = () => {
  const { logout } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StaffFilters>({
    search: '',
    department: '',
    employmentType: '',
    isActive: 'true'
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await axios.get(`/staff?${params}`);
      
      if (response.data.success) {
        setStaff(response.data.data.staff);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/staff/options');
      if (response.data.success) {
        setDepartments(response.data.data.departments);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleFilterChange = (key: keyof StaffFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case 'FULL_TIME': return '#10b981';
      case 'PART_TIME': return '#f59e0b';
      case 'CONTRACT': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Owu Palace HRMS
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-sky-500 text-white px-3 py-2 rounded-md text-sm font-medium border-none cursor-pointer hover:bg-sky-600"
              >
                Dashboard
              </button>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium border-none cursor-pointer hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Staff Management
            </h1>
            <p className="text-sm text-gray-600">
              Manage employee profiles and information
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-sky-500 text-white px-4 py-3 rounded-md text-sm font-medium border-none cursor-pointer flex items-center gap-2 hover:bg-sky-600"
          >
            <span className="text-base">+</span>
            Add New Staff
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name, ID, email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <select
                value={filters.employmentType}
                onChange={(e) => handleFilterChange('employmentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500">Loading staff...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {staff.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-12 text-center text-gray-500">
                          No staff members found
                        </td>
                      </tr>
                    ) : (
                      staff.map((member) => (
                        <tr key={member.id} className="border-t border-gray-200">
                          <td className="px-3 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {member.fullName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {member.employeeId} • {member.workEmail}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {member.jobTitle}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {member.department}
                          </td>
                          <td className="px-3 py-4">
                            <span
                              className="inline-block px-2 py-1 rounded-md text-xs font-medium text-white"
                              style={{ backgroundColor: getEmploymentTypeColor(member.employmentType) }}
                            >
                              {member.employmentType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {formatDate(member.dateOfJoining)}
                          </td>
                          <td className="px-3 py-4">
                            <span
                              className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                                member.isActive 
                                  ? 'text-green-800 bg-green-100' 
                                  : 'text-red-800 bg-red-100'
                              }`}
                            >
                              {member.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => window.location.href = `/staff/${member.id}`}
                                className="px-2 py-1 bg-sky-500 text-white rounded text-xs border-none cursor-pointer hover:bg-sky-600"
                              >
                                View
                              </button>
                              <button className="px-2 py-1 bg-green-600 text-white rounded text-xs border-none cursor-pointer hover:bg-green-700">
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-4 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className={`px-3 py-2 rounded-md text-sm border-none cursor-pointer ${
                        pagination.hasPrev 
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className={`px-3 py-2 rounded-md text-sm border-none cursor-pointer ${
                        pagination.hasNext 
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add Staff Modal */}
      {showAddForm && <AddStaffModal onClose={() => setShowAddForm(false)} onSuccess={fetchStaff} />}
    </div>
  );
};

export default StaffList;