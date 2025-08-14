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
  statistics?: {
    totalEmployees: number;
    departmentCounts: Record<string, number>;
    maxLevel: number;
    rootNodes: number;
  };
  totalEmployees?: number; // For flat view
}

// Interactive Canvas Component
interface InteractiveOrganogramCanvasProps {
  organogramData: OrganogramData;
  onClose: () => void;
}

const InteractiveOrganogramCanvas: React.FC<InteractiveOrganogramCanvasProps> = ({ organogramData, onClose }) => {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedCanvasNodes, setExpandedCanvasNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Auto-expand first level nodes
    if (organogramData.organogram) {
      const firstLevelIds = new Set<string>(organogramData.organogram.map((node: OrganogramNode) => node.id));
      setExpandedCanvasNodes(firstLevelIds);
    }
  }, [organogramData]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleCanvasNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set<string>(expandedCanvasNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedCanvasNodes(newExpanded);
  };

  const renderCanvasNode = (node: OrganogramNode, x: number, y: number, level: number = 0): JSX.Element => {
    const isExpanded = expandedCanvasNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const nodeWidth = 200;
    const nodeHeight = 80;
    const verticalSpacing = 120;
    const horizontalSpacing = 220;

    return (
      <g key={node.id}>
        {/* Connection lines to children */}
        {hasChildren && isExpanded && node.children.map((child, index) => {
          const childX = x + (index - (node.children.length - 1) / 2) * horizontalSpacing;
          const childY = y + verticalSpacing;
          
          return (
            <g key={`line-${child.id}`}>
              <line
                x1={x}
                y1={y + nodeHeight}
                x2={x}
                y2={y + verticalSpacing / 2}
                stroke="#6b7280"
                strokeWidth="2"
              />
              <line
                x1={x}
                y1={y + verticalSpacing / 2}
                x2={childX}
                y2={y + verticalSpacing / 2}
                stroke="#6b7280"
                strokeWidth="2"
              />
              <line
                x1={childX}
                y1={y + verticalSpacing / 2}
                x2={childX}
                y2={childY}
                stroke="#6b7280"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Node */}
        <g transform={`translate(${x - nodeWidth/2}, ${y})`}>
          <rect
            width={nodeWidth}
            height={nodeHeight}
            rx="8"
            fill="white"
            stroke="#e5e7eb"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
          
          {/* Expand/Collapse button */}
          {hasChildren && (
            <circle
              cx={nodeWidth - 15}
              cy={15}
              r="10"
              fill="#0ea5e9"
              style={{ cursor: 'pointer' }}
              onClick={() => toggleCanvasNodeExpansion(node.id)}
            />
          )}
          {hasChildren && (
            <text
              x={nodeWidth - 15}
              y={20}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleCanvasNodeExpansion(node.id)}
            >
              {isExpanded ? '−' : '+'}
            </text>
          )}

          {/* Avatar */}
          <circle
            cx={25}
            cy={25}
            r="15"
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <text
            x={25}
            y={30}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="10"
            fontWeight="bold"
          >
            {node.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </text>

          {/* Name */}
          <text
            x={50}
            y={20}
            fill="#111827"
            fontSize="12"
            fontWeight="600"
          >
            {node.fullName.length > 20 ? node.fullName.substring(0, 20) + '...' : node.fullName}
          </text>

          {/* Job Title */}
          <text
            x={50}
            y={35}
            fill="#6b7280"
            fontSize="10"
          >
            {node.jobTitle && node.jobTitle.length > 25 ? node.jobTitle.substring(0, 25) + '...' : node.jobTitle}
          </text>

          {/* Department */}
          <text
            x={50}
            y={50}
            fill="#9ca3af"
            fontSize="9"
          >
            {node.department}
          </text>

          {/* Employee ID */}
          <text
            x={50}
            y={65}
            fill="#9ca3af"
            fontSize="8"
          >
            {node.employeeId}
          </text>
        </g>

        {/* Render children */}
        {hasChildren && isExpanded && node.children.map((child, index) => {
          const childX = x + (index - (node.children.length - 1) / 2) * horizontalSpacing;
          const childY = y + verticalSpacing;
          return renderCanvasNode(child, childX, childY, level + 1);
        })}
      </g>
    );
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const expandAllCanvas = () => {
    if (!organogramData) return;
    const allNodeIds = new Set<string>();
    
    const collectNodeIds = (nodes: OrganogramNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children && node.children.length > 0) {
          collectNodeIds(node.children);
        }
      });
    };
    
    collectNodeIds(organogramData.organogram);
    setExpandedCanvasNodes(allNodeIds);
  };

  const collapseAllCanvas = () => {
    setExpandedCanvasNodes(new Set<string>());
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
          Interactive Organizational Chart
        </h2>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
            style={{
              padding: '0.5rem',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            🔍+
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
            style={{
              padding: '0.5rem',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            🔍-
          </button>
          <button
            onClick={resetView}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Reset View
          </button>
          <button
            onClick={expandAllCanvas}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAllCanvas}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Collapse All
          </button>
          <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '1rem' }}>
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginLeft: '1rem'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#f9fafb',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {organogramData.organogram.map((rootNode, index) => {
            const startX = 400 + index * 500;
            const startY = 100;
            return renderCanvasNode(rootNode, startX, startY);
          })}
        </svg>

        {/* Instructions */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <div><strong>Instructions:</strong></div>
          <div>• Mouse wheel to zoom in/out</div>
          <div>• Click and drag to pan around</div>
          <div>• Click + or - buttons on nodes to expand/collapse</div>
        </div>
      </div>
    </div>
  );
};

