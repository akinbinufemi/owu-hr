import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/NotificationToast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StaffList from './pages/StaffList';
import PayrollManagement from './pages/PayrollManagement';
import LoanManagement from './pages/LoanManagement';
import Organogram from './pages/Organogram';
import IssuesManagement from './pages/IssuesManagement';
import Reports from './pages/Reports';
import FileManagement from './pages/FileManagement';
import Settings from './pages/Settings';
import StaffProfile from './pages/StaffProfile';
import PublicOrganogram from './pages/PublicOrganogram';
import BackupManagement from './pages/BackupManagement';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute>
                    <StaffList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/:id"
                element={
                  <ProtectedRoute>
                    <StaffProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payroll"
                element={
                  <ProtectedRoute>
                    <PayrollManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loans"
                element={
                  <ProtectedRoute>
                    <LoanManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organogram"
                element={
                  <ProtectedRoute>
                    <Organogram />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organogram/public/:shareId"
                element={<PublicOrganogram />}
              />
              <Route
                path="/issues"
                element={
                  <ProtectedRoute>
                    <IssuesManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/files"
                element={
                  <ProtectedRoute>
                    <FileManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/backup"
                element={
                  <ProtectedRoute>
                    <BackupManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
