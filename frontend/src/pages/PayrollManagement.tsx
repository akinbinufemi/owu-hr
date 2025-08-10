import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface PayrollSchedule {
  id: string;
  month: number;
  year: number;
  totalAmount: number;
  generatedAt: string;
  staffData?: any[];
}

interface SalaryStructure {
  id: string;
  staffId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  taxDeduction: number;
  pensionDeduction: number;
  loanDeduction: number;
  effectiveDate: string;
  isActive: boolean;
  staff: {
    id: string;
    fullName: string;
    employeeId: string;
    jobTitle: string;
    department: string;
    isExternallyPaid: boolean;
  };
}

const PayrollManagement: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedules' | 'structures' | 'generate'>('schedules');
  const [payrollSchedules, setPayrollSchedules] = useState<PayrollSchedule[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (activeTab === 'schedules') {
      fetchPayrollSchedules();
    } else if (activeTab === 'structures') {
      fetchSalaryStructures();
    }
  }, [activeTab]);

  const fetchPayrollSchedules = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/payroll/schedules');
      if (response.data.success) {
        setPayrollSchedules(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payroll schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryStructures = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/payroll/structures');
      if (response.data.success) {
        setSalaryStructures(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch salary structures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/payroll/generate', generateForm);
      if (response.data.success) {
        alert(`Payroll generated successfully! Total: ₦${response.data.data.totalAmount.toLocaleString()}`);
        fetchPayrollSchedules();
        setActiveTab('schedules');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to generate payroll';
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (scheduleId: string, month: number, year: number) => {
    try {
      const response = await axios.get(`/payroll/schedules/${scheduleId}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-${getMonthName(month)}-${year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const getMonthName = (month: number) => {
    const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            Payroll Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            Manage salary structures and generate payroll schedules
          </p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <nav style={{ display: 'flex', gap: '2rem' }}>
              {[
                { key: 'schedules', label: 'Payroll Schedules', icon: '📊' },
                { key: 'structures', label: 'Salary Structures', icon: '💰' },
                { key: 'generate', label: 'Generate Payroll', icon: '⚡' }
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
        {activeTab === 'schedules' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                Payroll Schedules
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                View and download generated payroll schedules
              </p>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '2rem', width: '2rem', border: '2px solid #0ea5e9', borderTopColor: 'transparent', margin: '0 auto 1rem' }}></div>
                <p style={{ color: '#6b7280' }}>Loading payroll schedules...</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Period
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Total Amount
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Generated
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                          No payroll schedules found
                        </td>
                      </tr>
                    ) : (
                      payrollSchedules.map((schedule) => (
                        <tr key={schedule.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                            {getMonthName(schedule.month)} {schedule.year}
                          </td>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                            {formatCurrency(schedule.totalAmount)}
                          </td>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatDate(schedule.generatedAt)}
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <button
                              onClick={() => handleDownloadPDF(schedule.id, schedule.month, schedule.year)}
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              📄 Download PDF
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'structures' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                Salary Structures
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                View and manage employee salary structures
              </p>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '2rem', width: '2rem', border: '2px solid #0ea5e9', borderTopColor: 'transparent', margin: '0 auto 1rem' }}></div>
                <p style={{ color: '#6b7280' }}>Loading salary structures...</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Employee
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Basic Salary
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Allowances
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Deductions
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryStructures.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                          No salary structures found
                        </td>
                      </tr>
                    ) : (
                      salaryStructures.map((structure) => {
                        const totalAllowances = structure.housingAllowance + structure.transportAllowance + structure.medicalAllowance;
                        const totalDeductions = structure.taxDeduction + structure.pensionDeduction + structure.loanDeduction;
                        
                        return (
                          <tr key={structure.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                  {structure.staff.fullName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {structure.staff.employeeId} • {structure.staff.jobTitle}
                                </div>
                                {structure.staff.isExternallyPaid && (
                                  <span style={{ 
                                    display: 'inline-block', 
                                    marginTop: '0.25rem',
                                    padding: '0.125rem 0.375rem', 
                                    backgroundColor: '#fbbf24', 
                                    color: 'white', 
                                    borderRadius: '0.25rem', 
                                    fontSize: '0.625rem', 
                                    fontWeight: '500' 
                                  }}>
                                    External
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                              {formatCurrency(structure.basicSalary)}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                              {formatCurrency(totalAllowances)}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                              {formatCurrency(totalDeductions)}
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: structure.isActive ? '#065f46' : '#991b1b',
                                  backgroundColor: structure.isActive ? '#d1fae5' : '#fee2e2'
                                }}
                              >
                                {structure.isActive ? 'Active' : 'Inactive'}
                              </span>
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
        )}

        {activeTab === 'generate' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                Generate Payroll
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Generate monthly payroll schedule for all active staff members
              </p>
            </div>

            <div style={{ maxWidth: '400px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Month
                  </label>
                  <select
                    value={generateForm.month}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Year
                  </label>
                  <select
                    value={generateForm.year}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.375rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem' }}>
                  ℹ️ Important Notes:
                </h3>
                <ul style={{ fontSize: '0.875rem', color: '#0c4a6e', listStyle: 'disc', paddingLeft: '1.25rem', margin: 0 }}>
                  <li>Only active staff with salary structures will be included</li>
                  <li>Externally paid staff will be excluded from the payroll</li>
                  <li>Loan deductions will be automatically calculated and applied</li>
                  <li>This action cannot be undone once generated</li>
                </ul>
              </div>

              <button
                onClick={handleGeneratePayroll}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: loading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? (
                  <>
                    <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '1rem', width: '1rem', border: '2px solid white', borderTopColor: 'transparent' }}></div>
                    Generating...
                  </>
                ) : (
                  <>
                    ⚡ Generate Payroll for {getMonthName(generateForm.month)} {generateForm.year}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PayrollManagement;