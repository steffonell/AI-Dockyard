import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  FormHelperText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Switch,
  FormControlLabel,
  Container,
  Stack,
  Fade,
  Slide,
  Zoom,
  Avatar,
  CardActions,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AutoAwesome as AutoAwesomeIcon,
  Code as CodeIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FileCopy as FileCopyIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { PromptTemplate, ValidationRule, ApiResponse, NotificationState } from '../types';
import TemplateService, { CreateTemplateData, UpdateTemplateData } from '../services/templateService';
import CompanyService, { Company } from '../services/companyService';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../types';

// TypeScript interfaces for template management
interface TemplateFormData {
  name: string;
  bodyMd: string;
  category: string;
  isActive: boolean;
  lintJson: any;
}

interface TemplateFormErrors {
  name?: string;
  bodyMd?: string;
  category?: string;
  isActive?: string;
  lintJson?: string;
}

interface TemplateCategory {
  value: string;
  label: string;
}

// Predefined categories for templates
const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { value: 'bug-fix', label: 'Bug Fix' },
  { value: 'feature', label: 'Feature Development' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'testing', label: 'Testing' },
  { value: 'code-review', label: 'Code Review' },
  { value: 'refactoring', label: 'Refactoring' },
  { value: 'general', label: 'General' },
];

// Validation rules for form fields
const VALIDATION_RULES: Record<keyof TemplateFormData, ValidationRule> = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  bodyMd: {
    required: true,
    minLength: 10,
    maxLength: 10000,
  },
  category: {
    required: true,
  },
  isActive: {},
  lintJson: {},
};