const Organogram: React.FC = () => {
  const { logout } = useAuth();
  const [organogramData, setOrganogramData] = useState<OrganogramData | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffDetails | null>(null);
  const [showStaffDetails, setShowStaffDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showInteractiveView, setShowInteractiveView] = useState(false);
  const [shareableLink, setShareableLink] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);

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
      const response = await axios.get(`/organogram/staff/${staffId}`);
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



  const generateShareableLink = async () => {
    try {
      const response = await axios.post('/organogram/share');
      if (response.data.success) {
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/organogram/public/${response.data.data.shareId}`;
        setShareableLink(shareUrl);
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('Failed to generate shareable link:', error);
      alert('Failed to generate shareable link. Please try again.');
    }
  };

  const copyShareableLink = () => {
    navigator.clipboard.writeText(shareableLink).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link. Please copy manually.');
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

            {/* Interactive Controls */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowInteractiveView(true)}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🌐 HTML View
              </button>
              <button
                onClick={generateShareableLink}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🔗 Share Link
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {organogramData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Employees</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {viewMode === 'flat' ? (organogramData as any).totalEmployees : organogramData.statistics?.totalEmployees || 0}
              </div>
            </div>
            {viewMode === 'tree' && organogramData.statistics && (
              <>
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
              </>
            )}
            {viewMode === 'flat' && (
              <>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Departments</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                    {new Set(organogramData.organogram.map((node: any) => node.department || 'Unassigned')).size}
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Hierarchy Levels</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                    {Math.max(...organogramData.organogram.map((node: any) => node.level)) + 1}
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Top Level Positions</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                    {organogramData.organogram.filter((node: any) => node.level === 0).length}
                  </div>
                </div>
              </>
            )}
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

      {/* Interactive Canvas View Modal */}
      {showInteractiveView && organogramData && (
        <InteractiveOrganogramCanvas 
          organogramData={organogramData}
          onClose={() => setShowInteractiveView(false)}
        />
      )}

      {/* Share Link Modal */}
      {showShareModal && (
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
            width: '90%',
            padding: '2rem'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                Share Organogram
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                This link will be valid for 72 hours and allows public access to view the organizational chart.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Shareable Link:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#f9fafb'
                  }}
                />
                <button
                  onClick={copyShareableLink}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#0ea5e9',
                    color: 'white',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setShowShareModal(false)}
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organogram;