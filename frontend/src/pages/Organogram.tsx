import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface OrganogramNode {
  id: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  department: string;
  photo?: string;
  workEmail: string;
  reportingManagerId?: string;
  children: OrganogramNode[];
  level: number;
}

interface StaffDetails {
  id: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  department: string;
  photo?: string;
  workEmail: string;
  reportingManager?: {
    id: string;
    employeeId: string;
    fullName: string;
    jobTitle: string;
    department: string;
  };
  subordinates: {
    id: string;
    employeeId: string;
    fullName: string;
    jobTitle: string;
    department: string;
  }[];
}

interface OrganogramData {
  organogram: OrganogramNode[];
  statistics: {
    totalEmployees: number;
    departmentCounts: Record<string, number>;
    maxLevel: number;
    rootNodes: number;
  };
}

const Organogram: React.FC = () => {
  const { logout } = useAuth();
  const [organogramData, setOrganogramData] = useState<OrganogramData | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffDetails | null>(null);
  const [showStaffDetails, setShowStaffDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrganogram();
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrganogram = async () => {
    try {
      setLoading(true);
      const endpoint = viewMode === 'flat' ? '/organogram/flat' : '/organogram';
      const response = await axios.get(endpoint);
      if (response.data.success) {
        setOrganogramData(response.data.data);
        // Auto-expand first level
        if (viewMode === 'tree' && response.data.data.organogram) {
          const firstLevelIds = new Set<string>(response.data.data.organogram.map((node: OrganogramNode) => node.id));
          setExpandedNodes(firstLevelIds);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organogram:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDetails = async (staffId: string) => {
    try {
      const response = await axios.get(`/api/organogram/staff/${staffId}`);
      if (response.data.success) {
        setSelectedStaff(response.data.data);
        setShowStaffDetails(true);
      }
    } catch (error) {
      console.error('Failed to fetch staff details:', error);
    }
  };

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set<string>(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    if (!organogramData) return;
    const allNodeIds = new Set<string>();
    
    const collectNodeIds = (nodes: OrganogramNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children.length > 0) {
          collectNodeIds(node.children);
        }
      });
    };
    
    collectNodeIds(organogramData.organogram);
    setExpandedNodes(allNodeIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set<string>());
  };

  const renderTreeNode = (node: OrganogramNode, isLast: boolean = false, prefix: string = '') => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} style={{ marginLeft: node.level > 0 ? '2rem' : '0' }}>
        {/* Node */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            marginBottom: '0.5rem',
            cursor: 'pointer',
            border: `2px solid ${getDepartmentColor(node.department)}`,
            position: 'relative'
          }}
          onClick={() => fetchStaffDetails(node.id)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(node.id);
              }}
              style={{
                position: 'absolute',
                left: '-0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                backgroundColor: getDepartmentColor(node.department),
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}

          {/* Photo */}
          <div
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem',
              overflow: 'hidden'
            }}
          >
            {node.photo ? (
              <img
                src={node.photo}
                alt={node.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>
                {node.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
              {node.fullName}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              {node.jobTitle}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {node.employeeId} • {node.department}
            </div>
          </div>

          {/* Subordinate Count */}
          {hasChildren && (
            <div
              style={{
                backgroundColor: getDepartmentColor(node.department),
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              {node.children.length} {node.children.length === 1 ? 'report' : 'reports'}
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div style={{ marginLeft: '1rem', borderLeft: `2px solid ${getDepartmentColor(node.department)}`, paddingLeft: '1rem' }}>
            {node.children.map((child, index) => 
              renderTreeNode(child, index === node.children.length - 1, prefix + (isLast ? '  ' : '│ '))
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFlatView = () => {
    if (!organogramData) return null;

    const groupedByLevel = organogramData.organogram.reduce((acc: Record<number, OrganogramNode[]>, node: any) => {
      const level = node.level || 0;
      if (!acc[level]) acc[level] = [];
      acc[level].push(node);
      return acc;
    }, {});

    return (
      <div>
        {Object.entries(groupedByLevel)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([level, nodes]) => (
            <div key={level} style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                Level {level} {level === '0' ? '(Top Management)' : ''}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {nodes.map((node: any) => (
                  <div
                    key={node.id}
                    style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                      cursor: 'pointer',
                      border: `2px solid ${getDepartmentColor(node.department)}`
                    }}
                    onClick={() => fetchStaffDetails(node.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '50%',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '0.75rem',
                          overflow: 'hidden'
                        }}
                      >
                        {node.photo ? (
                          <img
                            src={node.photo}
                            alt={node.fullName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '1rem', color: '#6b7280' }}>
                            {node.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                          {node.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {node.employeeId}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#111827', marginBottom: '0.25rem' }}>
                      {node.jobTitle}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      {node.department}
                    </div>
                    {node.reportingManager && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        Reports to: {node.reportingManager.fullName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const getDepartmentColor = (department: string) => {
    const colors = {
      'Human Resources': '#0ea5e9',
      'Finance': '#10b981',
      'IT': '#8b5cf6',
      'Operations': '#f59e0b',
      'Marketing': '#ef4444',
      'Sales': '#06b6d4',
      'Administration': '#6b7280',
      'Management': '#1f2937'
    };
    return colors[department as keyof typeof colors] || '#6b7280';
  };



  const exportOrganogram = async (format: 'pdf' | 'png') => {
    try {
      // For now, we'll use the browser's print functionality
      // In a real implementation, you'd want to use a library like jsPDF or html2canvas
      if (format === 'pdf') {
        window.print();
      } else {
        // For PNG export, you could use html2canvas
        alert('PNG export functionality would be implemented with html2canvas library');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
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
            Organizational Chart
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            View the company's organizational structure and reporting relationships
          </p>
        </div>

        {/* Controls */}
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {/* View Mode Toggle */}
              <div style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', padding: '0.25rem' }}>
                <button
                  onClick={() => setViewMode('tree')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'tree' ? '#0ea5e9' : 'transparent',
                    color: viewMode === 'tree' ? 'white' : '#6b7280'
                  }}
                >
                  🌳 Tree View
                </button>
                <button
                  onClick={() => setViewMode('flat')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'flat' ? '#0ea5e9' : 'transparent',
                    color: viewMode === 'flat' ? 'white' : '#6b7280'
                  }}
                >
                  📋 Flat View
                </button>
              </div>

              {/* Tree Controls */}
              {viewMode === 'tree' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={expandAll}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* Export Controls */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => exportOrganogram('pdf')}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                📄 Export PDF
              </button>
              <button
                onClick={() => exportOrganogram('png')}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                🖼️ Export PNG
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {organogramData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Employees</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{organogramData.statistics.totalEmployees}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Departments</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{Object.keys(organogramData.statistics.departmentCounts).length}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Hierarchy Levels</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{organogramData.statistics.maxLevel}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Top Level Positions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{organogramData.statistics.rootNodes}</div>
            </div>
          </div>
        )}

        {/* Organogram Content */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '2rem', width: '2rem', border: '2px solid #0ea5e9', borderTopColor: 'transparent', margin: '0 auto 1rem' }}></div>
              <p style={{ color: '#6b7280' }}>Loading organizational chart...</p>
            </div>
          ) : organogramData ? (
            <div>
              {viewMode === 'tree' ? (
                <div>
                  {organogramData.organogram.map((node, index) => 
                    renderTreeNode(node, index === organogramData.organogram.length - 1)
                  )}
                </div>
              ) : (
                renderFlatView()
              )}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No organizational data available
            </div>
          )}
        </div>
      </main>

      {/* Staff Details Modal */}
      {showStaffDetails && selectedStaff && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  Staff Details
                </h3>
                <button
                  onClick={() => setShowStaffDetails(false)}
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
              {/* Staff Info */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <div
                  style={{
                    width: '4rem',
                    height: '4rem',
                    borderRadius: '50%',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem',
                    overflow: 'hidden'
                  }}
                >
                  {selectedStaff.photo ? (
                    <img
                      src={selectedStaff.photo}
                      alt={selectedStaff.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.5rem', color: '#6b7280' }}>
                      {selectedStaff.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                    {selectedStaff.fullName}
                  </h4>
                  <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    {selectedStaff.jobTitle}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                    {selectedStaff.employeeId} • {selectedStaff.department}
                  </p>
                </div>
              </div>

              {/* Reporting Manager */}
              {selectedStaff.reportingManager && (
                <div style={{ marginBottom: '2rem' }}>
                  <h5 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
                    Reports To
                  </h5>
                  <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.375rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                      {selectedStaff.reportingManager.fullName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {selectedStaff.reportingManager.jobTitle} • {selectedStaff.reportingManager.department}
                    </div>
                  </div>
                </div>
              )}

              {/* Subordinates */}
              {selectedStaff.subordinates.length > 0 && (
                <div>
                  <h5 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
                    Direct Reports ({selectedStaff.subordinates.length})
                  </h5>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {selectedStaff.subordinates.map((subordinate) => (
                      <div key={subordinate.id} style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                          {subordinate.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {subordinate.jobTitle} • {subordinate.department}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organogram;