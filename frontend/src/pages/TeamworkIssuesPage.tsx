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
  inprogress: '#ed6c02',
  completed: '#2e7d32',
  closed: '#9e9e9e',
  cancelled: '#d32f2f',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  inprogress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const TeamworkIssuesPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    projectId: '',
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
      
      const apiFilters = {
        completedOnly: filters.completedOnly,
        status: filters.status ? [filters.status] : undefined,
      };

      if (filters.projectId) {
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
    });
    
    // Debug task data structure
    if (tasks.length > 0) {
      console.log('First task data:', tasks[0]);
      console.log('All tasks data:', tasks);
    }
  }, [isLoadingProjects, isLoadingTasks, projectsError, tasksError, projects, tasks]);

  // Filter tasks by search term (client-side filtering)
  const filteredTasks = tasks.filter((task: TeamworkTask) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    const taskTitle = task.title || task.name || task.summary || '';
    return (
      taskTitle.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      task.projectName.toLowerCase().includes(searchLower)
    );
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
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="inprogress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
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
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body1" fontWeight={600} color="primary.main">
                  {filteredTasks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredTasks.length === 1 ? 'task found' : 'tasks found'}
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
              {filters.search || filters.status || filters.projectId
                ? 'No tasks match your current filters. Try adjusting your search criteria.' 
                : 'No tasks found in your Teamwork projects. Make sure you have tasks created in Teamwork.'}
            </Typography>
            {(filters.search || filters.status || filters.projectId) && (
              <Button
                variant="outlined"
                onClick={() => setFilters({
                  search: '',
                  status: '',
                  projectId: '',
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
            <Card key={task.id} sx={{ mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box flex={1} mr={2}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="h6" component="h3" fontWeight={600}>
                        {task.title || task.name || task.summary || `Task #${task.id}`}
                      </Typography>
                      {task.priority && (
                        <Chip
                          label={task.priority.toUpperCase()}
                          size="small"
                          color={
                            task.priority === 'high' ? 'error' : 
                            task.priority === 'medium' ? 'warning' : 
                            'default'
                          }
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.7rem'
                          }}
                        />
                      )}
                    </Box>
                    
                    {task.description && (
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
                          lineHeight: 1.4
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                    <Chip
                      label={getStatusLabel(task.status)}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(task.status),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      #{task.id}
                    </Typography>
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
                    <Chip
                      label={task.projectName}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        backgroundColor: 'primary.50',
                        borderColor: 'primary.200',
                        color: 'primary.700',
                        fontWeight: 500
                      }}
                    />
                    {task.assigneeName && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
                          👤 {task.assigneeName}
                        </Typography>
                      </Box>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {task.tags.slice(0, 3).map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: '20px',
                              color: 'text.secondary'
                            }}
                          />
                        ))}
                        {task.tags.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{task.tags.length - 3} more
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