import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  getProductApiKey,
  setProductApiKey,
  clearProductApiKey,
  clearAllTokens,
  request,
} from '../services/api';

export type UserRole = 'admin' | 'product' | null;

interface AuthContextType {
  role: UserRole;
  token: string | null;
  apiKeyPrefix: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAdmin: (secret: string) => Promise<void>;
  loginProduct: (apiKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiKeyPrefix, setApiKeyPrefix] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from sessionStorage
  useEffect(() => {
    const adminToken = getAdminToken();
    const productKey = getProductApiKey();

    if (adminToken) {
      setRole('admin');
      setToken(adminToken);
    } else if (productKey) {
      setRole('product');
      setToken(productKey);
      setApiKeyPrefix(productKey.substring(0, 8));
    } else {
      setRole(null);
      setToken(null);
    }
    setIsLoading(false);
  }, []);

  // Listen for global unauthorized events (401)
  useEffect(() => {
    const handleUnauthorized = () => {
      setRole(null);
      setToken(null);
      setApiKeyPrefix(null);
      clearAllTokens();
    };

    window.addEventListener('pinglayer:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('pinglayer:unauthorized', handleUnauthorized);
  }, []);

  const loginAdmin = useCallback(async (secret: string) => {
    const trimmed = secret.trim();
    if (!trimmed) {
      throw new Error('Admin secret cannot be empty');
    }

    // Set temporarily to verify probe
    setAdminToken(trimmed);
    try {
      // Probe admin products endpoint to verify the secret
      await request('/admin/api/products?limit=1', {}, 'admin');
      setRole('admin');
      setToken(trimmed);
    } catch (err: any) {
      clearAdminToken();
      setRole(null);
      setToken(null);
      throw err;
    }
  }, []);

  const loginProduct = useCallback(async (apiKey: string) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API Key cannot be empty');
    }

    // Set temporarily to verify probe
    setProductApiKey(trimmed);
    try {
      // Probe product connections endpoint to verify key works
      await request('/api/v1/connections?limit=1', {}, 'product');
      setRole('product');
      setToken(trimmed);
      setApiKeyPrefix(trimmed.substring(0, 8));
    } catch (err: any) {
      clearProductApiKey();
      setRole(null);
      setToken(null);
      setApiKeyPrefix(null);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearAllTokens();
    setRole(null);
    setToken(null);
    setApiKeyPrefix(null);
  }, []);

  const value: AuthContextType = {
    role,
    token,
    apiKeyPrefix,
    isAuthenticated: role !== null,
    isLoading,
    loginAdmin,
    loginProduct,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
