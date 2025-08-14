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

// Interactive Canvas Component for Public View
interface InteractiveOrganogramCanvasProps {
  organogramData: PublicOrganogramData;
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
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
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

  const renderCanvasNode = (node: OrganogramNode, x: number, y: number, level: number = 0): React.ReactElement => {
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
        padding: '0.5rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <h2 style={{ 
          fontSize: window.innerWidth < 768 ? '1rem' : '1.25rem', 
          fontWeight: '600', 
          color: '#111827',
          margin: 0
        }}>
          Interactive Organizational Chart
        </h2>
        
        <div style={{ 
          display: 'flex', 
          gap: window.innerWidth < 768 ? '0.25rem' : '0.5rem', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
            style={{
              padding: window.innerWidth < 768 ? '0.75rem' : '0.5rem',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: window.innerWidth < 768 ? '1.2rem' : '1rem',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            🔍+
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
            style={{
              padding: window.innerWidth < 768 ? '0.75rem' : '0.5rem',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: window.innerWidth < 768 ? '1.2rem' : '1rem',
              minWidth: '44px',
              minHeight: '44px'
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
            Reset
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${(canvasRef.current?.clientWidth || 800) / zoom} ${(canvasRef.current?.clientHeight || 600) / zoom}`}
          style={{
            overflow: 'visible'
          }}
        >
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
            </pattern>
          </defs>
          
          {/* Large background grid */}
          <rect 
            x={-10000} 
            y={-10000} 
            width={20000} 
            height={20000} 
            fill="url(#grid)" 
          />
          
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
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          fontSize: window.innerWidth < 768 ? '0.75rem' : '0.875rem',
          color: '#6b7280',
          maxWidth: window.innerWidth < 768 ? '200px' : 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div><strong>Controls:</strong></div>
          <div>• Mouse wheel / Pinch to zoom</div>
          <div>• Click & drag / Touch & drag to pan</div>
          <div>• Click + or - on nodes to expand/collapse</div>
          <div>• Use control buttons above</div>
        </div>
      </div>
    </div>
  );
};

const PublicOrganogram: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [organogramData, setOrganogramData] = useState<PublicOrganogramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showInteractiveView, setShowInteractiveView] = useState(false);

  useEffect(() => {
    fetchSharedOrganogram();
  }, [shareId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
              🌐 Interactive View
            </button>
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

      {/* Interactive Canvas View Modal */}
      {showInteractiveView && organogramData && (
        <InteractiveOrganogramCanvas 
          organogramData={organogramData}
          onClose={() => setShowInteractiveView(false)}
        />
      )}
    </div>
  );
};

export default PublicOrganogram;