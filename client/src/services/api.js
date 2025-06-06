/**
 * API Service Layer
 * 
 * All API calls go through the Express proxy to keep credentials secure.
 * No direct calls to Teamwork API from the frontend.
 */

import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api/teamwork',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.error?.message || error.message
    });
    
    // Transform error for consistent handling
    const customError = new Error(
      error.response?.data?.error?.message || 
      error.message || 
      'An unexpected error occurred'
    );
    customError.status = error.response?.status;
    customError.originalError = error;
    
    return Promise.reject(customError);
  }
);

/**
 * Test connection to Teamwork API
 */
export const testConnection = async () => {
  const response = await api.get('/test-connection');
  return response.data;
};

/**
 * Fetch all projects
 */
export const fetchProjects = async () => {
  const response = await api.get('/projects');
  return response.data;
};

/**
 * Fetch tasks for a specific project
 * @param {number} projectId - Project ID
 * @param {Object} filters - Task filters
 * @param {boolean} filters.completedOnly - Only completed tasks
 * @param {string[]} filters.status - Array of status values
 * @param {string} filters.updatedAfter - Date in YYYY-MM-DD format
 */export const fetchProjectTasks = async (projectId, filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.completedOnly !== undefined) {
    params.append('completedOnly', filters.completedOnly);
  }
  
  if (filters.status && filters.status.length > 0) {
    filters.status.forEach(status => params.append('status', status));
  }
  
  if (filters.updatedAfter) {
    params.append('updatedAfter', filters.updatedAfter);
  }
  
  const queryString = params.toString();
  const url = `/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Fetch all tasks across all projects
 * @param {Object} filters - Task filters (same as fetchProjectTasks)
 */
export const fetchAllTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.completedOnly !== undefined) {
    params.append('completedOnly', filters.completedOnly);
  }
  
  if (filters.status && filters.status.length > 0) {
    filters.status.forEach(status => params.append('status', status));
  }
  
  if (filters.updatedAfter) {
    params.append('updatedAfter', filters.updatedAfter);
  }
  
  const queryString = params.toString();
  const url = `/tasks${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Task status constants for filtering
 */
export const TASK_STATUS = {
  NEW: 'new',
  COMPLETED: 'completed',
  REOPENED: 'reopened',
  DELETED: 'deleted'
};

/**
 * Project status constants
 */
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

export default api;