import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

interface PublicOrganogramData {
  organogram: OrganogramNode[];
  statistics: {
    totalEmployees: number;
    departmentCounts: Record<string, number>;
    maxLevel: number;
    rootNodes: number;
  };
  shareInfo: {
    createdAt: string;
    expiresAt: string;
  };
}

const PublicOrganogram: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [organogramData, setOrganogramData] = useState<PublicOrganogramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSharedOrganogram();
  }, [shareId]);

  const fetchSharedOrganogram = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/organogram/public/${shareId}`);
      if (response.data.success) {
        setOrganogramData(response.data.data);
        // Auto-expand first level
        const firstLevelIds = new Set<string>(response.data.data.organogram.map((node: OrganogramNode) => node.id));
        setExpandedNodes(firstLevelIds);
      }
    } catch (error: any) {
      console.error('Failed to fetch shared organogram:', error);
      if (error.response?.status === 404) {
        setError('This shared link was not found or has been removed.');
      } else if (error.response?.status === 410) {
        setError('This shared link has expired.');
      } else {
        setError('Failed to load the organizational chart. Please try again later.');
      }
    } finally {
      setLoading(false);
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

  const renderTreeNode = (node: OrganogramNode, isLast: boolean = false) => {
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
            border: `2px solid ${getDepartmentColor(node.department)}`,
            position: 'relative'
          }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => toggleNodeExpansion(node.id)}
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
              renderTreeNode(child, index === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '3rem', width: '3rem', border: '3px solid #0ea5e9', borderTopColor: 'transparent', margin: '0 auto 1rem' }}></div>
          <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>Loading organizational chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔗</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            Link Issue
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            {error}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: '#0ea5e9',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
                Owu Palace HRMS
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Public Organizational Chart
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Shared on: {organogramData && formatDate(organogramData.shareInfo.createdAt)}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                Expires: {organogramData && formatDate(organogramData.shareInfo.expiresAt)}
              </p>
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
            Company organizational structure and reporting relationships
          </p>
        </div>

        {/* Controls */}
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          {organogramData ? (
            <div>
              {organogramData.organogram.map((node, index) => 
                renderTreeNode(node, index === organogramData.organogram.length - 1)
              )}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No organizational data available
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
          <p>This is a shared view of the organizational chart.</p>
          <p>For full access and management features, please contact your system administrator.</p>
        </div>
      </main>
    </div>
  );
};

export default PublicOrganogram;