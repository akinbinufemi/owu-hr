import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SimpleChart from '../components/ui/SimpleChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import axios from 'axios';

interface DashboardMetrics {
  totalStaff: number;
  activeStaff: number;
  recentHires: number;
  openIssues: number;
  pendingLoans: number;
  totalPayroll: number;
}

interface DashboardNotification {
  id: string;
  type: 'birthday' | 'anniversary' | 'loan_due' | 'issue_overdue';
  title: string;
  message: string;
  date: string;
  staffId?: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
  }[];
}

const Dashboard: React.FC = () => {
  const { admin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all dashboard data
        const [metricsRes, notificationsRes, chartRes] = await Promise.all([
          axios.get('/dashboard/metrics'),
          axios.get('/dashboard/notifications'),
          axios.get('/dashboard/department-chart')
        ]);

        if (metricsRes.data.success) {
          setMetrics(metricsRes.data.data);
        }

        if (notificationsRes.data.success) {
          setNotifications(notificationsRes.data.data);
        }

        if (chartRes.data.success) {
          setChartData(chartRes.data.data);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'birthday': return '🎂';
      case 'anniversary': return '🎉';
      case 'loan_due': return '💰';
      case 'issue_overdue': return '⚠️';
      default: return '📢';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome to the Owu Palace HRMS dashboard, {admin?.fullName}
        </p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Staff</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalStaff}</p>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Recent Hires</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.recentHires}</p>
              </div>
              <div className="text-2xl">🆕</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Open Issues</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.openIssues}</p>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Loans</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.pendingLoans}</p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Monthly Payroll</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalPayroll)}</p>
              </div>
              <div className="text-2xl">💵</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Department Chart */}
        {chartData && (
          <div className="lg:col-span-2">
            <SimpleChart 
              data={chartData} 
              type="doughnut" 
              title="Staff by Department" 
            />
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Notifications
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id} className="p-4 border-b border-gray-100 last:border-b-0 flex items-start gap-3">
                  <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">
                  No notifications at this time
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Quick Actions
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.href = '/staff'}
              className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="text-xl mb-2">👤</div>
              <div className="text-sm font-medium mb-1">Manage Staff</div>
              <div className="text-xs opacity-90">View and manage employees</div>
            </button>

            <button
              onClick={() => window.location.href = '/payroll'}
              className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <div className="text-xl mb-2">💵</div>
              <div className="text-sm font-medium mb-1">Manage Payroll</div>
              <div className="text-xs opacity-90">Generate and view payroll schedules</div>
            </button>

            <button
              onClick={() => window.location.href = '/loans'}
              className="p-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              <div className="text-xl mb-2">💰</div>
              <div className="text-sm font-medium mb-1">Manage Loans</div>
              <div className="text-xs opacity-90">Track employee loans and repayments</div>
            </button>

            <button
              onClick={() => window.location.href = '/issues'}
              className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <div className="text-xl mb-2">🎫</div>
              <div className="text-sm font-medium mb-1">Manage Issues</div>
              <div className="text-xs opacity-90">Track staff issues and grievances</div>
            </button>

            <button
              onClick={() => window.location.href = '/files'}
              className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <div className="text-xl mb-2">📁</div>
              <div className="text-sm font-medium mb-1">Manage Files</div>
              <div className="text-xs opacity-90">Upload and organize documents</div>
            </button>

            <button
              onClick={() => window.location.href = '/reports'}
              className="p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <div className="text-xl mb-2">📊</div>
              <div className="text-sm font-medium mb-1">View Reports</div>
              <div className="text-xs opacity-90">Generate HR reports</div>
            </button>

            <button
              onClick={() => window.location.href = '/organogram'}
              className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <div className="text-xl mb-2">🏢</div>
              <div className="text-sm font-medium mb-1">View Organogram</div>
              <div className="text-xs opacity-90">Organization structure</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;