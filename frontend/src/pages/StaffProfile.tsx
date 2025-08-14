import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Staff {
  id: string;
  employeeId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  address: string;
  personalEmail: string;
  workEmail: string;
  phoneNumbers: string[];
  jobTitle: string;
  department: string;
  dateOfJoining: string;
  employmentType: string;
  workLocation: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  isExternallyPaid: boolean;
  isActive: boolean;
  reportingManager?: {
    id: string;
    fullName: string;
    employeeId: string;
  };
  subordinates: Array<{
    id: string;
    fullName: string;
    employeeId: string;
    jobTitle: string;
  }>;
  salaryStructures: Array<{
    id: string;
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    medicalAllowance: number;
    taxDeduction: number;
    pensionDeduction: number;
    loanDeduction: number;
    effectiveDate: string;
  }>;
  loans: Array<{
    id: string;
    amount: number;
    reason: string;
    status: string;
    outstandingBalance: number;
    monthlyDeduction: number;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    originalName: string;
    category: string;
    uploadedAt: string;
  }>;
}

interface Issue {
  id: string;
  ticketNumber: string;
  category: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

const StaffProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logout, admin } = useAuth();
    const [staff, setStaff] = useState<Staff | null>(null);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'loans' | 'issues' | 'documents'>('overview');
    const [showEditModal, setShowEditModal] = useState(false);

    // Permission checks
    const hasPermission = (permission: string): boolean => {
        if (!admin) return false;
        if (admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN') return true;
        return admin.permissions?.includes(permission) || false;
    };

    const canEditStaff = hasPermission('manage_staff');
    const canViewSalary = hasPermission('manage_payroll') || hasPermission('view_reports');
    const canViewLoans = hasPermission('manage_loans') || hasPermission('view_reports');
    const canViewIssues = hasPermission('manage_issues') || hasPermission('view_reports');

    useEffect(() => {
        if (id) {
            fetchStaffData();
            fetchStaffIssues();
        }
    }, [id]);

    const fetchStaffData = async () => {
        try {
            const response = await axios.get(`/staff/${id}`);
            if (response.data.success) {
                setStaff(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch staff data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffIssues = async () => {
        try {
            const response = await axios.get(`/issues?staffId=${id}`);
            if (response.data.success) {
                setIssues(response.data.data.issues || []);
            }
        } catch (error) {
            console.error('Failed to fetch staff issues:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            'ACTIVE': 'bg-green-100 text-green-800',
            'INACTIVE': 'bg-red-100 text-red-800',
            'PENDING': 'bg-yellow-100 text-yellow-800',
            'APPROVED': 'bg-green-100 text-green-800',
            'REJECTED': 'bg-red-100 text-red-800',
            'COMPLETED': 'bg-blue-100 text-blue-800',
            'OPEN': 'bg-red-100 text-red-800',
            'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
            'RESOLVED': 'bg-green-100 text-green-800',
            'CLOSED': 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Not Found</h2>
                    <p className="text-gray-600 mb-4">The requested staff member could not be found.</p>
                    <button
                        onClick={() => navigate('/staff')}
                        className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600"
                    >
                        Back to Staff List
                    </button>
                </div>
            </div>
        );
    }

    const currentSalary = staff.salaryStructures[0];
    const totalGrossSalary = currentSalary ? 
        Number(currentSalary.basicSalary) + 
        Number(currentSalary.housingAllowance) + 
        Number(currentSalary.transportAllowance) + 
        Number(currentSalary.medicalAllowance) : 0;
    
    const totalDeductions = currentSalary ? 
        Number(currentSalary.taxDeduction) + 
        Number(currentSalary.pensionDeduction) + 
        Number(currentSalary.loanDeduction) : 0;
    
    const netSalary = totalGrossSalary - totalDeductions;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Owu Palace HRMS - Staff Profile
                        </h1>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/staff')}
                                className="bg-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-600"
                            >
                                Back to Staff List
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="bg-sky-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-sky-600"
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={logout}
                                className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Staff Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center">
                            <div className="h-16 w-16 bg-sky-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                {staff.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold text-gray-900">{staff.fullName}</h1>
                                <p className="text-gray-600">{staff.jobTitle} • {staff.department}</p>
                                <p className="text-sm text-gray-500">Employee ID: {staff.employeeId}</p>
                            </div>
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center gap-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(staff.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                                {staff.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {staff.isExternallyPaid && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                    External Payroll
                                </span>
                            )}
                            {canEditStaff && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sky-600 flex items-center gap-2"
                                >
                                    ✏️ Edit Staff
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { key: 'overview', label: 'Overview', icon: '👤', show: true },
                                { key: 'salary', label: 'Salary', icon: '💰', show: canViewSalary },
                                { key: 'loans', label: 'Loans', icon: '🏦', show: canViewLoans },
                                { key: 'issues', label: 'Issues', icon: '⚠️', show: canViewIssues },
                                { key: 'documents', label: 'Documents', icon: '📄', show: canEditStaff }
                            ].filter(tab => tab.show).map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                        activeTab === tab.key
                                            ? 'border-sky-500 text-sky-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Personal Information */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Date of Birth:</span>
                                            <span className="font-medium">{formatDate(staff.dateOfBirth)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Gender:</span>
                                            <span className="font-medium">{staff.gender}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Marital Status:</span>
                                            <span className="font-medium">{staff.maritalStatus}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Nationality:</span>
                                            <span className="font-medium">{staff.nationality || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Address:</span>
                                            <span className="font-medium text-right">{staff.address || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Personal Email:</span>
                                            <span className="font-medium">{staff.personalEmail || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Work Email:</span>
                                            <span className="font-medium">{staff.workEmail || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Phone Numbers:</span>
                                            <span className="font-medium">{staff.phoneNumbers.join(', ')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Employment Information */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Date of Joining:</span>
                                            <span className="font-medium">{formatDate(staff.dateOfJoining)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Employment Type:</span>
                                            <span className="font-medium">{staff.employmentType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Work Location:</span>
                                            <span className="font-medium">{staff.workLocation || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Reporting Manager:</span>
                                            <span className="font-medium">
                                                {staff.reportingManager ? (
                                                    <button
                                                        onClick={() => navigate(`/staff/${staff.reportingManager!.id}`)}
                                                        className="text-sky-600 hover:text-sky-800 underline"
                                                    >
                                                        {staff.reportingManager.fullName} ({staff.reportingManager.employeeId})
                                                    </button>
                                                ) : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Team Members (Subordinates) */}
                                {staff.subordinates.length > 0 && (
                                    <div className="bg-gray-50 rounded-lg p-4 lg:col-span-2">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members ({staff.subordinates.length})</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {staff.subordinates.map((subordinate) => (
                                                <div key={subordinate.id} className="bg-white rounded-lg p-3 border">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <button
                                                                onClick={() => navigate(`/staff/${subordinate.id}`)}
                                                                className="text-sky-600 hover:text-sky-800 font-medium"
                                                            >
                                                                {subordinate.fullName}
                                                            </button>
                                                            <p className="text-sm text-gray-600">{subordinate.jobTitle}</p>
                                                            <p className="text-xs text-gray-500">{subordinate.employeeId}</p>
                                                        </div>
                                                        <div className="h-8 w-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 text-sm font-medium">
                                                            {subordinate.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Emergency Contact */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Name:</span>
                                            <span className="font-medium">{staff.emergencyContactName || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Relationship:</span>
                                            <span className="font-medium">{staff.emergencyContactRelationship || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Phone:</span>
                                            <span className="font-medium">{staff.emergencyContactPhone || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'salary' && canViewSalary && (
                            <div>
                                {currentSalary ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Salary Structure</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Basic Salary:</span>
                                                    <span className="font-medium">{formatCurrency(Number(currentSalary.basicSalary))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Housing Allowance:</span>
                                                    <span className="font-medium">{formatCurrency(Number(currentSalary.housingAllowance))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Transport Allowance:</span>
                                                    <span className="font-medium">{formatCurrency(Number(currentSalary.transportAllowance))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Medical Allowance:</span>
                                                    <span className="font-medium">{formatCurrency(Number(currentSalary.medicalAllowance))}</span>
                                                </div>
                                                <div className="border-t pt-2">
                                                    <div className="flex justify-between font-semibold">
                                                        <span className="text-gray-900">Gross Salary:</span>
                                                        <span className="text-green-600">{formatCurrency(totalGrossSalary)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deductions</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Tax Deduction:</span>
                                                    <span className="font-medium">{formatCurrency(Number(currentSalary.taxDeduction))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Pension Deduction:</span>
                                                    <span className="font-medium">{formatCurrency(Number(currentSalary.pensionDeduction))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Loan Deduction:</span>
                                                    <span className="font-medium">{formatCurrency(Number(currentSalary.loanDeduction))}</span>
                                                </div>
                                                <div className="border-t pt-2">
                                                    <div className="flex justify-between font-semibold">
                                                        <span className="text-gray-900">Total Deductions:</span>
                                                        <span className="text-red-600">{formatCurrency(totalDeductions)}</span>
                                                    </div>
                                                </div>
                                                <div className="border-t pt-2">
                                                    <div className="flex justify-between font-bold text-lg">
                                                        <span className="text-gray-900">Net Salary:</span>
                                                        <span className="text-blue-600">{formatCurrency(netSalary)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No salary structure found for this staff member.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'loans' && canViewLoans && (
                            <div>
                                {staff.loans.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Deduction</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Applied</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {staff.loans.map((loan) => (
                                                    <tr key={loan.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {formatCurrency(Number(loan.amount))}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {loan.reason}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                                                                {loan.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatCurrency(Number(loan.outstandingBalance))}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatCurrency(Number(loan.monthlyDeduction))}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDate(loan.createdAt)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No loans found for this staff member.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'issues' && canViewIssues && (
                            <div>
                                {issues.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket #</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {issues.map((issue) => (
                                                    <tr key={issue.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {issue.ticketNumber}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {issue.title}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {issue.category.replace('_', ' ')}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                                                                {issue.status.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {issue.priority}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDate(issue.createdAt)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No issues found for this staff member.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'documents' && canEditStaff && (
                            <div>
                                {staff.documents.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {staff.documents.map((document) => (
                                            <div key={document.id} className="bg-gray-50 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-900">{document.category}</span>
                                                    <span className="text-xs text-gray-500">{formatDate(document.uploadedAt)}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 truncate">{document.originalName}</p>
                                                <button className="mt-2 text-sky-600 hover:text-sky-800 text-sm font-medium">
                                                    Download
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No documents found for this staff member.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Edit Staff Modal */}
            {showEditModal && staff && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Edit Staff Member
                            </h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-2xl text-gray-500 hover:text-gray-700 bg-none border-none cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const data = {
                                fullName: formData.get('fullName'),
                                workEmail: formData.get('workEmail'),
                                jobTitle: formData.get('jobTitle'),
                                department: formData.get('department'),
                                isActive: formData.get('isActive') === 'on'
                            };

                            try {
                                const response = await axios.put(`/staff/${staff.id}`, data);
                                if (response.data.success) {
                                    alert('Staff member updated successfully!');
                                    setShowEditModal(false);
                                    fetchStaffData(); // Refresh data
                                }
                            } catch (error: any) {
                                alert('Failed to update staff member: ' + (error.response?.data?.error?.message || error.message));
                            }
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        defaultValue={staff.fullName}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Work Email
                                    </label>
                                    <input
                                        type="email"
                                        name="workEmail"
                                        defaultValue={staff.workEmail}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Job Title
                                    </label>
                                    <input
                                        type="text"
                                        name="jobTitle"
                                        defaultValue={staff.jobTitle}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        name="department"
                                        defaultValue={staff.department}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            defaultChecked={staff.isActive}
                                            className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            Active Employee
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-end pt-6 mt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600"
                                >
                                    Update Staff
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffProfile;
export { };