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
  Pagination,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IssueService, IssueQueryParams } from '../services/issueService';
import { TrackerService, Tracker, TrackerSyncResult } from '../services/trackerService';
import { Issue, IssueStatus } from '../types';

const statusColors: Record<IssueStatus, string> = {
  open: '#1976d2',
  in_progress: '#ed6c02',
  done: '#2e7d32',
  closed: '#9e9e9e',
  cancelled: '#d32f2f',
};

const statusLabels: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const IssueListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<IssueQueryParams>({
    page: 1,
    limit: 20,
    search: '',
    status: '',
  });
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [syncResult, setSyncResult] = useState<TrackerSyncResult | null>(null);

  const {
    data: issuesResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['issues', filters],
    queryFn: () => IssueService.getIssues(filters),
    keepPreviousData: true,
  });

  const { data: trackersResponse } = useQuery({
    queryKey: ['trackers'],
    queryFn: () => TrackerService.getTrackers(),
  });

  const syncMutation = useMutation({
    mutationFn: (trackerId: string) => TrackerService.syncTracker(trackerId),
    onSuccess: (result) => {
      setSyncResult(result);
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
    },
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: event.target.value,
      page: 1, // Reset to first page when searching
    }));
  };

  const handleStatusChange = (event: any) => {
    setFilters(prev => ({
      ...prev,
      status: event.target.value,
      page: 1,
    }));
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setFilters(prev => ({
      ...prev,
      page: value,
    }));
  };

  const handleSyncDialogOpen = () => {
    setSyncDialogOpen(true);
    setSyncResult(null);
  };

  const handleSyncDialogClose = () => {
    setSyncDialogOpen(false);
    setSelectedTracker('');
    setSyncResult(null);
  };

  const handleSync = () => {
    if (selectedTracker) {
      syncMutation.mutate(selectedTracker);
    }
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

  const getIssueDisplayTitle = (issue: Issue) => {
    return issue.extKey ? `${issue.extKey}: ${issue.title}` : issue.title;
  };

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Issues
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load issues. Please check that the backend is running and you are authenticated.
          <br />
          Error: {(error as any)?.message || 'Unknown error'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Issues
        </Typography>
        <Box display="flex" gap={2}>
          <Tooltip title="Sync with external tracker">
            <span>
              <IconButton 
                onClick={handleSyncDialogOpen} 
                disabled={!trackersResponse?.trackers?.length}
                color="primary"
              >
                <SyncIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Refresh issues">
            <span>
              <IconButton onClick={() => refetch()} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Navigate to create issue page
              console.log('Navigate to create issue');
            }}
          >
            Create Issue
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search issues"
                value={filters.search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                placeholder="Search by title, description, or external key..."
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={handleStatusChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                {issuesResponse?.pagination.total || 0} total issues
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Issues List */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : !issuesResponse?.data.length ? (
        <Card>
          <CardContent>
            <Typography variant="body1" textAlign="center" py={4}>
              {filters.search || filters.status 
                ? 'No issues found matching your filters.' 
                : 'No issues found. Create your first issue or sync with an external tracker.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {issuesResponse.data.map((issue: Issue) => (
            <Card key={issue.id} sx={{ mb: 2, cursor: 'pointer' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box flex={1}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {getIssueDisplayTitle(issue)}
                    </Typography>
                    {issue.description && (
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
                        {issue.description}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Chip
                      label={statusLabels[issue.status]}
                      size="small"
                      sx={{
                        backgroundColor: statusColors[issue.status],
                        color: 'white',
                      }}
                    />
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" gap={2} alignItems="center">
                    {issue.assignee && (
                      <Typography variant="body2" color="text.secondary">
                        Assigned to: {issue.assignee.name || issue.assignee.email}
                      </Typography>
                    )}
                    {issue.tracker && (
                      <Chip
                        label={issue.tracker.type.toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Updated: {formatDate(issue.updatedAt)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {issuesResponse.pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={issuesResponse.pagination.totalPages}
                page={filters.page || 1}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onClose={handleSyncDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Sync Issues with External Tracker</DialogTitle>
        <DialogContent>
          {syncMutation.isLoading && (
            <Box mb={2}>
              <Typography variant="body2" gutterBottom>
                Syncing issues...
              </Typography>
              <LinearProgress />
            </Box>
          )}
          
          {syncResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                {syncResult.message}
              </Alert>
              <Typography variant="body2">
                • Synced: {syncResult.syncedCount} issues
              </Typography>
              <Typography variant="body2">
                • Total External: {syncResult.totalExternal} issues
              </Typography>
              {syncResult.errorCount > 0 && (
                <Typography variant="body2" color="error">
                  • Errors: {syncResult.errorCount} issues failed to sync
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" gutterBottom>
                Select a tracker to sync issues from:
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Tracker</InputLabel>
                <Select
                  value={selectedTracker}
                  onChange={(e) => setSelectedTracker(e.target.value)}
                  label="Tracker"
                >
                  {trackersResponse?.trackers?.map((tracker) => (
                    <MenuItem key={tracker.id} value={tracker.id}>
                      {tracker.type.toUpperCase()} - {tracker.company?.name}
                      {tracker.lastSync && (
                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          (Last sync: {formatDate(tracker.lastSync)})
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {syncMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Sync failed: {(syncMutation.error as any)?.message || 'Unknown error'}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSyncDialogClose}>
            {syncResult ? 'Close' : 'Cancel'}
          </Button>
          {!syncResult && (
            <Button
              onClick={handleSync}
              variant="contained"
              disabled={!selectedTracker || syncMutation.isLoading}
              startIcon={syncMutation.isLoading ? <CircularProgress size={16} /> : <SyncIcon />}
            >
              Sync Issues
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssueListPage; 