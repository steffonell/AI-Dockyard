import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Slider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useQuery } from '@tanstack/react-query';
import { PromptTemplate } from '../types';
import TemplateService from '../services/templateService';
import CompanyService, { Company } from '../services/companyService';
import { TeamworkService, TeamworkTask } from '../services/teamworkService';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

interface ChatCompletionResponse {
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface GeneratedPrompt {
  populatedTemplate: string;
  issueContext: string;
  finalPrompt: string;
}

const steps = [
  'Select Company & Template',
  'Choose Teamwork Issue', 
  'Configure AI Settings',
  'Generate Instructions'
];

const IssueToPromptPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<TeamworkTask | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [finalInstructions, setFinalInstructions] = useState<ChatCompletionResponse | null>(null);
  
  // AI Configuration
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyNotification, setCopyNotification] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [responseTab, setResponseTab] = useState(0);

  // Fetch companies
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => CompanyService.getCompanies({ limit: 100 }),
    enabled: isAuthenticated,
    select: (response) => response.data,
  });

  // Fetch templates for selected company
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['templates', selectedCompanyId],
    queryFn: () => TemplateService.getTemplates({ limit: 100, companyId: selectedCompanyId }),
    enabled: isAuthenticated && !!selectedCompanyId,
    select: (response) => response.data,
  });

  // Fetch Teamwork issues
  const { data: issues = [], isLoading: isLoadingIssues, refetch: refetchIssues } = useQuery({
    queryKey: ['teamwork-issues'],
    queryFn: () => TeamworkService.getAllTasks({}),
    enabled: isAuthenticated && activeStep >= 1,
    retry: 1,
  });

  // Auto-select first company
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template);
  };

  const handleIssueSelect = (issue: TeamworkTask) => {
    setSelectedIssue(issue);
  };

  const populateTemplate = (template: string, issue: TeamworkTask): GeneratedPrompt => {
    // Create issue context
    const issueContext = `
**Issue Details:**
- Title: ${issue.title}
- Key: ${issue.key}
- Status: ${issue.status}
- Priority: ${issue.priority || 'Not specified'}
- Project: ${issue.projectName || 'Unknown'}
- Assignee: ${issue.assignee ? (issue.assignee.displayName || issue.assignee.name) : 'Unassigned'}
- Reporter: ${issue.reporter ? issue.reporter.name : 'Unknown'}
- Created: ${new Date(issue.createdAt).toLocaleDateString()}
- Updated: ${new Date(issue.updatedAt).toLocaleDateString()}
- URL: ${issue.url}

**Description:**
${issue.description || 'No description provided'}
`;

    // Replace template variables with issue data
    let populatedTemplate = template;
    
    // Common variable replacements
    const replacements: Record<string, string> = {
      '{issue_title}': issue.title,
      '{issue_key}': issue.key,
      '{issue_description}': issue.description || 'No description provided',
      '{issue_status}': issue.status,
      '{issue_priority}': issue.priority || 'Not specified',
      '{issue_url}': issue.url,
      '{project_name}': issue.projectName || 'Unknown',
      '{assignee_name}': issue.assignee ? (issue.assignee.displayName || issue.assignee.name) : 'Unassigned',
      '{reporter_name}': issue.reporter ? issue.reporter.name : 'Unknown',
      '{created_date}': new Date(issue.createdAt).toLocaleDateString(),
      '{updated_date}': new Date(issue.updatedAt).toLocaleDateString(),
    };

    // Apply replacements
    Object.entries(replacements).forEach(([variable, value]) => {
      populatedTemplate = populatedTemplate.replace(new RegExp(variable, 'g'), value);
    });

    // Create final prompt combining template and context
    const finalPrompt = `${populatedTemplate}\n\n${issueContext}`;

    return {
      populatedTemplate,
      issueContext,
      finalPrompt,
    };
  };

  const generateInstructions = async () => {
    if (!selectedTemplate || !selectedIssue) {
      setError('Please select both a template and an issue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate the populated prompt
      const prompt = populateTemplate(selectedTemplate.bodyMd, selectedIssue);
      setGeneratedPrompt(prompt);

      // Create messages for AI completion
      const messages = [
        {
          role: 'system' as const,
          content: 'You are an expert software engineer and problem solver. Your task is to analyze the given issue and provide clear, actionable instructions for solving it. Focus on practical steps that can be implemented by a developer using AI coding assistants like Cursor.'
        },
        {
          role: 'user' as const,
          content: prompt.finalPrompt
        }
      ];

      // Call the AI completion API
      const response = await apiClient.post('/prompts/chat-completion', {
        messages,
        model,
        temperature,
        max_tokens: maxTokens,
      });

      setFinalInstructions(response.data);
      setActiveStep(3); // Move to final step
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate instructions');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to access the Issue-to-Prompt workflow
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Issue-to-Prompt Workflow
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Transform Teamwork issues into actionable AI instructions using custom templates
        </Typography>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="horizontal" alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Grid container spacing={3}>
        {/* Step 1: Template Selection */}
        {activeStep === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select Company & Template
                </Typography>
                
                {/* Company Selection */}
                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Company</InputLabel>
                    <Select
                      value={selectedCompanyId}
                      label="Company"
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      disabled={isLoadingCompanies}
                    >
                      {companies.map((company: Company) => (
                        <MenuItem key={company.id} value={company.id}>
                          {company.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Template Selection */}
                {selectedCompanyId && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Available Templates ({templates.length})
                    </Typography>
                    {isLoadingTemplates ? (
                      <CircularProgress />
                    ) : templates.length === 0 ? (
                      <Alert severity="info">
                        No templates found for this company. Create templates in the Template Manager first.
                      </Alert>
                    ) : (
                      <List>
                        {templates.map((template) => (
                          <ListItem key={template.id} disablePadding>
                            <ListItemButton
                              selected={selectedTemplate?.id === template.id}
                              onClick={() => handleTemplateSelect(template)}
                              sx={{ 
                                border: 1, 
                                borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                                borderRadius: 1,
                                mb: 1,
                              }}
                            >
                              <ListItemText
                                primary={template.name}
                                secondary={
                                  <Box>
                                    <Typography variant="body2" color="text.secondary">
                                      {template.bodyMd.substring(0, 100)}...
                                    </Typography>
                                    <Box sx={{ mt: 1 }}>
                                      <Chip
                                        size="small"
                                        label={template.isActive ? 'Active' : 'Inactive'}
                                        color={template.isActive ? 'success' : 'default'}
                                      />
                                    </Box>
                                  </Box>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {/* Navigation */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!selectedTemplate}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Next: Select Issue
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Step 2: Issue Selection */}
        {activeStep === 1 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Select Teamwork Issue
                  </Typography>
                  <IconButton onClick={() => refetchIssues()}>
                    <RefreshIcon />
                  </IconButton>
                </Box>

                {isLoadingIssues ? (
                  <CircularProgress />
                ) : issues.length === 0 ? (
                  <Alert severity="info">
                    No Teamwork issues found. Make sure your Teamwork integration is configured correctly.
                  </Alert>
                ) : (
                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {issues.map((issue) => (
                      <ListItem key={issue.id} disablePadding>
                        <ListItemButton
                          selected={selectedIssue?.id === issue.id}
                          onClick={() => handleIssueSelect(issue)}
                          sx={{ 
                            border: 1, 
                            borderColor: selectedIssue?.id === issue.id ? 'primary.main' : 'divider',
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1">
                                  {issue.title}
                                </Typography>
                                <Chip size="small" label={issue.key} variant="outlined" />
                                <Chip
                                  size="small"
                                  label={issue.status}
                                  color={issue.status === 'completed' ? 'success' : 'default'}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {issue.description?.substring(0, 150) || 'No description'}...
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Project: {issue.projectName} | Priority: {issue.priority || 'None'}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* Navigation */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    startIcon={<ArrowBackIcon />}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!selectedIssue}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Next: Configure AI
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Step 3: AI Configuration */}
        {activeStep === 2 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configure AI Settings
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={model}
                        label="Model"
                        onChange={(e) => setModel(e.target.value)}
                      >
                        <MenuItem value="gpt-4o">GPT-4o (Recommended)</MenuItem>
                        <MenuItem value="gpt-4">GPT-4</MenuItem>
                        <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                        <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                        <MenuItem value="gpt-4o-mini">GPT-4o Mini</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Max Tokens"
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Number(e.target.value))}
                      fullWidth
                      inputProps={{ min: 100, max: 4096 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography gutterBottom>
                        Temperature: {temperature}
                      </Typography>
                      <Slider
                        value={temperature}
                        onChange={(_, value) => setTemperature(value as number)}
                        min={0}
                        max={1}
                        step={0.1}
                        marks={[
                          { value: 0, label: 'Focused' },
                          { value: 0.5, label: 'Balanced' },
                          { value: 1, label: 'Creative' }
                        ]}
                      />
                    </Box>
                  </Grid>
                </Grid>

                {/* Preview Generated Prompt */}
                {selectedTemplate && selectedIssue && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PreviewIcon />}
                      onClick={() => setPreviewOpen(true)}
                    >
                      Preview Generated Prompt
                    </Button>
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                {/* Navigation */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    startIcon={<ArrowBackIcon />}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={generateInstructions}
                    disabled={loading || !selectedTemplate || !selectedIssue}
                    endIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  >
                    {loading ? 'Generating...' : 'Generate Instructions'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Step 4: Generated Instructions */}
        {activeStep === 3 && finalInstructions && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generated Instructions
                </Typography>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={responseTab} onChange={(_, newValue) => setResponseTab(newValue)}>
                    <Tab label="AI Instructions" />
                    <Tab label="Source Prompt" />
                  </Tabs>
                </Box>

                {responseTab === 0 && (
                  <Box>
                    {finalInstructions.usage && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Model: {finalInstructions.model} | 
                          Tokens: {finalInstructions.usage.prompt_tokens} in, {finalInstructions.usage.completion_tokens} out
                        </Typography>
                      </Box>
                    )}

                    <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2, maxHeight: 500, overflow: 'auto' }}>
                      <ReactMarkdown>{finalInstructions.response}</ReactMarkdown>
                    </Paper>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => copyToClipboard(finalInstructions.response)}
                      >
                        Copy Instructions
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => downloadAsFile(
                          finalInstructions.response, 
                          `instructions-${selectedIssue?.key || 'issue'}.md`
                        )}
                      >
                        Download as MD
                      </Button>
                    </Box>
                  </Box>
                )}

                {responseTab === 1 && generatedPrompt && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Populated Template + Issue Context:
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2, maxHeight: 400, overflow: 'auto' }}>
                      <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                        {generatedPrompt.finalPrompt}
                      </Typography>
                    </Paper>
                    <Button
                      variant="outlined"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(generatedPrompt.finalPrompt)}
                    >
                      Copy Source Prompt
                    </Button>
                  </Box>
                )}

                {/* Navigation */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setActiveStep(0);
                      setSelectedTemplate(null);
                      setSelectedIssue(null);
                      setGeneratedPrompt(null);
                      setFinalInstructions(null);
                      setError(null);
                    }}
                  >
                    Start Over
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(2)}
                    startIcon={<ArrowBackIcon />}
                  >
                    Generate Again
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Preview Generated Prompt</DialogTitle>
        <DialogContent>
          {selectedTemplate && selectedIssue && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Template + Issue Data:
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                  {populateTemplate(selectedTemplate.bodyMd, selectedIssue).finalPrompt}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Copy Notification */}
      {copyNotification && (
        <Alert 
          severity="success" 
          sx={{ 
            position: 'fixed', 
            top: 20, 
            right: 20, 
            zIndex: 9999 
          }}
        >
          Copied to clipboard!
        </Alert>
      )}
    </Box>
  );
};

export default IssueToPromptPage; 