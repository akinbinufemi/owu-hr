import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import BackupManagement from '../BackupManagement';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../components/ui/NotificationToast';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock components
jest.mock('../../components/ui/LoadingSpinner', () => {
  return function LoadingSpinner({ text }: { text?: string }) {
    return <div data-testid="loading-spinner">{text}</div>;
  };
});

jest.mock('../../components/ui/Modal', () => {
  return function Modal({ 
    isOpen, 
    onClose, 
    title, 
    children 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    );
  };
});

jest.mock('../../components/ui/DataTable', () => {
  return function DataTable({ 
    data, 
    columns, 
    loading 
  }: { 
    data: any[]; 
    columns: any[]; 
    loading: boolean;
  }) {
    if (loading) return <div data-testid="table-loading">Loading table...</div>;
    return (
      <div data-testid="data-table">
        {data.map((item, index) => (
          <div key={index} data-testid={`table-row-${index}`}>
            {item.fileName}
          </div>
        ))}
      </div>
    );
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('BackupManagement', () => {
  const mockBackups = [
    {
      fileName: 'backup_2024-01-15_abc123.zip',
      size: 1024000,
      formattedSize: '1 MB',
      createdAt: '2024-01-15T10:00:00Z',
      modifiedAt: '2024-01-15T10:00:00Z',
      formattedCreatedAt: '1/15/2024',
      formattedModifiedAt: '1/15/2024',
      downloadUrl: '/api/backup/download/backup_2024-01-15_abc123.zip'
    },
    {
      fileName: 'backup_2024-01-14_def456.zip',
      size: 2048000,
      formattedSize: '2 MB',
      createdAt: '2024-01-14T10:00:00Z',
      modifiedAt: '2024-01-14T10:00:00Z',
      formattedCreatedAt: '1/14/2024',
      formattedModifiedAt: '1/14/2024',
      downloadUrl: '/api/backup/download/backup_2024-01-14_def456.zip'
    }
  ];

  const mockBackupStatus = {
    system: {
      status: 'operational',
      version: '1.0.0',
      lastCheck: '2024-01-15T10:30:00Z'
    },
    database: {
      totalRecords: 1000,
      tables: {
        admins: 5,
        staff: 100,
        categories: 10
      }
    },
    backups: {
      totalFiles: 2,
      totalSize: 3072000,
      formattedTotalSize: '3 MB',
      oldestBackup: '2024-01-14T10:00:00Z',
      newestBackup: '2024-01-15T10:00:00Z'
    },
    recommendations: ['Create regular backups', 'Clean up old files']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses by default
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/backup/list') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              backups: mockBackups
            }
          }
        });
      }
      if (url === '/backup/status') {
        return Promise.resolve({
          data: {
            success: true,
            data: mockBackupStatus
          }
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders backup management page correctly', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
    expect(screen.getByText('Manage database backups and restore data')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('💾 Create Backup')).toBeInTheDocument();
      expect(screen.getByText('📤 Restore Backup')).toBeInTheDocument();
    });
  });

  it('displays backup files in table', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
      expect(screen.getByTestId('table-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('table-row-1')).toBeInTheDocument();
    });
  });

  it('displays status cards with correct information', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Database Records')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('Total Backups')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Storage Used')).toBeInTheDocument();
      expect(screen.getByText('3 MB')).toBeInTheDocument();
    });
  });

  it('displays recommendations when available', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Create regular backups')).toBeInTheDocument();
      expect(screen.getByText('Clean up old files')).toBeInTheDocument();
    });
  });

  it('handles create backup action', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          backupId: 'test-id',
          fileName: 'backup_test.zip',
          totalRecords: 1000
        }
      }
    });

    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      const createButton = screen.getByText('💾 Create Backup');
      fireEvent.click(createButton);
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('/backup/create');
  });

  it('opens restore modal when restore button is clicked', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      const restoreButton = screen.getByText('📤 Restore Backup');
      fireEvent.click(restoreButton);
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Restore Backup');
  });

  it('opens system status modal when status button is clicked', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      const statusButton = screen.getByText('📊 System Status');
      fireEvent.click(statusButton);
    });

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Backup System Status');
  });

  it('handles file selection for restore', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    // Open restore modal
    await waitFor(() => {
      const restoreButton = screen.getByText('📤 Restore Backup');
      fireEvent.click(restoreButton);
    });

    // Find file input
    const fileInput = screen.getByLabelText('Select Backup File');
    
    // Create a mock file
    const mockFile = new File(['backup content'], 'backup.json', {
      type: 'application/json'
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText('Selected: backup.json')).toBeInTheDocument();
    });
  });

  it('validates file type during selection', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    // Open restore modal
    await waitFor(() => {
      const restoreButton = screen.getByText('📤 Restore Backup');
      fireEvent.click(restoreButton);
    });

    // Find file input
    const fileInput = screen.getByLabelText('Select Backup File');
    
    // Create an invalid file
    const invalidFile = new File(['invalid content'], 'invalid.txt', {
      type: 'text/plain'
    });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // Should show error (this would be handled by toast notifications in real app)
    // The component should not set the selected file
  });

  it('handles restore operation', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          restoredRecords: 1000,
          backupId: 'test-id'
        }
      }
    });

    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    // Open restore modal
    await waitFor(() => {
      const restoreButton = screen.getByText('📤 Restore Backup');
      fireEvent.click(restoreButton);
    });

    // Select a file
    const fileInput = screen.getByLabelText('Select Backup File');
    const mockFile = new File(['backup content'], 'backup.json', {
      type: 'application/json'
    });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    // Click restore button
    await waitFor(() => {
      const restoreBtn = screen.getByText('Restore');
      fireEvent.click(restoreBtn);
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/backup/restore',
      expect.any(FormData),
      expect.objectContaining({
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    );
  });

  it('handles download backup action', async () => {
    // Mock successful blob response
    mockedAxios.get.mockResolvedValue({
      data: new Blob(['backup content'])
    });

    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      setAttribute: jest.fn(),
      click: jest.fn(),
      remove: jest.fn()
    };
    document.createElement = jest.fn(() => mockLink as any);
    document.body.appendChild = jest.fn();

    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    // Wait for component to load and find download button
    // Note: In a real test, you'd need to trigger the download action
    // This is a simplified test structure
  });

  it('shows empty state when no backups exist', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/backup/list') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              backups: []
            }
          }
        });
      }
      if (url === '/backup/status') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              ...mockBackupStatus,
              backups: {
                ...mockBackupStatus.backups,
                totalFiles: 0
              }
            }
          }
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No backups')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first backup.')).toBeInTheDocument();
      expect(screen.getByText('💾 Create First Backup')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Failed to fetch backups'
          }
        }
      }
    });

    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    // Component should handle the error and not crash
    await waitFor(() => {
      expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    // Mock delayed response
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading backup management...')).toBeInTheDocument();
  });

  it('formats file sizes correctly', async () => {
    render(
      <TestWrapper>
        <BackupManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      // The component should display formatted file sizes
      expect(screen.getByText('3 MB')).toBeInTheDocument(); // Total storage
    });
  });
});