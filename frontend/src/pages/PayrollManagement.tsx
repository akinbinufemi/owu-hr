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

  // Salary Structure Management State
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryStructure | null>(null);
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [salaryForm, setSalaryForm] = useState({
    staffId: '',
    basicSalary: '',
    housingAllowance: '',
    transportAllowance: '',
    medicalAllowance: '',
    taxDeduction: '',
    pensionDeduction: '',
    loanDeduction: '',
    effectiveDate: new Date().toISOString().split('T')[0]
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

  const fetchStaffOptions = async () => {
    try {
      const response = await axios.get('/staff?limit=1000');
      if (response.data.success) {
        setStaffOptions(response.data.data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff options:', error);
    }
  };

  const handleCreateSalaryStructure = () => {
    setEditingSalary(null);
    setSalaryForm({
      staffId: '',
      basicSalary: '',
      housingAllowance: '',
      transportAllowance: '',
      medicalAllowance: '',
      taxDeduction: '',
      pensionDeduction: '',
      loanDeduction: '',
      effectiveDate: new Date().toISOString().split('T')[0]
    });
    setShowSalaryModal(true);
    fetchStaffOptions();
  };

  const handleEditSalaryStructure = (structure: SalaryStructure) => {
    setEditingSalary(structure);
    setSalaryForm({
      staffId: structure.staffId,
      basicSalary: structure.basicSalary.toString(),
      housingAllowance: structure.housingAllowance.toString(),
      transportAllowance: structure.transportAllowance.toString(),
      medicalAllowance: structure.medicalAllowance.toString(),
      taxDeduction: structure.taxDeduction.toString(),
      pensionDeduction: structure.pensionDeduction.toString(),
      loanDeduction: structure.loanDeduction.toString(),
      effectiveDate: structure.effectiveDate.split('T')[0]
    });
    setShowSalaryModal(true);
    fetchStaffOptions();
  };

  const handleSaveSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const data = {
        staffId: salaryForm.staffId,
        basicSalary: parseFloat(salaryForm.basicSalary),
        housingAllowance: parseFloat(salaryForm.housingAllowance) || 0,
        transportAllowance: parseFloat(salaryForm.transportAllowance) || 0,
        medicalAllowance: parseFloat(salaryForm.medicalAllowance) || 0,
        taxDeduction: parseFloat(salaryForm.taxDeduction) || 0,
        pensionDeduction: parseFloat(salaryForm.pensionDeduction) || 0,
        loanDeduction: parseFloat(salaryForm.loanDeduction) || 0,
        effectiveDate: new Date(salaryForm.effectiveDate).toISOString()
      };

      if (editingSalary) {
        const response = await axios.put(`/payroll/structures/${editingSalary.id}`, data);
        if (response.data.success) {
          alert('Salary structure updated successfully!');
        }
      } else {
        const response = await axios.post('/payroll/structures', data);
        if (response.data.success) {
          alert('Salary structure created successfully!');
        }
      }
      
      setShowSalaryModal(false);
      fetchSalaryStructures();
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to save salary structure';
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalaryStructure = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary structure?')) return;
    
    try {
      const response = await axios.delete(`/payroll/structures/${id}`);
      if (response.data.success) {
        alert('Salary structure deleted successfully!');
        fetchSalaryStructures();
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to delete salary structure';
      alert(`Error: ${message}`);
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
            <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  Salary Structures
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  View and manage employee salary structures
                </p>
              </div>
              <button
                onClick={handleCreateSalaryStructure}
                style={{
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ➕ Add Salary Structure
              </button>
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
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryStructures.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
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
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleEditSalaryStructure(structure)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#0ea5e9',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSalaryStructure(structure.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  🗑️ Delete
                                </button>
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

      {/* Salary Structure Modal */}
      {showSalaryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                {editingSalary ? 'Edit Salary Structure' : 'Add Salary Structure'}
              </h3>
              <button
                onClick={() => setShowSalaryModal(false)}
                style={{ fontSize: '1.5rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSalaryStructure}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Employee *
                  </label>
                  <select
                    value={salaryForm.staffId}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, staffId: e.target.value }))}
                    required
                    disabled={!!editingSalary}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="">Select Employee</option>
                    {staffOptions.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} ({staff.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Basic Salary *
                  </label>
                  <input
                    type="number"
                    value={salaryForm.basicSalary}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                    required
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Housing Allowance
                  </label>
                  <input
                    type="number"
                    value={salaryForm.housingAllowance}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, housingAllowance: e.target.value }))}
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Transport Allowance
                  </label>
                  <input
                    type="number"
                    value={salaryForm.transportAllowance}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, transportAllowance: e.target.value }))}
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Medical Allowance
                  </label>
                  <input
                    type="number"
                    value={salaryForm.medicalAllowance}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, medicalAllowance: e.target.value }))}
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Tax Deduction
                  </label>
                  <input
                    type="number"
                    value={salaryForm.taxDeduction}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, taxDeduction: e.target.value }))}
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Pension Deduction
                  </label>
                  <input
                    type="number"
                    value={salaryForm.pensionDeduction}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, pensionDeduction: e.target.value }))}
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    value={salaryForm.effectiveDate}
                    onChange={(e) => setSalaryForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: loading ? '#9ca3af' : '#0ea5e9',
                    color: 'white',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Saving...' : (editingSalary ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;