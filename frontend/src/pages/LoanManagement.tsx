import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DatePicker from '../components/ui/DatePicker';
import axios from 'axios';

interface Loan {
  id: string;
  amount: number;
  reason: string;
  repaymentTerms: number;
  monthlyDeduction: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedDate?: string;
  startDate?: string; // Start month of deduction
  outstandingBalance: number;
  installmentsPaid: number;
  statusComments?: string; // Comments when status is changed
  updatedBy?: string; // Admin who last updated the loan
  isPaused?: boolean; // Pause loan repayment
  pausedAt?: string; // When loan was paused
  pauseReason?: string; // Reason for pausing
  createdAt: string;
  staff: {
    id: string;
    fullName: string;
    employeeId: string;
    jobTitle: string;
    department: string;
  };
  updatedByAdmin?: {
    id: string;
    fullName: string;
  };
  repayments?: LoanRepayment[];
}

interface LoanRepayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

interface LoanSummary {
  statistics: {
    totalLoans: number;
    pendingLoans: number;
    approvedLoans: number;
    completedLoans: number;
    rejectedLoans: number;
    totalDisbursed: number;
    totalOutstanding: number;
  };
  recentLoans: Loan[];
}

interface StaffOption {
  id: string;
  fullName: string;
  employeeId: string;
  jobTitle: string;
  department: string;
}