// Tab panel component for organizing different views
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const TemplateManagerPage: React.FC = () => {
  // Get user context from auth store
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  
  // State management for form data and UI
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    bodyMd: '',
    category: '',
    isActive: true,
    lintJson: {},
  });
  const [formErrors, setFormErrors] = useState<TemplateFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<PromptTemplate | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Form validation function
  const validateField = useCallback((name: keyof TemplateFormData, value: any): string | undefined => {
    const rule = VALIDATION_RULES[name];
    
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }
    
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${name.charAt(0).toUpperCase() + name.slice(1)} must be at least ${rule.minLength} characters`;
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${name.charAt(0).toUpperCase() + name.slice(1)} must not exceed ${rule.maxLength} characters`;
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        return `${name.charAt(0).toUpperCase() + name.slice(1)} format is invalid`;
      }
    }
    
    if (rule.custom) {
      return rule.custom(value);
    }
    
    return undefined;
  }, []);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const errors: TemplateFormErrors = {};
    let isValid = true;

    // Only validate fields that have validation rules and can have errors
    const fieldsToValidate: (keyof TemplateFormData)[] = ['name', 'bodyMd', 'category'];
    
    fieldsToValidate.forEach((fieldName) => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        errors[fieldName] = error;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  }, [formData, validateField]);

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof TemplateFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing (only for fields that can have errors)
    if (field in formErrors && formErrors[field as keyof TemplateFormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  }, [formErrors]);

  // Handle form submission
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: 'Please fix the validation errors before submitting',
        autoHide: true,
        duration: 5000,
      });
      return;
    }

    if (!selectedCompanyId) {
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: 'Please select a company first',
        autoHide: true,
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingTemplate) {
        // Update existing template
        const updateData: UpdateTemplateData = {
          name: formData.name,
          bodyMd: formData.bodyMd,
          isActive: formData.isActive,
          lintJson: formData.lintJson,
        };
        
        const updatedTemplate = await TemplateService.updateTemplate(editingTemplate.id, updateData);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updatedTemplate : t));
        setNotification({
          id: Date.now().toString(),
          type: 'success',
          message: 'Template updated successfully!',
          autoHide: true,
          duration: 3000,
        });
        setEditingTemplate(null);
      } else {
        // Create new template
        const createData: CreateTemplateData = {
          companyId: selectedCompanyId,
          name: formData.name,
          bodyMd: formData.bodyMd,
          lintJson: formData.lintJson,
        };
        
        const newTemplate = await TemplateService.createTemplate(createData);
        setTemplates(prev => [...prev, newTemplate]);
        setNotification({
          id: Date.now().toString(),
          type: 'success',
          message: 'Template created successfully!',
          autoHide: true,
          duration: 3000,
        });
      }

      // Reset form
      setFormData({
        name: '',
        bodyMd: '',
        category: '',
        isActive: true,
        lintJson: {},
      });
      setFormErrors({});
      setActiveTab(1); // Switch to templates list tab
      
    } catch (error) {
      console.error('Failed to save template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save template. Please try again.';
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: errorMessage,
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, editingTemplate, selectedCompanyId]);

  // Handle template editing
  const handleEditTemplate = useCallback((template: PromptTemplate) => {
    setFormData({
      name: template.name,
      bodyMd: template.bodyMd,
      category: 'general', // Default category since it's not in the PromptTemplate interface
      isActive: template.isActive,
      lintJson: template.lintJson,
    });
    setEditingTemplate(template);
    setActiveTab(0); // Switch to form tab
  }, []);

  // Handle template deletion
  const handleDeleteTemplate = useCallback(async (template: PromptTemplate) => {
    setIsLoading(true);
    
    try {
      await TemplateService.deleteTemplate(template.id);
      
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      setNotification({
        id: Date.now().toString(),
        type: 'success',
        message: 'Template deleted successfully!',
        autoHide: true,
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to delete template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete template. Please try again.';
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: errorMessage,
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Close notification
  const handleCloseNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Toggle template expansion
  const toggleTemplateExpansion = useCallback((templateId: string) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  }, []);

  // Copy template content to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotification({
        id: Date.now().toString(),
        type: 'success',
        message: 'Template content copied to clipboard!',
        autoHide: true,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  // Filter templates based on search query
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.bodyMd.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load templates and companies on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      try {
        // Load companies first
        const companiesResponse = await CompanyService.getCompanies({ limit: 100 });
        setCompanies(companiesResponse.data);
        
        // If we have companies, select the first one by default
        if (companiesResponse.data.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(companiesResponse.data[0].id);
        }
        
        // Load templates
        const templatesResponse = await TemplateService.getTemplates({ 
          limit: 100,
          companyId: selectedCompanyId || companiesResponse.data[0]?.id 
        });
        setTemplates(templatesResponse.data);
      } catch (error) {
        console.error('Failed to load data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        setNotification({
          id: Date.now().toString(),
          type: 'error',
          message: errorMessage,
          autoHide: true,
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, selectedCompanyId]);

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <Box sx={{ flexGrow: 1, p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to access the Template Manager
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      pb: 4
    }}>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)',
        color: 'white',
        py: 6,
        mb: 4
      }}>
        <Container maxWidth="lg">
          <Fade in timeout={800}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 3,
                background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                fontSize: '2rem'
              }}>
                <CodeIcon sx={{ fontSize: '2.5rem' }} />
              </Avatar>
              <Typography variant="h2" component="h1" gutterBottom sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #FFF, #E3F2FD)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2
              }}>
                Template Manager
              </Typography>
              <Typography variant="h5" sx={{ 
                opacity: 0.9,
                mb: 4,
                maxWidth: 600,
                mx: 'auto'
              }}>
                Create, manage, and organize powerful prompt templates with markdown support
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => navigate('/issue-to-prompt')}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    }
                  }}
                >
                  Use Templates
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<TrendingUpIcon />}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  View Analytics
                </Button>
              </Stack>
            </Box>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Main Content */}
        <Slide direction="up" in timeout={600}>
          <Box>
            <Paper sx={{ 
              width: '100%',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
            }}>
            {/* Navigation Tabs */}
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                aria-label="template manager tabs"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '1rem',
                    minHeight: 72,
                  },
                  '& .Mui-selected': {
                    color: '#667eea !important',
                  },
                  '& .MuiTabs-indicator': {
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    height: 3,
                  }
                }}
              >
                <Tab
                  label={editingTemplate ? "Edit Template" : "Add Template"}
                  icon={editingTemplate ? <EditIcon /> : <AddIcon />}
                  iconPosition="start"
                />
                <Tab
                  label={`Templates (${filteredTemplates.length})`}
                  icon={<VisibilityIcon />}
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Add/Edit Template Form */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 4 }}>
                <form onSubmit={handleSubmit}>
                  <Stack spacing={4}>
                    {/* Form Header */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="h5" sx={{ 
                        fontWeight: 700,
                        color: '#2c3e50',
                        mb: 1
                      }}>
                        {editingTemplate ? 'Edit Template' : 'Create New Template'}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {editingTemplate ? 'Update your template details below' : 'Fill in the details to create a powerful new template'}
                      </Typography>
                    </Box>

                    {/* Basic Information Card */}
                    <Card sx={{ 
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                    }}>
                      <CardContent sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1, 
                          mb: 3,
                          fontWeight: 600,
                          color: '#495057'
                        }}>
                          <BusinessIcon />
                          Basic Information
                        </Typography>
                        
                        <Grid container spacing={3}>
                          {/* Company Selection */}
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                              <InputLabel>Company</InputLabel>
                              <Select
                                value={selectedCompanyId}
                                label="Company"
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                disabled={editingTemplate !== null}
                                sx={{
                                  borderRadius: 2,
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'white',
                                  }
                                }}
                              >
                                {companies.map((company) => (
                                  <MenuItem key={company.id} value={company.id}>
                                    {company.name}
                                  </MenuItem>
                                ))}
                              </Select>
                              <FormHelperText>
                                {editingTemplate ? 'Company cannot be changed when editing' : 'Select the company for this template'}
                              </FormHelperText>
                            </FormControl>
                          </Grid>

                          {/* Template Name */}
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Template Name"
                              value={formData.name}
                              onChange={(e) => handleFieldChange('name', e.target.value)}
                              error={!!formErrors.name}
                              helperText={formErrors.name}
                              placeholder="Enter a descriptive name for your template"
                              required
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  backgroundColor: 'white',
                                }
                              }}
                            />
                          </Grid>

                          {/* Category */}
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!formErrors.category}>
                              <InputLabel>Category</InputLabel>
                              <Select
                                value={formData.category}
                                label="Category"
                                onChange={(e) => handleFieldChange('category', e.target.value)}
                                sx={{
                                  borderRadius: 2,
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'white',
                                  }
                                }}
                              >
                                {TEMPLATE_CATEGORIES.map((category) => (
                                  <MenuItem key={category.value} value={category.value}>
                                    {category.label}
                                  </MenuItem>
                                ))}
                              </Select>
                              {formErrors.category && (
                                <FormHelperText>{formErrors.category}</FormHelperText>
                              )}
                            </FormControl>
                          </Grid>

                          {/* Template Status */}
                          <Grid item xs={12} md={6}>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              height: '100%',
                              backgroundColor: 'white',
                              borderRadius: 2,
                              p: 2,
                              border: '1px solid rgba(0, 0, 0, 0.12)'
                            }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.isActive}
                                    onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                                    sx={{
                                      '& .MuiSwitch-switchBase.Mui-checked': {
                                        color: '#667eea',
                                      },
                                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                        backgroundColor: '#667eea',
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body1" fontWeight={600}>
                                      Active Template
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Make this template available for use
                                    </Typography>
                                  </Box>
                                }
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>

                    {/* Markdown Content Editor */}
                    <Card sx={{ 
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                    }}>
                      <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                          <Typography variant="h6" sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            fontWeight: 600,
                            color: '#495057'
                          }}>
                            <CodeIcon />
                            Template Content (Markdown)
                          </Typography>
                          <Button
                            startIcon={showPreview ? <VisibilityOffIcon /> : <PreviewIcon />}
                            onClick={() => setShowPreview(!showPreview)}
                            variant="outlined"
                            size="small"
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                          </Button>
                        </Box>

                        <Grid container spacing={3}>
                          <Grid item xs={12} md={showPreview ? 6 : 12}>
                            <TextField
                              fullWidth
                              multiline
                              rows={16}
                              label="Markdown Content"
                              value={formData.bodyMd}
                              onChange={(e) => handleFieldChange('bodyMd', e.target.value)}
                              error={!!formErrors.bodyMd}
                              helperText={formErrors.bodyMd || 'Use {variable_name} syntax for template variables'}
                              placeholder="# Template Title&#10;&#10;Write your template content in markdown...&#10;&#10;Use {variable_name} for dynamic content"
                              required
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  backgroundColor: 'white',
                                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                  fontSize: '14px',
                                  lineHeight: 1.6,
                                }
                              }}
                            />
                          </Grid>

                          {/* Markdown Preview */}
                          {showPreview && (
                            <Grid item xs={12} md={6}>
                              <Paper sx={{ 
                                p: 3, 
                                height: 432, 
                                overflow: 'auto', 
                                bgcolor: 'white',
                                borderRadius: 2,
                                border: '1px solid rgba(0, 0, 0, 0.12)',
                              }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ 
                                  fontWeight: 600,
                                  color: '#495057',
                                  mb: 2
                                }}>
                                  Live Preview:
                                </Typography>
                                <Divider sx={{ mb: 3 }} />
                                {formData.bodyMd ? (
                                  <Box sx={{ 
                                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                                      color: '#2c3e50',
                                      marginTop: 2,
                                      marginBottom: 1,
                                    },
                                    '& p': {
                                      marginBottom: 2,
                                      lineHeight: 1.7,
                                    },
                                    '& code': {
                                      backgroundColor: '#f8f9fa',
                                      padding: '2px 6px',
                                      borderRadius: 1,
                                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                      fontSize: '0.9em',
                                    },
                                    '& pre': {
                                      backgroundColor: '#f8f9fa',
                                      padding: 2,
                                      borderRadius: 2,
                                      overflow: 'auto',
                                    }
                                  }}>
                                    <ReactMarkdown>{formData.bodyMd}</ReactMarkdown>
                                  </Box>
                                ) : (
                                  <Typography color="text.secondary" fontStyle="italic" sx={{ textAlign: 'center', py: 8 }}>
                                    Start typing to see preview...
                                  </Typography>
                                )}
                              </Paper>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>

                    {/* Form Actions */}
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
                      {editingTemplate && (
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={() => {
                            setEditingTemplate(null);
                            setFormData({
                              name: '',
                              bodyMd: '',
                              category: '',
                              isActive: true,
                              lintJson: {},
                            });
                            setFormErrors({});
                          }}
                          sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 600,
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={isSubmitting}
                        sx={{
                          background: 'linear-gradient(45deg, #667eea, #764ba2)',
                          borderRadius: 3,
                          px: 4,
                          py: 1.5,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': {
                            background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                          },
                          '&:disabled': {
                            background: 'rgba(0, 0, 0, 0.26)',
                          }
                        }}
                      >
                        {isSubmitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                      </Button>
                    </Box>
                  </Stack>
                </form>
              </Box>
            </TabPanel>

            {/* Templates List */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 3 }}>
                {/* Search Bar */}
                <Box sx={{ mb: 4 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'white',
                        }
                      }
                    }}
                  />
                </Box>

                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                    <CircularProgress size={60} thickness={4} />
                  </Box>
                ) : filteredTemplates.length === 0 ? (
                  <Fade in timeout={600}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 8,
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                      borderRadius: 4,
                      border: '2px dashed #ccc'
                    }}>
                      <Avatar sx={{ 
                        width: 80, 
                        height: 80, 
                        mx: 'auto', 
                        mb: 3,
                        background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      }}>
                        <CodeIcon sx={{ fontSize: '2.5rem', color: 'white' }} />
                      </Avatar>
                      <Typography variant="h5" color="text.secondary" gutterBottom>
                        {searchQuery ? 'No templates match your search' : 'No templates found'}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                        {searchQuery 
                          ? 'Try adjusting your search terms or clear the search to see all templates'
                          : 'Create your first template to get started with organized prompt management'
                        }
                      </Typography>
                      {!searchQuery && (
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<AddIcon />}
                          onClick={() => setActiveTab(0)}
                          sx={{
                            background: 'linear-gradient(45deg, #667eea, #764ba2)',
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            '&:hover': {
                              background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                            }
                          }}
                        >
                          Create Your First Template
                        </Button>
                      )}
                    </Box>
                  </Fade>
                ) : (
                  <Grid container spacing={3}>
                    {filteredTemplates.map((template, index) => (
                      <Grid item xs={12} md={6} lg={4} key={template.id}>
                        <Zoom in timeout={400 + index * 100}>
                          <Card sx={{ 
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                              '& .template-actions': {
                                opacity: 1,
                                transform: 'translateY(0)',
                              }
                            }
                          }}>
                            <CardContent sx={{ flexGrow: 1, p: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="h6" sx={{ 
                                    fontWeight: 700,
                                    color: '#2c3e50',
                                    mb: 1,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}>
                                    {template.name}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={template.isActive ? 'Active' : 'Inactive'}
                                    color={template.isActive ? 'success' : 'default'}
                                    variant="filled"
                                    sx={{
                                      fontWeight: 600,
                                      borderRadius: 2,
                                    }}
                                  />
                                </Box>
                                <Tooltip title="Mark as favorite">
                                  <IconButton size="small" sx={{ color: '#ffd700' }}>
                                    <StarIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  Created {new Date(template.createdAt).toLocaleDateString()}
                                  {template.updatedAt !== template.createdAt && (
                                    <> • Updated {new Date(template.updatedAt).toLocaleDateString()}</>
                                  )}
                                </Typography>
                              </Box>

                              <Collapse in={!expandedTemplates.has(template.id)}>
                                <Typography variant="body2" color="text.secondary" sx={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: 1.6,
                                  mb: 2,
                                }}>
                                  {template.bodyMd}
                                </Typography>
                              </Collapse>

                              <Collapse in={expandedTemplates.has(template.id)}>
                                <Paper sx={{ 
                                  p: 2, 
                                  mb: 2, 
                                  bgcolor: 'grey.50',
                                  borderRadius: 2,
                                  maxHeight: 200,
                                  overflow: 'auto'
                                }}>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                    {template.bodyMd}
                                  </Typography>
                                </Paper>
                              </Collapse>

                              <Button
                                size="small"
                                startIcon={expandedTemplates.has(template.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                onClick={() => toggleTemplateExpansion(template.id)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                              >
                                {expandedTemplates.has(template.id) ? 'Show Less' : 'Show More'}
                              </Button>
                            </CardContent>

                            <CardActions className="template-actions" sx={{ 
                              p: 0,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              opacity: 0,
                              transform: 'translateY(10px)',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}>
                              <Stack direction="row" sx={{ width: '100%' }}>
                                <Tooltip title="Copy to clipboard">
                                  <Button
                                    fullWidth
                                    startIcon={<FileCopyIcon />}
                                    onClick={() => copyToClipboard(template.bodyMd)}
                                    sx={{ 
                                      color: 'white',
                                      borderRadius: 0,
                                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                                    }}
                                  >
                                    Copy
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Edit template">
                                  <Button
                                    fullWidth
                                    startIcon={<EditIcon />}
                                    onClick={() => handleEditTemplate(template)}
                                    sx={{ 
                                      color: 'white',
                                      borderRadius: 0,
                                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Delete template">
                                  <Button
                                    fullWidth
                                    startIcon={<DeleteIcon />}
                                    onClick={() => {
                                      setTemplateToDelete(template);
                                      setDeleteDialogOpen(true);
                                    }}
                                    sx={{ 
                                      color: 'white',
                                      borderRadius: 0,
                                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </Tooltip>
                              </Stack>
                            </CardActions>
                          </Card>
                        </Zoom>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </TabPanel>
            </Paper>
          </Box>
        </Slide>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template "{templateToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => templateToDelete && handleDeleteTemplate(templateToDelete)}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={notification?.autoHide ? notification.duration : null}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TemplateManagerPage; 