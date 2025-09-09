import React, { createContext, useContext, ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface ApiContextType {
  assessPartner: (data: any) => Promise<any>;
  batchAssess: (file: File) => Promise<any>;
  getDashboardStats: () => Promise<any>;
  getAssessmentHistory: (limit?: number) => Promise<any>;
  getPartnerTypes: () => Promise<any>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const assessPartner = async (data: any) => {
    const response = await apiClient.post('/api/assess-partner', data);
    return response.data;
  };

  const batchAssess = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/batch-assess', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  };

  const getDashboardStats = async () => {
    const response = await apiClient.get('/api/dashboard-stats');
    return response.data;
  };

  const getAssessmentHistory = async (limit = 100) => {
    const response = await apiClient.get(`/api/assessment-history?limit=${limit}`);
    return response.data;
  };

  const getPartnerTypes = async () => {
    const response = await apiClient.get('/api/partner-types');
    return response.data;
  };

  const value = {
    assessPartner,
    batchAssess,
    getDashboardStats,
    getAssessmentHistory,
    getPartnerTypes,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};