import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Fade,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Article as ArticleIcon,
  Build as BuildIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TeamworkService, TeamworkTask } from '../services/teamworkService';
import TemplateService from '../services/templateService';
import CompanyService from '../services/companyService';
import { useAuthStore } from '../store/authStore';
import { PromptTemplate } from '../types';

interface DashboardStats {
  totalIssues: number;
  activeIssues: number;
  completedIssues: number;
  highPriorityIssues: number;
  totalTemplates: number;
  activeTemplates: number;
  recentActivity: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  disabled?: boolean;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard data
  const { data: issues = [], isLoading: isLoadingIssues, error: issuesError } = useQuery({
    queryKey: ['dashboard-issues', refreshKey],
    queryFn: () => TeamworkService.getAllTasks({}),
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['dashboard-templates', refreshKey],
    queryFn: () => TemplateService.getTemplates({ limit: 100 }),
    enabled: isAuthenticated,
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['dashboard-companies'],
    queryFn: () => CompanyService.getCompanies({ limit: 100 }),
    enabled: isAuthenticated,
    select: (response) => response.data,
    staleTime: 10 * 60 * 1000,
  });

  // Calculate statistics
  const stats: DashboardStats = React.useMemo(() => {
    const totalIssues = issues.length;
    const activeIssues = issues.filter(issue => 
      ['new', 'inprogress', 'in-progress', 'active', 'open'].includes(issue.status.toLowerCase())
    ).length;
    const completedIssues = issues.filter(issue => 
      ['completed', 'complete', 'done', 'closed'].includes(issue.status.toLowerCase())
    ).length;
    const highPriorityIssues = issues.filter(issue => 
      issue.priority?.toLowerCase() === 'high'
    ).length;
    const totalTemplates = templates.length;
    const activeTemplates = templates.filter(template => template.isActive).length;
    const recentActivity = issues.filter(issue => {
      const updatedDate = new Date(issue.updatedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return updatedDate > weekAgo;
    }).length;

    return {
      totalIssues,
      activeIssues,
      completedIssues,
      highPriorityIssues,
      totalTemplates,
      activeTemplates,
      recentActivity,
    };
  }, [issues, templates]);

  // Quick actions based on user role
  const quickActions: QuickAction[] = [
    {
      title: 'AI Instructions',
      description: 'Transform issues into AI instructions',
      icon: <AutoAwesomeIcon />,
      color: '#667eea',
      path: '/issue-to-prompt',
    },
    {
      title: 'Browse Issues',
      description: 'View and manage Teamwork issues',
      icon: <AssignmentIcon />,
      color: '#43a047',
      path: '/issues',
    },
    {
      title: 'Generate Prompt',
      description: 'Create custom AI prompts',
      icon: <DescriptionIcon />,
      color: '#ff7043',
      path: '/prompts/new',
    },
    {
      title: 'Manage Templates',
      description: 'Create and edit prompt templates',
      icon: <SettingsIcon />,
      color: '#8e24aa',
      path: '/templates',
      disabled: user?.role !== 'admin',
    },
  ];

  // Recent issues (last 5)
  const recentIssues = issues
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Recent templates (last 3)
  const recentTemplates = templates
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
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
    return statusColors[status.toLowerCase()] || '#9e9e9e';
  };

  const getPriorityColor = (priority?: string) => {
    const colors: Record<string, string> = {
      high: '#d32f2f',
      medium: '#ed6c02',
      low: '#2e7d32',
    };
    return colors[priority?.toLowerCase() || 'medium'] || '#9e9e9e';
  };

  const isLoading = isLoadingIssues || isLoadingTemplates;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Welcome back, {user?.name || 'User'}! 👋
          </Typography>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Here's your AI Dockyard dashboard overview
        </Typography>
      </Box>

