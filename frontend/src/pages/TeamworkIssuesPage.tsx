import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { TeamworkService, TeamworkTask, TeamworkProject } from '../services/teamworkService';
import { useAuthStore } from '../store/authStore';

const statusColors: Record<string, string> = {
  new: '#1976d2',
  active: '#1976d2',
  inprogress: '#ed6c02',
  'in-progress': '#ed6c02',
  completed: '#2e7d32',
  complete: '#2e7d32',
  closed: '#9e9e9e',
  cancelled: '#d32f2f',
  open: '#1976d2',
  in_progress: '#ed6c02',
  done: '#2e7d32',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  active: 'Active', 
  inprogress: 'In Progress',
  'in-progress': 'In Progress',
  completed: 'Completed',
  complete: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
};

const TeamworkIssuesPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    projectId: '',
    priority: '',
    completedOnly: false,
  });
  const [connectionTestOpen, setConnectionTestOpen] = useState(false);
  const { isAuthenticated, accessToken, user } = useAuthStore();

  // Debug authentication state
  useEffect(() => {
    console.log('TeamworkIssuesPage - Auth state:', {
      isAuthenticated,
      hasAccessToken: !!accessToken,
      hasUser: !!user,
      userId: user?.id,
    });
  }, [isAuthenticated, accessToken, user]);

  // Test connection query
  const {
    data: connectionTest,
    isLoading: isTestingConnection,
    refetch: testConnection,
    error: connectionTestError,
  } = useQuery({
    queryKey: ['teamwork-connection-test'],
    queryFn: () => {
      console.log('Executing test connection query');
      return TeamworkService.testConnection();
    },
    enabled: false, // Only run when manually triggered
  });

  // Fetch projects
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ['teamwork-projects'],
    queryFn: () => {
      console.log('Executing projects query');
      return TeamworkService.getProjects();
    },
    enabled: isAuthenticated && !!accessToken,
    retry: 1,
  });

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['teamwork-tasks', filters],
    queryFn: () => {
      console.log('Executing tasks query with filters:', filters);
      
      // Build API filters, excluding empty values
      const apiFilters: any = {};
      
      // Handle completedOnly filter
      if (filters.completedOnly === true) {
        apiFilters.completedOnly = true;
      }
      
      // Handle status filter
      if (filters.status && filters.status.trim() !== '') {
        apiFilters.status = [filters.status.trim()];
      }
      
      console.log('API filters being sent:', apiFilters);
      console.log('Project ID filter:', filters.projectId);

      if (filters.projectId && filters.projectId.trim() !== '') {
        return TeamworkService.getProjectTasks(filters.projectId, apiFilters);
      } else {
        return TeamworkService.getAllTasks(apiFilters);
      }
    },
    enabled: isAuthenticated && !!accessToken,
    retry: 1,
  });

  // Debug query states
  useEffect(() => {
    console.log('Query states:', {
      isLoadingProjects,
      isLoadingTasks,
      projectsError: (projectsError as any)?.message,
      tasksError: (tasksError as any)?.message,
      projectsCount: projects.length,
      tasksCount: tasks.length,
      currentFilters: filters,
      filteredTasksCount: filteredTasks.length,
    });
    
    // Debug task data structure
    if (tasks.length > 0) {
      console.log('First task data:', tasks[0]);
      console.log('All tasks data:', tasks);
    }
  }, [isLoadingProjects, isLoadingTasks, projectsError, tasksError, projects, tasks, filters]);

  // Filter tasks (client-side filtering)
  const filteredTasks = tasks.filter((task: TeamworkTask) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = (
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.projectName?.toLowerCase().includes(searchLower) ||
        task.reporter?.name?.toLowerCase().includes(searchLower) ||
        task.assignee?.name?.toLowerCase().includes(searchLower) ||
        task.assignee?.displayName?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }

    return true;
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: event.target.value,
    }));
  };

  const handleStatusChange = (event: any) => {
    setFilters(prev => ({
      ...prev,
      status: event.target.value,
    }));
  };

  const handleProjectChange = (event: any) => {
    setFilters(prev => ({
      ...prev,
      projectId: event.target.value,
    }));
  };

  const handleCompletedOnlyChange = (event: any) => {
    setFilters(prev => ({
      ...prev,
      completedOnly: event.target.value === 'true',
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    return statusColors[status.toLowerCase()] || '#9e9e9e';
  };

  const getStatusLabel = (status: string) => {
    return statusLabels[status.toLowerCase()] || status;
  };

  const hasError = projectsError || tasksError;
  const isLoading = isLoadingProjects || isLoadingTasks;

  // If not authenticated, show auth message
  if (!isAuthenticated || !accessToken) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Teamwork Issues
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          <strong>Authentication Required</strong>
          <br />
          Please ensure you are logged in to access Teamwork issues.
          <br />
          Debug info: isAuthenticated={isAuthenticated ? 'true' : 'false'}, hasToken={!!accessToken ? 'true' : 'false'}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </Button>
        </Box>
      </Box>
    );
  }

  if (hasError) {
    const isRateLimit = (projectsError as any)?.code === 'RATE_LIMIT_EXCEEDED' || 
                       (tasksError as any)?.code === 'RATE_LIMIT_EXCEEDED';
    const retryAfter = (projectsError as any)?.retryAfter || (tasksError as any)?.retryAfter;
    
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Teamwork Issues
        </Typography>
        <Alert severity={isRateLimit ? "warning" : "error"} sx={{ mt: 2 }}>
          {isRateLimit ? (
            <>
              <strong>Rate Limit Exceeded</strong>
              <br />
              Too many requests have been made to the Teamwork API. Please wait a moment before trying again.
              {retryAfter && (
                <>
                  <br />
                  <strong>Please wait {retryAfter} seconds before retrying.</strong>
                </>
              )}
            </>
          ) : (
            <>
              Failed to connect to Teamwork API. Please check that:
              <br />
              • The backend server is running on port 3000
              <br />
              • Your TEAMWORK_API_KEY and TEAMWORK_SITE environment variables are set in the backend
              <br />
              • Your Teamwork credentials are valid
              <br />
              <br />
              Error: {(projectsError as any)?.message || (tasksError as any)?.message || 'Unknown error'}
              <br />
              Debug: {JSON.stringify({ projectsError, tasksError }, null, 2)}
            </>
          )}
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => {
              refetchTasks();
              refetchProjects();
            }}
            disabled={isRateLimit}
          >
            {isRateLimit ? `Retry in ${retryAfter || 60}s` : 'Retry'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setConnectionTestOpen(true)}
          >
            Test Connection
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Teamwork Issues
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="Test Teamwork connection">
            <IconButton 
              onClick={() => setConnectionTestOpen(true)}
              color="primary"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh tasks">
            <span>
              <IconButton onClick={() => refetchTasks()} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Task Statistics */}
      {!isLoading && tasks.length > 0 && (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" fontWeight="bold">
                    {filteredTasks.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Filtered Tasks
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" fontWeight="bold">
                    {filteredTasks.filter(t => t.status === 'new').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    📝 New
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" fontWeight="bold">
                    {filteredTasks.filter(t => t.status === 'inprogress').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    🔄 In Progress
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" fontWeight="bold">
                    {filteredTasks.filter(t => ['completed', 'closed'].includes(t.status)).length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    ✅ Completed
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search tasks"
                value={filters.search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Project</InputLabel>
                <Select
                  value={filters.projectId}
                  onChange={handleProjectChange}
                  label="Project"
                >
                  <MenuItem value="">All Projects</MenuItem>
                  {projects.map((project: TeamworkProject) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={handleStatusChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="new">📝 New</MenuItem>
                  <MenuItem value="inprogress">🔄 In Progress</MenuItem>
                  <MenuItem value="completed">✅ Completed</MenuItem>
                  <MenuItem value="closed">🔒 Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Show Completed</InputLabel>
                <Select
                  value={filters.completedOnly ? 'true' : 'false'}
                  onChange={handleCompletedOnlyChange}
                  label="Show Completed"
                >
                  <MenuItem value="false">All Tasks</MenuItem>
                  <MenuItem value="true">Completed Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="high">🔴 High</MenuItem>
                  <MenuItem value="medium">🟡 Medium</MenuItem>
                  <MenuItem value="low">🟢 Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body1" fontWeight={600} color="primary.main">
                  {filteredTasks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredTasks.length === 1 ? 'task' : 'tasks'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tasks List */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : !filteredTasks.length ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              📋 No Tasks Found
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={2}>
              {filters.search || filters.status || filters.projectId || filters.priority || filters.completedOnly
                ? 'No tasks match your current filters. Try adjusting your search criteria.' 
                : 'No tasks found in your Teamwork projects. Make sure you have tasks created in Teamwork.'}
            </Typography>
            {(filters.search || filters.status || filters.projectId || filters.priority || filters.completedOnly) && (
              <Button
                variant="outlined"
                onClick={() => setFilters({
                  search: '',
                  status: '',
                  projectId: '',
                  priority: '',
                  completedOnly: false,
                })}
                sx={{ mt: 1 }}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box>
          {filteredTasks.map((task: TeamworkTask) => (
            <Card 
              key={task.id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer', 
                '&:hover': { 
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                },
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
              }}
              onClick={() => window.open(task.url, '_blank')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box flex={1} mr={2}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography 
                        variant="h6" 
                        component="h3" 
                        fontWeight={600}
                        sx={{ 
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                        #{task.key}
                      </Typography>
                      {task.priority && (
                        <Chip
                          label={task.priority.toUpperCase()}
                          size="small"
                          color={
                            task.priority === 'high' ? 'error' : 
                            task.priority === 'medium' ? 'warning' : 
                            'success'
                          }
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            height: '22px'
                          }}
                        />
                      )}
                    </Box>
                    
                    {task.description && task.description.trim() && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.5,
                          fontStyle: 'italic'
                        }}
                      >
                        "{task.description.trim()}"
                      </Typography>
                    )}

                    {/* Reporter Info */}
                    {task.reporter && task.reporter.name && task.reporter.name !== 'undefined undefined' && (
                      <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                        <Typography variant="caption" color="text.secondary">
                          Created by:
                        </Typography>
                        <Typography variant="caption" color="primary.main" fontWeight={500}>
                          {task.reporter.name}
                        </Typography>
                      </Box>
                    )}

                    {/* Labels */}
                    {task.labels && task.labels.length > 0 && (
                      <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                        {task.labels.slice(0, 4).map((label, index) => (
                          <Chip
                            key={index}
                            label={label}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: '20px',
                              borderColor: 'primary.300',
                              color: 'primary.600'
                            }}
                          />
                        ))}
                        {task.labels.length > 4 && (
                          <Typography variant="caption" color="text.secondary">
                            +{task.labels.length - 4} more labels
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                  
                  <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                    <Chip
                      label={getStatusLabel(task.status)}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(task.status),
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: '80px'
                      }}
                    />
                    {task.assignee ? (
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary" display="block">
                          Assigned to:
                        </Typography>
                        <Typography variant="caption" color="primary.main" fontWeight={500}>
                          {task.assignee.displayName || task.assignee.name}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Unassigned
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                <Box 
                  display="flex" 
                  justifyContent="space-between" 
                  alignItems="center"
                  pt={2}
                  borderTop="1px solid"
                  borderColor="divider"
                >
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    {/* Task URL Link */}
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.75rem',
                        py: 0.5,
                        px: 1,
                        minWidth: 'auto'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(task.url, '_blank');
                      }}
                    >
                      🔗 Open in Teamwork
                    </Button>

                    {/* Project info if available */}
                    {(task.projectName || task.projectId) && (
                      <Chip
                        label={task.projectName || `Project #${task.projectId}`}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          backgroundColor: 'primary.50',
                          borderColor: 'primary.200',
                          color: 'primary.700',
                          fontWeight: 500
                        }}
                      />
                    )}

                    {/* Task Tags if available */}
                    {task.rawData?.tags && task.rawData.tags.length > 0 && (
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {task.rawData.tags.slice(0, 2).map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: '18px',
                              color: 'text.secondary'
                            }}
                          />
                        ))}
                        {task.rawData.tags.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{task.rawData.tags.length - 2} tags
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                  
                  <Box display="flex" flexDirection="column" alignItems="flex-end">
                    <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                      Updated: {formatDate(task.updatedAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                      Created: {formatDate(task.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Connection Test Dialog */}
      <Dialog open={connectionTestOpen} onClose={() => setConnectionTestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Teamwork Connection</DialogTitle>
        <DialogContent>
          {isTestingConnection ? (
            <Box display="flex" alignItems="center" gap={2} py={2}>
              <CircularProgress size={24} />
              <Typography>Testing connection...</Typography>
            </Box>
          ) : connectionTest ? (
            <Alert severity={connectionTest.success ? 'success' : 'error'} sx={{ mt: 1 }}>
              {connectionTest.message}
            </Alert>
          ) : (
            <Typography variant="body2">
              Click "Test Connection" to verify your Teamwork API configuration.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectionTestOpen(false)}>
            Close
          </Button>
          <Button
            onClick={() => testConnection()}
            variant="contained"
            disabled={isTestingConnection}
            startIcon={isTestingConnection ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            Test Connection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamworkIssuesPage; 