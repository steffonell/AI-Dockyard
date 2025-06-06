/**
 * Teamwork API Routes
 * 
 * Secure proxy routes that handle all communication with Teamwork API.
 * All routes use Basic Auth with API key stored server-side.
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Base configuration for Teamwork API requests
const getTeamworkConfig = () => ({
  auth: {
    username: process.env.TEAMWORK_API_KEY,
    password: 'x' // Teamwork uses any single character as password
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

const TEAMWORK_BASE_URL = process.env.TEAMWORK_SITE?.startsWith('http') 
  ? process.env.TEAMWORK_SITE 
  : `https://${process.env.TEAMWORK_SITE}`;

/**
 * GET /api/teamwork/projects
 * Retrieve all projects accessible to the authenticated user
 */
router.get('/projects', async (req, res) => {
  try {    const url = `${TEAMWORK_BASE_URL}/projects/api/v3/projects.json`;
    
    console.log(`Fetching projects from: ${url}`);
    
    const response = await axios.get(url, getTeamworkConfig());
    
    // Log successful response (without sensitive data)
    console.log(`✅ Projects retrieved: ${response.data.projects?.length || 0} projects`);
    
    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching projects:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: {
        message: 'Failed to fetch projects',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

/**
 * GET /api/teamwork/projects/:id/tasks
 * Retrieve all tasks for a specific project
 * Query parameters:
 * - completedOnly: true/false (default: false)
 * - status[]: array of status values (new, completed, etc.)
 * - updatedAfter: YYYY-MM-DD format
 */router.get('/projects/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedOnly, status, updatedAfter } = req.query;
    
    // Build query string with filters
    const queryParams = new URLSearchParams();
    
    if (completedOnly !== undefined) {
      queryParams.append('completedOnly', completedOnly);
    }
    
    if (status) {
      // Handle array of status values
      const statusArray = Array.isArray(status) ? status : [status];
      statusArray.forEach(s => queryParams.append('status[]', s));
    }
    
    if (updatedAfter) {
      queryParams.append('updatedAfter', updatedAfter);
    }
    
    const queryString = queryParams.toString();
    const url = `${TEAMWORK_BASE_URL}/projects/api/v3/projects/${id}/tasks.json${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Fetching tasks for project ${id}: ${url}`);
    
    const response = await axios.get(url, getTeamworkConfig());
    
    console.log(`✅ Tasks retrieved for project ${id}: ${response.data.tasks?.length || 0} tasks`);
    
    res.json({
      success: true,
      data: response.data,
      projectId: id,
      filters: { completedOnly, status, updatedAfter },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {    console.error(`❌ Error fetching tasks for project ${req.params.id}:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: {
        message: `Failed to fetch tasks for project ${req.params.id}`,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

/**
 * GET /api/teamwork/tasks
 * Retrieve all tasks across all projects
 * Query parameters: same as project tasks endpoint
 */
router.get('/tasks', async (req, res) => {
  try {
    const { completedOnly, status, updatedAfter } = req.query;
    
    const queryParams = new URLSearchParams();
    
    if (completedOnly !== undefined) {
      queryParams.append('completedOnly', completedOnly);
    }
    
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      statusArray.forEach(s => queryParams.append('status[]', s));
    }
    
    if (updatedAfter) {
      queryParams.append('updatedAfter', updatedAfter);
    }
    
    const queryString = queryParams.toString();
    const url = `${TEAMWORK_BASE_URL}/projects/api/v3/tasks.json${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Fetching all tasks: ${url}`);
    
    const response = await axios.get(url, getTeamworkConfig());    
    console.log(`✅ All tasks retrieved: ${response.data.tasks?.length || 0} tasks`);
    
    res.json({
      success: true,
      data: response.data,
      filters: { completedOnly, status, updatedAfter },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching all tasks:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: {
        message: 'Failed to fetch tasks',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

/**
 * GET /api/teamwork/test-connection
 * Test the connection to Teamwork API
 */
router.get('/test-connection', async (req, res) => {
  try {
    const url = `${TEAMWORK_BASE_URL}/projects/api/v3/projects.json?pageSize=1`;
    
    console.log('Testing Teamwork API connection...');
    
    const response = await axios.get(url, getTeamworkConfig());
    
    res.json({
      success: true,
      message: 'Connection to Teamwork API successful',
      apiVersion: 'v3',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {    console.error('❌ Teamwork API connection test failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: {
        message: 'Failed to connect to Teamwork API',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        suggestion: 'Check your API key and site URL in environment variables'
      }
    });
  }
});

module.exports = router;