      {/* Error Alert */}
      {(issuesError) && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          Some data couldn't be loaded. Check your Teamwork connection.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {isLoading ? <Skeleton width={60} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : stats.totalIssues}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Total Issues
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #43a047 0%, #66bb6a 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {isLoading ? <Skeleton width={60} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : stats.activeIssues}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Active Issues
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #ff7043 0%, #ff8a65 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {isLoading ? <Skeleton width={60} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : stats.totalTemplates}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Templates
                      </Typography>
                    </Box>
                    <ArticleIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #8e24aa 0%, #ab47bc 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {isLoading ? <Skeleton width={60} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : stats.recentActivity}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Recent Activity
                      </Typography>
                    </Box>
                    <TimelineIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon color="primary" />
                Quick Actions
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Paper
                      sx={{
                        p: 2,
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                        opacity: action.disabled ? 0.6 : 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': action.disabled ? {} : {
                          borderColor: action.color,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 20px ${action.color}30`,
                        },
                      }}
                      onClick={() => !action.disabled && navigate(action.path)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: action.color, color: 'white' }}>
                          {action.icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="600">
                            {action.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {action.description}
                          </Typography>
                        </Box>
                        <PlayArrowIcon sx={{ color: 'text.secondary' }} />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" />
                System Status
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main', color: 'white', width: 32, height: 32 }}>
                      <CheckCircleIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Teamwork API" 
                    secondary={issues.length > 0 ? "Connected" : "Check connection"} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main', color: 'white', width: 32, height: 32 }}>
                      <CheckCircleIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Database" 
                    secondary="Connected" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main', color: 'white', width: 32, height: 32 }}>
                      <CheckCircleIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="OpenAI API" 
                    secondary="Ready" 
                  />
                </ListItem>

                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main', color: 'white', width: 32, height: 32 }}>
                      <PersonIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Companies" 
                    secondary={`${companies.length} configured`} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Issues */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon color="primary" />
                Recent Issues
              </Typography>
              
              {isLoading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : recentIssues.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <AssignmentIcon sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
                  <Typography variant="body2">
                    No recent issues found
                  </Typography>
                </Box>
              ) : (
                <List>
                  {recentIssues.map((issue, index) => (
                    <ListItem key={issue.id} disablePadding>
                      <ListItemButton
                        onClick={() => navigate('/issues')}
                        sx={{ borderRadius: 1, mb: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getStatusColor(issue.status), width: 32, height: 32 }}>
                            <BuildIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" noWrap>
                              {issue.title}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip 
                                label={issue.status} 
                                size="small" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.7rem',
                                  backgroundColor: getStatusColor(issue.status),
                                  color: 'white'
                                }} 
                              />
                              {issue.priority && (
                                <Chip 
                                  label={issue.priority} 
                                  size="small" 
                                  sx={{ 
                                    height: 20, 
                                    fontSize: '0.7rem',
                                    backgroundColor: getPriorityColor(issue.priority),
                                    color: 'white'
                                  }} 
                                />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(issue.updatedAt)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
              
              {recentIssues.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={() => navigate('/issues')}
                    endIcon={<PlayArrowIcon />}
                  >
                    View All Issues
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Templates */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArticleIcon color="primary" />
                Recent Templates
              </Typography>
              
              {isLoading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : recentTemplates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <ArticleIcon sx={{ fontSize: 48, opacity: 0.5, mb: 1 }} />
                  <Typography variant="body2">
                    No templates found
                  </Typography>
                  {user?.role === 'admin' && (
                    <Button 
                      variant="contained" 
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/templates')}
                    >
                      Create First Template
                    </Button>
                  )}
                </Box>
              ) : (
                <List>
                  {recentTemplates.map((template) => (
                    <ListItem key={template.id} disablePadding>
                      <ListItemButton
                        onClick={() => navigate('/templates')}
                        sx={{ borderRadius: 1, mb: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: template.isActive ? '#43a047' : '#9e9e9e', width: 32, height: 32 }}>
                            <DescriptionIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" noWrap>
                              {template.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip 
                                label={template.isActive ? 'Active' : 'Inactive'} 
                                size="small" 
                                color={template.isActive ? 'success' : 'default'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(template.updatedAt)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
              
              {recentTemplates.length > 0 && user?.role === 'admin' && (
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={() => navigate('/templates')}
                    endIcon={<PlayArrowIcon />}
                  >
                    Manage Templates
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Progress Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                Progress Overview
              </Typography>
              
              <Grid container spacing={4} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Issue Completion Rate
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {stats.totalIssues > 0 ? Math.round((stats.completedIssues / stats.totalIssues) * 100) : 0}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.totalIssues > 0 ? (stats.completedIssues / stats.totalIssues) * 100 : 0}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Active Templates
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {stats.totalTemplates > 0 ? Math.round((stats.activeTemplates / stats.totalTemplates) * 100) : 0}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.totalTemplates > 0 ? (stats.activeTemplates / stats.totalTemplates) * 100 : 0}
                      color="secondary"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        High Priority Issues
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {stats.highPriorityIssues} / {stats.totalIssues}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.totalIssues > 0 ? (stats.highPriorityIssues / stats.totalIssues) * 100 : 0}
                      color="warning"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage; 