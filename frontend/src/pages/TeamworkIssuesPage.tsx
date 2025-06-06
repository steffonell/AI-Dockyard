import React, { useState } from 'react';
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

  // Test connection query
  const {
    data: connectionTest,
    isLoading: isTestingConnection,
    refetch: testConnection,
  } = useQuery({
    queryKey: ['teamwork-connection-test'],
    queryFn: () => TeamworkService.testConnection(),
    enabled: false, // Only run when manually triggered
  });

  // Fetch projects
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useQuery({
    queryKey: ['teamwork-projects'],
    queryFn: () => TeamworkService.getProjects(),
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
    retry: 1,
  });

  // Filter tasks by search term (client-side filtering)
  const filteredTasks = tasks.filter((task: TeamworkTask) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      task.name.toLowerCase().includes(searchLower) ||
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

  if (hasError) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Teamwork Issues
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to connect to Teamwork API. Please check that:
          <br />
          • The Teamwork server is running on port 5000
          <br />
          • Your TEAMWORK_API_KEY and TEAMWORK_SITE environment variables are set
          <br />
          • Your Teamwork credentials are valid
          <br />
          <br />
          Error: {(projectsError as any)?.message || (tasksError as any)?.message || 'Unknown error'}
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => {
              refetchTasks();
              window.location.reload();
            }}
          >
            Retry
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
              <Typography variant="body2" color="text.secondary">
                {filteredTasks.length} tasks found
              </Typography>
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
          <CardContent>
            <Typography variant="body1" textAlign="center" py={4}>
              {filters.search || filters.status || filters.projectId
                ? 'No tasks found matching your filters.' 
                : 'No tasks found. Check your Teamwork connection and ensure you have tasks in your projects.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {filteredTasks.map((task: TeamworkTask) => (
            <Card key={task.id} sx={{ mb: 2, cursor: 'pointer' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box flex={1}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {task.name}
                    </Typography>
                    {task.description && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Chip
                      label={getStatusLabel(task.status)}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(task.status),
                        color: 'white',
                      }}
                    />
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" gap={2} alignItems="center">
                    <Chip
                      label={task.projectName}
                      size="small"
                      variant="outlined"
                    />
                    {task.assigneeName && (
                      <Typography variant="body2" color="text.secondary">
                        Assigned to: {task.assigneeName}
                      </Typography>
                    )}
                    {task.priority && (
                      <Chip
                        label={task.priority}
                        size="small"
                        color={task.priority === 'high' ? 'error' : 'default'}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Updated: {formatDate(task.updatedAt)}
                  </Typography>
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