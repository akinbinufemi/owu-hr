import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { useToast } from '../components/ui/NotificationToast';
import axios from 'axios';

interface BackupFile {
  fileName: string;
  size: number;
  formattedSize: string;
  createdAt: string;
  modifiedAt: string;
  formattedCreatedAt: string;
  formattedModifiedAt: string;
  downloadUrl: string;
}

interface BackupStatus {
  system: {
    status: string;
    version: string;
    lastCheck: string;
  };
  database: {
    totalRecords: number;
    tables: { [key: string]: number };
  };
  backups: {
    totalFiles: number;
    totalSize: number;
    formattedTotalSize: string;
    oldestBackup: string | null;
    newestBackup: string | null;
  };
  recommendations: string[];
}

const BackupManagement: React.FC = () => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  // State
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Modals
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string>('');

  useEffect(() => {
    fetchBackups();
    fetchBackupStatus();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/backup/list');
      if (response.data.success) {
        setBackups(response.data.data.backups);
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupStatus = async () => {
    try {
      const response = await axios.get('/backup/status');
      if (response.data.success) {
        setBackupStatus(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch backup status:', err);
      // Don't show error for status - it's not critical
    }
  };

  const createBackup = async () => {
    try {
      setCreating(true);
      const response = await axios.post('/backup/create');
      if (response.data.success) {
        success(`Backup created successfully! ${response.data.data.totalRecords} records backed up.`);
        fetchBackups();
        fetchBackupStatus();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const response = await axios.get(`/backup/download/${fileName}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      success('Backup downloaded successfully');
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to download backup');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/json', 'application/zip'];
      const allowedExtensions = ['.json', '.zip'];
      
      const hasValidType = allowedTypes.includes(file.type);
      const hasValidExtension = allowedExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidType && !hasValidExtension) {
        error('Please select a valid backup file (.json or .zip)');
        return;
      }
      
      // Check file size (100MB limit)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        error('File size exceeds 100MB limit');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const restoreBackup = async () => {
    if (!selectedFile) {
      error('Please select a backup file');
      return;
    }

    if (!window.confirm(
      '⚠️ WARNING: This will completely replace all current data with the backup data. ' +
      'This action cannot be undone. Are you sure you want to continue?'
    )) {
      return;
    }

    try {
      setRestoring(true);
      const formData = new FormData();
      formData.append('backupFile', selectedFile);

      const response = await axios.post('/backup/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        success(
          `✅ Backup restored successfully! ${response.data.data.restoredRecords} records restored. ` +
          'The page will reload to reflect the changes.'
        );
        
        // Reload page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to restore backup');
    } finally {
      setRestoring(false);
      setShowRestoreModal(false);
      setSelectedFile(null);
    }
  };

  const deleteBackup = async (fileName: string) => {
    try {
      const response = await axios.delete(`/backup/${fileName}`);
      if (response.data.success) {
        success('Backup deleted successfully');
        fetchBackups();
        fetchBackupStatus();
      }
    } catch (err: any) {
      error(err.response?.data?.error?.message || 'Failed to delete backup');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const backupColumns = [
    {
      key: 'fileName',
      title: 'Backup File',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center">
          <span className="text-2xl mr-3">💾</span>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">
              {value.includes('_') ? `ID: ${value.split('_').pop()?.split('.')[0]}` : ''}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'formattedSize',
      title: 'Size',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-medium text-gray-700">{value}</span>
      )
    },
    {
      key: 'formattedCreatedAt',
      title: 'Created',
      sortable: true,
      render: (value: string, record: BackupFile) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">
            {new Date(record.createdAt).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: BackupFile) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => downloadBackup(record.fileName)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            📥 Download
          </button>
          <button
            onClick={() => {
              setDeleteTarget(record.fileName);
              setShowDeleteModal(true);
            }}
            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            🗑️ Delete
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading backup management..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backup & Restore</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage database backups and restore data
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {backupStatus && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              📊 System Status
            </button>
          )}
          <button
            onClick={() => setShowRestoreModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            📤 Restore Backup
          </button>
          <button
            onClick={createBackup}
            disabled={creating}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>💾 Create Backup</>
            )}
          </button>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Important:</strong> Backup and restore operations affect the entire database. 
              Always create a backup before performing a restore operation. Restore operations cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      {backupStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🗄️</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Database Records
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {backupStatus.database.totalRecords.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💾</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Backups
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {backupStatus.backups.totalFiles}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Storage Used
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {backupStatus.backups.formattedTotalSize}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {backupStatus && backupStatus.recommendations.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Recommendations</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  {backupStatus.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Available Backups</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {backups.length} backup{backups.length !== 1 ? 's' : ''} available
          </p>
        </div>
        
        {backups.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No backups</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first backup.</p>
            <div className="mt-6">
              <button
                onClick={createBackup}
                disabled={creating}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  <>💾 Create First Backup</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <DataTable
            data={backups}
            columns={backupColumns}
            rowKey="fileName"
            loading={loading}
          />
        )}
      </div>

      {/* Restore Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
          setSelectedFile(null);
        }}
        title="Restore Backup"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Warning</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>This will completely replace all current data. This action cannot be undone.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Backup File
            </label>
            <input
              type="file"
              accept=".json,.zip"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowRestoreModal(false);
                setSelectedFile(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={restoreBackup}
              disabled={!selectedFile || restoring}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {restoring ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Restoring...
                </>
              ) : (
                'Restore'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget('');
        }}
        title="Delete Backup"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete the backup "{deleteTarget}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteTarget('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteBackup(deleteTarget)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* System Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Backup System Status"
        size="lg"
      >
        {backupStatus && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">System Information</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Status:</dt>
                    <dd className="text-gray-900 capitalize">{backupStatus.system.status}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Version:</dt>
                    <dd className="text-gray-900">{backupStatus.system.version}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Last Check:</dt>
                    <dd className="text-gray-900">{new Date(backupStatus.system.lastCheck).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Backup Statistics</h4>
                <dl className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Total Files:</dt>
                    <dd className="text-gray-900">{backupStatus.backups.totalFiles}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Storage Used:</dt>
                    <dd className="text-gray-900">{backupStatus.backups.formattedTotalSize}</dd>
                  </div>
                  {backupStatus.backups.newestBackup && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Latest Backup:</dt>
                      <dd className="text-gray-900">{new Date(backupStatus.backups.newestBackup).toLocaleDateString()}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Database Tables</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(backupStatus.database.tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{table.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                    <span className="text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BackupManagement;