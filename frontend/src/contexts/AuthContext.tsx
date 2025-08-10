import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface Admin {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_BASE_URL;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedAdmin = localStorage.getItem('admin');

        if (storedToken && storedAdmin) {
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verify token is still valid
          const response = await axios.get('/auth/verify');
          
          if (response.data.success) {
            setToken(storedToken);
            setAdmin(JSON.parse(storedAdmin));
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('admin');
            delete axios.defaults.headers.common['Authorization'];
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('admin');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      const response = await axios.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { token: newToken, admin: adminData } = response.data.data;
        
        // Store in localStorage
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('admin', JSON.stringify(adminData));
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Update state
        setToken(newToken);
        setAdmin(adminData);
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Clear any existing auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('admin');
      delete axios.defaults.headers.common['Authorization'];
      setToken(null);
      setAdmin(null);
      
      // Re-throw error for component handling
      throw new Error(
        error.response?.data?.error?.message || 
        error.message || 
        'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('admin');
    
    // Clear axios default header
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear state
    setToken(null);
    setAdmin(null);
    
    // Optional: Call logout endpoint
    axios.post('/auth/logout').catch(console.error);
  };

  const value: AuthContextType = {
    admin,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!admin && !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};