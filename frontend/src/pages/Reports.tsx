import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  parameters: string[];
  formats: string[];
}

interface ReportData {
  reportType: string;
  generatedAt: string;
  parameters: Record<string, any>;
  summary: Record<string, any>;
  data: any[];
}

const Reports: React.FC = () => {
  const { logout } = useAuth();
  const [availableReports, setAvailableReports] = useState<ReportDefinition[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reportParams, setReportParams] = useState({
    startDate: '',
    endDate: '',
    department: '',
    employmentType: '',
    format: 'json'
  });
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchAvailableReports();
    fetchDepartments();
  }, []);

  const fetchAvailableReports = async () => {
    try {
      const response = await axios.get('/reports');
      if (response.data.success) {
        setAvailableReports(response.data.data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch available reports:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/staff?limit=1000');
      if (response.data.success) {
        const departmentSet = new Set<string>(response.data.data.staff.map((s: any) => s.department));
        const uniqueDepartments = Array.from(departmentSet);
        setDepartments(uniqueDepartments.sort());
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleGenerateReport = async (format: string = 'json') => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    if (!reportParams.startDate || !reportParams.endDate) {
      alert('Please select start and end dates');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: reportParams.startDate,
        endDate: reportParams.endDate,
        format
      });

      if (reportParams.department) {
        params.append('department', reportParams.department);
      }

      if (reportParams.employmentType && selectedReport === 'headcount') {
        params.append('employmentType', reportParams.employmentType);
      }

      const response = await axios.get(`/api/reports/${selectedReport}?${params}`);

      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        alert('Report downloaded successfully!');
      } else {
        // Handle JSON response for preview
        if (response.data.success) {
          setReportData(response.data.data);
          setShowPreview(true);
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to generate report';
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      // Check if it looks like currency (large numbers)
      if (value > 1000) {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          minimumFractionDigits: 0
        }).format(value);
      }
      return value.toLocaleString();
    }
    if (typeof value === 'string' && value.includes('T')) {
      // Looks like a date
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }
    return String(value);
  };

  const renderSummarySection = (summary: Record<string, any>) => {
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
          Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.entries(summary).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return (
                <div key={key} style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.375rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  {Object.entries(value).map(([subKey, subValue]) => (
                    <div key={subKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#6b7280' }}>{subKey}:</span>
                      <span style={{ color: '#111827', fontWeight: '500' }}>{formatValue(subValue)}</span>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={key} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.375rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  {formatValue(value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDataTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No data available
        </div>
      );
    }

    const headers = Object.keys(data[0]);
    
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              {headers.map((header) => (
                <th key={header} style={{ 
                  padding: '0.75rem', 
                  textAlign: 'left', 
                  fontSize: '0.75rem', 
                  fontWeight: '500', 
                  color: '#6b7280', 
                  textTransform: 'uppercase',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {header.replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((row, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                {headers.map((header) => (
                  <td key={header} style={{ 
                    padding: '0.75rem', 
                    fontSize: '0.875rem', 
                    color: '#111827'
                  }}>
                    {formatValue(row[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
            Showing first 50 rows of {data.length} total records. Download CSV for complete data.
          </div>
        )}
      </div>
    );
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
            Reports & Analytics
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            Generate comprehensive reports on headcount, salary, loans, and issues
          </p>
        </div>

        {/* Report Generation Form */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
            Generate Report
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Report Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Report Type *
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              >
                <option value="">Select Report Type</option>
                {availableReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </select>
              {selectedReport && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {availableReports.find(r => r.id === selectedReport)?.description}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Start Date *
              </label>
              <input
                type="date"
                value={reportParams.startDate}
                onChange={(e) => setReportParams(prev => ({ ...prev, startDate: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                End Date *
              </label>
              <input
                type="date"
                value={reportParams.endDate}
                onChange={(e) => setReportParams(prev => ({ ...prev, endDate: e.target.value }))}
                min={reportParams.startDate}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              />
            </div>

            {/* Department Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Department (Optional)
              </label>
              <select
                value={reportParams.department}
                onChange={(e) => setReportParams(prev => ({ ...prev, department: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Employment Type (only for headcount report) */}
            {selectedReport === 'headcount' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Employment Type (Optional)
                </label>
                <select
                  value={reportParams.employmentType}
                  onChange={(e) => setReportParams(prev => ({ ...prev, employmentType: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                >
                  <option value="">All Types</option>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleGenerateReport('json')}
              disabled={loading || !selectedReport}
              style={{
                backgroundColor: loading || !selectedReport ? '#9ca3af' : '#0ea5e9',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: 'none',
                cursor: loading || !selectedReport ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Generating...' : '📊 Preview Report'}
            </button>

            <button
              onClick={() => handleGenerateReport('csv')}
              disabled={loading || !selectedReport}
              style={{
                backgroundColor: loading || !selectedReport ? '#9ca3af' : '#10b981',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: 'none',
                cursor: loading || !selectedReport ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Generating...' : '📥 Download CSV'}
            </button>
          </div>
        </div>

        {/* Report Preview */}
        {showPreview && reportData && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                  {reportData.reportType}
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Generated on {new Date(reportData.generatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close Preview
              </button>
            </div>

            {/* Report Parameters */}
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                Report Parameters
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {Object.entries(reportData.parameters).map(([key, value]) => (
                  <div key={key}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500', marginLeft: '0.5rem' }}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Section */}
            {renderSummarySection(reportData.summary)}

            {/* Data Table */}
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                Detailed Data ({reportData.data.length} records)
              </h3>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', overflow: 'hidden' }}>
                {renderDataTable(reportData.data)}
              </div>
            </div>
          </div>
        )}

        {/* Available Reports Info */}
        {!showPreview && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
              Available Reports
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {availableReports.map((report) => (
                <div key={report.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                    {report.name}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                    {report.description}
                  </p>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      Parameters
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {report.parameters.map((param) => (
                        <span key={param} style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem'
                        }}>
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      Formats
                    </h4>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {report.formats.map((format) => (
                        <span key={format} style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem'
                        }}>
                          {format.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;