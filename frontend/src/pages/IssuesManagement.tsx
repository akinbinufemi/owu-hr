import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Issue {
  id: string;
  ticketNumber: string;
  staffId?: string;
  category: 'WORKPLACE_CONFLICT' | 'PAYROLL_DISCREPANCY' | 'POLICY_VIOLATION' | 'PERFORMANCE_ISSUE' | 'ATTENDANCE_ISSUE' | 'OTHER';
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  staff?: {
    id: string;
    fullName: string;
    employeeId: string;
    jobTitle: string;
    department: string;
  };
  admin: {
    id: string;
    fullName: string;
    email: string;
  };
  comments?: IssueComment[];
  _count?: {
    comments: number;
  };
}

interface IssueComment {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

interface IssuesSummary {
  statistics: {
    totalIssues: number;
    openIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    closedIssues: number;
  };
  categoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  recentIssues: Issue[];
}

interface StaffOption {
  id: string;
  fullName: string;
  employeeId: string;
  jobTitle: string;
  department: string;
}

const IssuesManagement: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'create'>('overview');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesSummary, setIssuesSummary] = useState<IssuesSummary | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    priority: ''
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
    category: 'OTHER',
    title: '',
    description: '',
    priority: 'MEDIUM'
  });
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showIssueDetails, setShowIssueDetails] = useState(false);
  const [commentForm, setCommentForm] = useState({
    content: ''
  });

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchIssuesSummary();
    } else if (activeTab === 'issues') {
      fetchIssues();
    } else if (activeTab === 'create') {
      fetchStaffOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, pagination.page]);

  const fetchIssuesSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/issues/summary');
      if (response.data.success) {
        setIssuesSummary(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch issues summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await axios.get(`/issues?${params}`);
      if (response.data.success) {
        setIssues(response.data.data.issues);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
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

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/issues', {
        ...createForm,
        staffId: createForm.staffId || null
      });

      if (response.data.success) {
        alert('Issue created successfully!');
        setCreateForm({
          staffId: '',
          category: 'OTHER',
          title: '',
          description: '',
          priority: 'MEDIUM'
        });
        setActiveTab('issues');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create issue';
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, status: string) => {
    try {
      const response = await axios.put(`/issues/${issueId}`, { status });
      if (response.data.success) {
        alert(`Issue status updated to ${status.toLowerCase().replace('_', ' ')} successfully!`);
        fetchIssues();
        if (selectedIssue?.id === issueId) {
          setSelectedIssue(response.data.data);
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to update issue';
      alert(`Error: ${message}`);
    }
  };

  const handleViewIssueDetails = async (issueId: string) => {
    try {
      const response = await axios.get(`/issues/${issueId}`);
      if (response.data.success) {
        setSelectedIssue(response.data.data);
        setShowIssueDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch issue details:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !commentForm.content.trim()) return;

    try {
      const response = await axios.post(`/issues/${selectedIssue.id}/comments`, {
        content: commentForm.content
      });

      if (response.data.success) {
        setCommentForm({ content: '' });
        // Refresh issue details to show new comment
        handleViewIssueDetails(selectedIssue.id);
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to add comment';
      alert(`Error: ${message}`);
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return { bg: '#fef3c7', text: '#92400e' };
      case 'IN_PROGRESS': return { bg: '#dbeafe', text: '#1e40af' };
      case 'RESOLVED': return { bg: '#d1fae5', text: '#065f46' };
      case 'CLOSED': return { bg: '#f3f4f6', text: '#374151' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return { bg: '#d1fae5', text: '#065f46' };
      case 'MEDIUM': return { bg: '#fef3c7', text: '#92400e' };
      case 'HIGH': return { bg: '#fed7aa', text: '#9a3412' };
      case 'CRITICAL': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'WORKPLACE_CONFLICT': 'Workplace Conflict',
      'PAYROLL_DISCREPANCY': 'Payroll Discrepancy',
      'POLICY_VIOLATION': 'Policy Violation',
      'PERFORMANCE_ISSUE': 'Performance Issue',
      'ATTENDANCE_ISSUE': 'Attendance Issue',
      'OTHER': 'Other'
    };
    return labels[category as keyof typeof labels] || category;
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
            Issues & Grievance Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            Track and manage staff issues, grievances, and support tickets
          </p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <nav style={{ display: 'flex', gap: '2rem' }}>
              {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'issues', label: 'All Issues', icon: '🎫' },
                { key: 'create', label: 'Create Issue', icon: '➕' }
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
        {activeTab === 'overview' && issuesSummary && (
          <div>
            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Issues</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>{issuesSummary.statistics.totalIssues}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>🎫</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Open Issues</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{issuesSummary.statistics.openIssues}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>🔓</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>In Progress</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#0ea5e9' }}>{issuesSummary.statistics.inProgressIssues}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>⚡</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Resolved</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{issuesSummary.statistics.resolvedIssues}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>✅</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Closed</p>
                    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#6b7280' }}>{issuesSummary.statistics.closedIssues}</p>
                  </div>
                  <div style={{ fontSize: '2rem' }}>🔒</div>
                </div>
              </div>
            </div>

            {/* Recent Issues */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  Recent Issues
                </h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Ticket</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Staff</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Priority</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuesSummary.recentIssues.map((issue) => {
                      const statusColor = getStatusColor(issue.status);
                      const priorityColor = getPriorityColor(issue.priority);
                      return (
                        <tr key={issue.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                            {issue.ticketNumber}
                          </td>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                            {issue.title.length > 40 ? issue.title.substring(0, 37) + '...' : issue.title}
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            {issue.staff ? (
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                  {issue.staff.fullName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {issue.staff.employeeId}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Anonymous</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: priorityColor.text,
                                backgroundColor: priorityColor.bg
                              }}
                            >
                              {issue.priority}
                            </span>
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
                              {issue.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {formatDate(issue.createdAt)}
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

        {activeTab === 'issues' && (
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
                    placeholder="Search by title, ticket number, or staff..."
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
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="">All Categories</option>
                    <option value="WORKPLACE_CONFLICT">Workplace Conflict</option>
                    <option value="PAYROLL_DISCREPANCY">Payroll Discrepancy</option>
                    <option value="POLICY_VIOLATION">Policy Violation</option>
                    <option value="PERFORMANCE_ISSUE">Performance Issue</option>
                    <option value="ATTENDANCE_ISSUE">Attendance Issue</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Priority
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Issues Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '2rem', width: '2rem', border: '2px solid #0ea5e9', borderTopColor: 'transparent', margin: '0 auto 1rem' }}></div>
                  <p style={{ color: '#6b7280' }}>Loading issues...</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Ticket</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Issue</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Staff</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Priority</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                            No issues found
                          </td>
                        </tr>
                      ) : (
                        issues.map((issue) => {
                          const statusColor = getStatusColor(issue.status);
                          const priorityColor = getPriorityColor(issue.priority);

                          return (
                            <tr key={issue.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                  {issue.ticketNumber}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {getCategoryLabel(issue.category)}
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', marginBottom: '0.25rem' }}>
                                    {issue.title.length > 30 ? issue.title.substring(0, 27) + '...' : issue.title}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {issue._count?.comments || 0} comments
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                {issue.staff ? (
                                  <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                      {issue.staff.fullName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                      {issue.staff.employeeId}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Anonymous</span>
                                )}
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    color: priorityColor.text,
                                    backgroundColor: priorityColor.bg
                                  }}
                                >
                                  {issue.priority}
                                </span>
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
                                  {issue.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '1rem 0.75rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => handleViewIssueDetails(issue.id)}
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
                                  {issue.status === 'OPEN' && (
                                    <button
                                      onClick={() => handleUpdateIssueStatus(issue.id, 'IN_PROGRESS')}
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
                                      Start
                                    </button>
                                  )}
                                  {issue.status === 'IN_PROGRESS' && (
                                    <button
                                      onClick={() => handleUpdateIssueStatus(issue.id, 'RESOLVED')}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Resolve
                                    </button>
                                  )}
                                  {issue.status === 'RESOLVED' && (
                                    <button
                                      onClick={() => handleUpdateIssueStatus(issue.id, 'CLOSED')}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Close
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
                Create New Issue
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Report a new issue or grievance for tracking and resolution
              </p>
            </div>

            <form onSubmit={handleCreateIssue} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Staff Member (Optional)
                  </label>
                  <select
                    value={createForm.staffId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, staffId: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="">Anonymous Issue</option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} ({staff.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Category *
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    <option value="WORKPLACE_CONFLICT">Workplace Conflict</option>
                    <option value="PAYROLL_DISCREPANCY">Payroll Discrepancy</option>
                    <option value="POLICY_VIOLATION">Policy Violation</option>
                    <option value="PERFORMANCE_ISSUE">Performance Issue</option>
                    <option value="ATTENDANCE_ISSUE">Attendance Issue</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Issue Title *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="Brief description of the issue..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Detailed Description *
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  placeholder="Provide detailed information about the issue, including when it occurred, who was involved, and any relevant context..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Priority Level
                </label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                >
                  <option value="LOW">Low - Minor issue, can wait</option>
                  <option value="MEDIUM">Medium - Normal priority</option>
                  <option value="HIGH">High - Needs attention soon</option>
                  <option value="CRITICAL">Critical - Urgent, needs immediate attention</option>
                </select>
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
                  {loading ? 'Creating...' : 'Create Issue'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm({
                    staffId: '',
                    category: 'OTHER',
                    title: '',
                    description: '',
                    priority: 'MEDIUM'
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

      {/* Issue Details Modal */}
      {showIssueDetails && selectedIssue && (
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
                  Issue Details - {selectedIssue.ticketNumber}
                </h3>
                <button
                  onClick={() => setShowIssueDetails(false)}
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
              {/* Issue Information */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: getStatusColor(selectedIssue.status).text,
                      backgroundColor: getStatusColor(selectedIssue.status).bg
                    }}
                  >
                    {selectedIssue.status.replace('_', ' ')}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: getPriorityColor(selectedIssue.priority).text,
                      backgroundColor: getPriorityColor(selectedIssue.priority).bg
                    }}
                  >
                    {selectedIssue.priority} Priority
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: '#374151',
                      backgroundColor: '#f3f4f6'
                    }}
                  >
                    {getCategoryLabel(selectedIssue.category)}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  {selectedIssue.title}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Reporter</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {selectedIssue.staff ? `${selectedIssue.staff.fullName} (${selectedIssue.staff.employeeId})` : 'Anonymous'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Assigned To</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {selectedIssue.admin.fullName}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Created</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {formatDate(selectedIssue.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Last Updated</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {formatDate(selectedIssue.updatedAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Description</p>
                  <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#111827', lineHeight: '1.5' }}>
                    {selectedIssue.description}
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <h5 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Comments ({selectedIssue.comments?.length || 0})
                </h5>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <textarea
                      value={commentForm.content}
                      onChange={(e) => setCommentForm({ content: e.target.value })}
                      placeholder="Add a comment..."
                      rows={3}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!commentForm.content.trim()}
                    style={{
                      backgroundColor: commentForm.content.trim() ? '#0ea5e9' : '#e5e7eb',
                      color: commentForm.content.trim() ? 'white' : '#9ca3af',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: commentForm.content.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Add Comment
                  </button>
                </form>

                {/* Comments List */}
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedIssue.comments && selectedIssue.comments.length > 0 ? (
                    selectedIssue.comments.map((comment) => (
                      <div key={comment.id} style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                            Admin
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#111827', lineHeight: '1.5' }}>
                          {comment.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                      No comments yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssuesManagement;