import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface FileRecord {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  isEncrypted: boolean;
  createdAt: string;
  staff?: {
    fullName: string;
    employeeId: string;
  };
  uploadedBy: string;
}

interface StaffOption {
  id: string;
  fullName: string;
  employeeId: string;
}

const FileManagement: React.FC = () => {
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    staffId: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [uploadForm, setUploadForm] = useState({
    category: 'documents',
    staffId: '',
    encrypt: false
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchFiles();
    fetchStaffOptions();
  }, [filters, pagination.page]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await axios.get(`/api/files?${params}`);
      if (response.data.success) {
        setFiles(response.data.data.files);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      // Add files
      Array.from(selectedFiles).forEach((file) => {
        formData.append('files', file);
      });

      // Add metadata
      formData.append('category', uploadForm.category);
      if (uploadForm.staffId) {
        formData.append('staffId', uploadForm.staffId);
      }
      formData.append('encrypt', uploadForm.encrypt.toString());

      const response = await axios.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const { uploadedFiles, errors } = response.data.data;
        
        let message = `Successfully uploaded ${uploadedFiles.length} file(s)`;
        if (errors && errors.length > 0) {
          message += `\\n\\nErrors:\\n${errors.map((e: any) => `${e.filename}: ${e.error}`).join('\\n')}`;
        }
        
        alert(message);
        
        // Reset form
        setSelectedFiles(null);
        setUploadForm({
          category: 'documents',
          staffId: '',
          encrypt: false
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Refresh file list
        fetchFiles();
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to upload files';
      alert(`Error: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await axios.get(`/api/files/${fileId}/download`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to download file';
      alert(`Error: ${message}`);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/files/${fileId}`);
      if (response.data.success) {
        alert('File deleted successfully');
        fetchFiles();
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to delete file';
      alert(`Error: ${message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getCategoryColor = (category: string) => {
    const colors = {
      'CV': '#0ea5e9',
      'OFFER_LETTER': '#10b981',
      'CONTRACT': '#8b5cf6',
      'PERFORMANCE_REVIEW': '#f59e0b',
      'TRAINING_CERTIFICATE': '#06b6d4',
      'OTHER': '#6b7280'
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'CV': 'CV/Resume',
      'OFFER_LETTER': 'Offer Letter',
      'CONTRACT': 'Contract',
      'PERFORMANCE_REVIEW': 'Performance Review',
      'TRAINING_CERTIFICATE': 'Training Certificate',
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
            File Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            Upload, manage, and organize staff documents securely
          </p>
        </div>

        {/* Upload Section */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
            Upload Files
          </h2>

          {/* Upload Form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Category
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              >
                <option value="CV">CV/Resume</option>
                <option value="OFFER_LETTER">Offer Letter</option>
                <option value="CONTRACT">Contract</option>
                <option value="PERFORMANCE_REVIEW">Performance Review</option>
                <option value="TRAINING_CERTIFICATE">Training Certificate</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Staff Member (Optional)
              </label>
              <select
                value={uploadForm.staffId}
                onChange={(e) => setUploadForm(prev => ({ ...prev, staffId: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              >
                <option value="">General Document</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="encrypt"
                checked={uploadForm.encrypt}
                onChange={(e) => setUploadForm(prev => ({ ...prev, encrypt: e.target.checked }))}
                style={{ width: '1rem', height: '1rem' }}
              />
              <label htmlFor="encrypt" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Encrypt sensitive files
              </label>
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? '#0ea5e9' : '#d1d5db'}`,
              borderRadius: '0.5rem',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: dragActive ? '#f0f9ff' : '#f9fafb',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <p style={{ fontSize: '1rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem' }}>
              {selectedFiles && selectedFiles.length > 0 
                ? `${selectedFiles.length} file(s) selected`
                : 'Drop files here or click to browse'
              }
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Supports: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT (Max 10MB per file)
            </p>
            {selectedFiles && selectedFiles.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {Array.from(selectedFiles).map((file, index) => (
                  <div key={index} style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>
                    {file.name} ({formatFileSize(file.size)})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFiles || selectedFiles.length === 0}
            style={{
              backgroundColor: uploading || !selectedFiles ? '#9ca3af' : '#0ea5e9',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: 'none',
              cursor: uploading || !selectedFiles ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? 'Uploading...' : '📤 Upload Files'}
          </button>
        </div>

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
                placeholder="Search by filename..."
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              />
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
                <option value="CV">CV/Resume</option>
                <option value="OFFER_LETTER">Offer Letter</option>
                <option value="CONTRACT">Contract</option>
                <option value="PERFORMANCE_REVIEW">Performance Review</option>
                <option value="TRAINING_CERTIFICATE">Training Certificate</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Staff Member
              </label>
              <select
                value={filters.staffId}
                onChange={(e) => setFilters(prev => ({ ...prev, staffId: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              >
                <option value="">All Staff</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Files Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '2rem', width: '2rem', border: '2px solid #0ea5e9', borderTopColor: 'transparent', margin: '0 auto 1rem' }}></div>
              <p style={{ color: '#6b7280' }}>Loading files...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>File</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Category</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Staff</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Size</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Uploaded</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                        No files found
                      </td>
                    </tr>
                  ) : (
                    files.map((file) => (
                      <tr key={file.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>
                              {file.mimeType.startsWith('image/') ? '🖼️' : 
                               file.mimeType === 'application/pdf' ? '📄' : 
                               file.mimeType.includes('word') ? '📝' : 
                               file.mimeType.includes('excel') || file.mimeType.includes('sheet') ? '📊' : '📄'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                {file.fileName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {file.mimeType}
                                {file.isEncrypted && (
                                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>
                                    🔒 Encrypted
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: 'white',
                              backgroundColor: getCategoryColor(file.category)
                            }}
                          >
                            {getCategoryLabel(file.category)}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          {file.staff ? (
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                {file.staff.fullName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {file.staff.employeeId}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>General</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                          {formatFileSize(file.fileSize)}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          {formatDate(file.createdAt)}
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleDownload(file.id, file.fileName)}
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
                              📥 Download
                            </button>
                            <button
                              onClick={() => handleDelete(file.id, file.fileName)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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
      </main>
    </div>
  );
};

export default FileManagement;