const LoanManagement: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'create'>('overview');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [createForm, setCreateForm] = useState({
    staffId: '',
    amount: '',
    reason: '',
    repaymentTerms: '12',
    monthlyInstallment: '',
    startDate: ''
  });
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    paymentMethod: 'MANUAL_PAYMENT',
    notes: ''
  });
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: '',
    statusComments: '',
    startDate: ''
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pauseForm, setPauseForm] = useState({
    isPaused: false,
    pauseReason: ''
  });
  const [showPauseModal, setShowPauseModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchLoanSummary();
    } else if (activeTab === 'loans') {
      fetchLoans();
    } else if (activeTab === 'create') {
      fetchStaffOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, pagination.page]);

  const fetchLoanSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/loans/summary');
      if (response.data.success) {
        setLoanSummary(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch loan summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await axios.get(`/api/loans?${params}`);
      console.log('Loans API Response:', response.data);
      if (response.data.success) {
        setLoans(response.data.data.loans);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error: any) {
      console.error('Failed to fetch loans:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffOptions = async () => {
    try {
      const response = await axios.get('/api/staff?limit=1000');
      if (response.data.success) {
        setStaffOptions(response.data.data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff options:', error);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/api/loans', {
        ...createForm,
        amount: parseFloat(createForm.amount),
        repaymentTerms: parseInt(createForm.repaymentTerms),
        monthlyDeduction: parseFloat(createForm.monthlyInstallment),
        startDate: createForm.startDate ? new Date(createForm.startDate).toISOString() : undefined
      });
      
      if (response.data.success) {
        alert('Loan created successfully!');
        setCreateForm({
          staffId: '',
          amount: '',
          reason: '',
          repaymentTerms: '12',
          monthlyInstallment: '',
          startDate: ''
        });
        setActiveTab('loans');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create loan';
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLoanStatus = async (loan: Loan) => {
    setSelectedLoan(loan);
    setStatusUpdateForm({
      status: loan.status,
      statusComments: loan.statusComments || '',
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : ''
    });
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    try {
      const response = await axios.put(`/api/loans/${selectedLoan.id}/status`, {
        status: statusUpdateForm.status,
        statusComments: statusUpdateForm.statusComments,
        startDate: statusUpdateForm.startDate ? new Date(statusUpdateForm.startDate).toISOString() : undefined
      });
      
      if (response.data.success) {
        alert(`Loan status updated successfully!`);
        setShowStatusModal(false);
        setStatusUpdateForm({ status: '', statusComments: '', startDate: '' });
        fetchLoans();
        if (showLoanDetails) {
          setSelectedLoan(response.data.data);
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to update loan status';
      alert(`Error: ${message}`);
    }
  };

  const handleViewLoanDetails = async (loanId: string) => {
    try {
      const response = await axios.get(`/api/loans/${loanId}`);
      if (response.data.success) {
        setSelectedLoan(response.data.data);
        setShowLoanDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch loan details:', error);
    }
  };

  const handleProcessRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    try {
      const response = await axios.post(`/api/loans/${selectedLoan.id}/repayment`, {
        amount: parseFloat(repaymentForm.amount),
        paymentMethod: repaymentForm.paymentMethod,
        notes: repaymentForm.notes
      });
      
      if (response.data.success) {
        alert('Repayment processed successfully!');
        setRepaymentForm({ amount: '', paymentMethod: 'MANUAL_PAYMENT', notes: '' });
        setSelectedLoan(response.data.data.loan);
        fetchLoans();
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to process repayment';
      alert(`Error: ${message}`);
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#fef3c7', text: '#92400e' };
      case 'APPROVED': return { bg: '#d1fae5', text: '#065f46' };
      case 'REJECTED': return { bg: '#fee2e2', text: '#991b1b' };
      case 'COMPLETED': return { bg: '#dbeafe', text: '#1e40af' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const calculateProgress = (loan: Loan) => {
    if (loan.repaymentTerms === 0) return 0;
    return (loan.installmentsPaid / loan.repaymentTerms) * 100;
  };

  const calculateCompletionDate = (loan: Loan) => {
    if (loan.status === 'COMPLETED') return 'Completed';
    if (loan.status !== 'APPROVED' || !loan.startDate) return 'Not started';
    
    const startDate = new Date(loan.startDate);
    const completionDate = new Date(startDate);
    completionDate.setMonth(completionDate.getMonth() + loan.repaymentTerms);
    
    return completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const handlePauseResume = async (loan: Loan) => {
    setSelectedLoan(loan);
    setPauseForm({
      isPaused: !loan.isPaused,
      pauseReason: ''
    });
    setShowPauseModal(true);
  };

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    try {
      const response = await axios.put(`/api/loans/${selectedLoan.id}/pause`, pauseForm);
      
      if (response.data.success) {
        alert(`Loan ${pauseForm.isPaused ? 'paused' : 'resumed'} successfully!`);
        setShowPauseModal(false);
        setPauseForm({ isPaused: false, pauseReason: '' });
        fetchLoans();
        if (showLoanDetails) {
          setSelectedLoan(response.data.data);
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to update loan pause status';
      alert(`Error: ${message}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
              Owu Palace HRMS
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => window.location.href = '/dashboard'}
                style={{
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={logout}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
            Loan Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            Manage employee loans, track repayments, and monitor loan status
          </p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <nav style={{ display: 'flex', gap: '2rem' }}>
              {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'loans', label: 'All Loans', icon: '💰' },
                { key: 'create', label: 'Create Loan', icon: '➕' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 0',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: activeTab === tab.key ? '#0ea5e9' : '#6b7280',
                    borderBottom: activeTab === tab.key ? '2px solid #0ea5e9' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && loanSummary && (
          <div>
            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Loans</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>{loanSummary.statistics.totalLoans}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>💰</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Pending Approval</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{loanSummary.statistics.pendingLoans}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>⏳</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Active Loans</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{loanSummary.statistics.approvedLoans}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>✅</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Disbursed</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{formatCurrency(loanSummary.statistics.totalDisbursed)}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>💵</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Outstanding</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(loanSummary.statistics.totalOutstanding)}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>📊</div>
                </div>
              </div>
            </div>

            {/* Recent Loans */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  Recent Loan Applications
                </h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Reason</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanSummary.recentLoans.map((loan) => {
                      const statusColor = getStatusColor(loan.status);
                      return (
                        <tr key={loan.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                {loan.staff.fullName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {loan.staff.employeeId}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                            {formatCurrency(loan.amount)}
                          </td>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                            {loan.reason.length > 30 ? loan.reason.substring(0, 27) + '...' : loan.reason}
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: statusColor.text,
                                backgroundColor: statusColor.bg
                              }}
                            >
                              {loan.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatDate(loan.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div>
            {/* Filters */}
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Search
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search by employee name, ID, or reason..."
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loans Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '2rem', width: '2rem', border: '2px solid #0ea5e9', borderTopColor: 'transparent', margin: '0 auto 1rem' }}></div>
                  <p style={{ color: '#6b7280' }}>Loading loans...</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Loan Details</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Progress</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Completion</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                            No loans found
                          </td>
                        </tr>
                      ) : (
                        loans.map((loan) => {
                          const statusColor = getStatusColor(loan.status);
                          const progress = calculateProgress(loan);
                          
                          return (
                            <tr key={loan.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                    {loan.staff.fullName}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {loan.staff.employeeId} • {loan.reason.substring(0, 20)}...
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                    Total: {formatCurrency(loan.amount)}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    Monthly: {formatCurrency(loan.monthlyDeduction)}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    Paid: {formatCurrency(loan.amount - loan.outstandingBalance)}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: loan.outstandingBalance > 0 ? '#dc2626' : '#10b981' }}>
                                    Left: {formatCurrency(loan.outstandingBalance)}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                    {loan.installmentsPaid}/{loan.repaymentTerms} payments
                                  </div>
                                  <div style={{ width: '100px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        backgroundColor: loan.status === 'COMPLETED' ? '#10b981' : '#0ea5e9',
                                        transition: 'width 0.3s ease'
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                                    {calculateCompletionDate(loan)}
                                  </div>
                                  {loan.startDate && (
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                      Started: {formatDate(loan.startDate)}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.75rem',
                                      fontWeight: '500',
                                      color: statusColor.text,
                                      backgroundColor: statusColor.bg
                                    }}
                                  >
                                    {loan.status}
                                  </span>
                                  {loan.isPaused && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          padding: '0.25rem 0.5rem',
                                          borderRadius: '0.375rem',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          color: '#f59e0b',
                                          backgroundColor: '#fef3c7'
                                        }}
                                      >
                                        PAUSED
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => handleViewLoanDetails(loan.id)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      backgroundColor: '#0ea5e9',
                                      color: 'white',
                                      borderRadius: '0.25rem',
                                      fontSize: '0.75rem',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleUpdateLoanStatus(loan)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      backgroundColor: '#f59e0b',
                                      color: 'white',
                                      borderRadius: '0.25rem',
                                      fontSize: '0.75rem',
                                      border: 'none',
                                      cursor: 'pointer',
                                      marginRight: '0.5rem'
                                    }}
                                  >
                                    Update Status
                                  </button>
                                  {loan.status === 'APPROVED' && (
                                    <button
                                      onClick={() => handlePauseResume(loan)}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: loan.isPaused ? '#10b981' : '#f59e0b',
                                        color: 'white',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {loan.isPaused ? 'Resume' : 'Pause'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: pagination.hasPrev ? '#0ea5e9' : '#e5e7eb',
                    color: pagination.hasPrev ? 'white' : '#9ca3af',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: pagination.hasPrev ? 'pointer' : 'not-allowed'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: pagination.hasNext ? '#0ea5e9' : '#e5e7eb',
                    color: pagination.hasNext ? 'white' : '#9ca3af',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: pagination.hasNext ? 'pointer' : 'not-allowed'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                Create New Loan
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Register a new loan application for an employee
              </p>
            </div>

            <form onSubmit={handleCreateLoan} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Employee *
                  </label>
                  <select
                    value={createForm.staffId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, staffId: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="">Select Employee</option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} ({staff.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Loan Amount (₦) *
                  </label>
                  <input
                    type="number"
                    value={createForm.amount}
                    onChange={(e) => {
                      const amount = e.target.value;
                      setCreateForm(prev => ({ 
                        ...prev, 
                        amount,
                        // Auto-calculate monthly installment if terms are set
                        monthlyInstallment: amount && prev.repaymentTerms ? (parseFloat(amount) / parseInt(prev.repaymentTerms)).toFixed(2) : prev.monthlyInstallment
                      }));
                    }}
                    required
                    min="1"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Loan Reason *
                </label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Enter the reason for the loan..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Repayment Terms (months) *
                  </label>
                  <input
                    type="number"
                    value={createForm.repaymentTerms}
                    onChange={(e) => {
                      const terms = e.target.value;
                      setCreateForm(prev => ({ 
                        ...prev, 
                        repaymentTerms: terms,
                        // Auto-calculate monthly installment if amount is set
                        monthlyInstallment: prev.amount && terms ? (parseFloat(prev.amount) / parseInt(terms)).toFixed(2) : prev.monthlyInstallment
                      }));
                    }}
                    required
                    min="1"
                    max="60"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Monthly Installment (₦) *
                  </label>
                  <input
                    type="number"
                    value={createForm.monthlyInstallment}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, monthlyInstallment: e.target.value }))}
                    required
                    min="1"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Amount to be deducted from salary monthly
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Start Month of Deduction
                </label>
                <DatePicker
                  value={createForm.startDate}
                  onChange={(date) => setCreateForm(prev => ({ ...prev, startDate: date }))}
                  placeholder="Select start date for deductions"
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Leave empty to start deductions next month
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#0ea5e9',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Loan'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm({
                    staffId: '',
                    amount: '',
                    reason: '',
                    repaymentTerms: '12',
                    monthlyInstallment: '',
                    startDate: ''
                  })}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Loan Details Modal */}
      {showLoanDetails && selectedLoan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px -3px rgb(0 0 0 / 0.1)',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  Loan Details
                </h3>
                <button
                  onClick={() => setShowLoanDetails(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Loan Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Loan Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Employee</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {selectedLoan.staff.fullName} ({selectedLoan.staff.employeeId})
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Amount</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {formatCurrency(selectedLoan.amount)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Start Date</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {selectedLoan.startDate ? formatDate(selectedLoan.startDate) : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Repayment Terms</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {selectedLoan.repaymentTerms} months
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Monthly Deduction</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {formatCurrency(selectedLoan.monthlyDeduction)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Outstanding Balance</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#dc2626' }}>
                      {formatCurrency(selectedLoan.outstandingBalance)}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Reason</p>
                  <p style={{ fontSize: '0.875rem', color: '#111827' }}>{selectedLoan.reason}</p>
                </div>
                
                {selectedLoan.statusComments && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Status Comments</p>
                    <p style={{ fontSize: '0.875rem', color: '#111827' }}>{selectedLoan.statusComments}</p>
                    {selectedLoan.updatedByAdmin && (
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Updated by: {selectedLoan.updatedByAdmin.fullName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Repayment Form */}
              {selectedLoan.status === 'APPROVED' && selectedLoan.outstandingBalance > 0 && (
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                    Process Repayment
                  </h4>
                  <form onSubmit={handleProcessRepayment}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                          Amount (₦) *
                        </label>
                        <input
                          type="number"
                          value={repaymentForm.amount}
                          onChange={(e) => setRepaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                          required
                          min="1"
                          max={selectedLoan.outstandingBalance}
                          step="0.01"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                          Payment Method
                        </label>
                        <select
                          value={repaymentForm.paymentMethod}
                          onChange={(e) => setRepaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        >
                          <option value="MANUAL_PAYMENT">Manual Payment</option>
                          <option value="SALARY_DEDUCTION">Salary Deduction</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CASH">Cash</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                        Notes
                      </label>
                      <textarea
                        value={repaymentForm.notes}
                        onChange={(e) => setRepaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                        placeholder="Optional notes about this repayment..."
                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Process Repayment
                    </button>
                  </form>
                </div>
              )}

              {/* Repayment History */}
              {selectedLoan.repayments && selectedLoan.repayments.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                    Repayment History
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280' }}>Date</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280' }}>Amount</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280' }}>Method</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLoan.repayments.map((repayment) => (
                          <tr key={repayment.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#111827' }}>
                              {formatDate(repayment.paymentDate)}
                            </td>
                            <td style={{ padding: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                              {formatCurrency(repayment.amount)}
                            </td>
                            <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#111827' }}>
                              {repayment.paymentMethod.replace('_', ' ')}
                            </td>
                            <td style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                              {repayment.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedLoan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px -3px rgb(0 0 0 / 0.1)',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  Update Loan Status
                </h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  <strong>Employee:</strong> {selectedLoan.staff.fullName} ({selectedLoan.staff.employeeId})
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  <strong>Amount:</strong> {formatCurrency(selectedLoan.amount)}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <strong>Current Status:</strong> {selectedLoan.status}
                </p>
              </div>

              <form onSubmit={handleStatusUpdate}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    New Status *
                  </label>
                  <select
                    value={statusUpdateForm.status}
                    onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="">Select Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {statusUpdateForm.status === 'APPROVED' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Start Month of Deduction
                    </label>
                    <DatePicker
                      value={statusUpdateForm.startDate}
                      onChange={(date) => setStatusUpdateForm(prev => ({ ...prev, startDate: date }))}
                      placeholder="Select start date for deductions"
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Leave empty to start deductions next month
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Comments *
                  </label>
                  <textarea
                    value={statusUpdateForm.statusComments}
                    onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, statusComments: e.target.value }))}
                    required
                    rows={3}
                    placeholder="Enter comments about this status change..."
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#0ea5e9',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Update Status
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pause/Resume Modal */}
      {showPauseModal && selectedLoan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px -3px rgb(0 0 0 / 0.1)',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  {pauseForm.isPaused ? 'Pause' : 'Resume'} Loan Repayment
                </h3>
                <button
                  onClick={() => setShowPauseModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  <strong>Employee:</strong> {selectedLoan.staff.fullName} ({selectedLoan.staff.employeeId})
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  <strong>Loan Amount:</strong> {formatCurrency(selectedLoan.amount)}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <strong>Monthly Deduction:</strong> {formatCurrency(selectedLoan.monthlyDeduction)}
                </p>
              </div>

              <form onSubmit={handlePauseSubmit}>
                {pauseForm.isPaused && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Reason for Pausing *
                    </label>
                    <textarea
                      value={pauseForm.pauseReason}
                      onChange={(e) => setPauseForm(prev => ({ ...prev, pauseReason: e.target.value }))}
                      required
                      rows={3}
                      placeholder="Enter reason for pausing loan repayment..."
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowPauseModal(false)}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: pauseForm.isPaused ? '#f59e0b' : '#10b981',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {pauseForm.isPaused ? 'Pause Loan' : 'Resume Loan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagement;