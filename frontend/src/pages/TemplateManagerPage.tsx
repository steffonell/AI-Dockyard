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
} from '@mui/material';
import {
  Add as AddIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
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
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Page Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Template Manager
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Create, manage, and organize prompt templates with markdown support
      </Typography>

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="template manager tabs">
            <Tab
              label={editingTemplate ? "Edit Template" : "Add Template"}
              icon={editingTemplate ? <EditIcon /> : <AddIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Templates (${templates.length})`}
              icon={<VisibilityIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Add/Edit Template Form */}
        <TabPanel value={activeTab} index={0}>
          <form onSubmit={handleSubmit}>
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

              {/* Template Basic Information */}
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
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.category}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => handleFieldChange('category', e.target.value)}
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
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                    />
                  }
                  label="Active Template"
                />
              </Grid>

              {/* Markdown Content Editor */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Template Content (Markdown)
                  </Typography>
                  <Button
                    startIcon={showPreview ? <VisibilityOffIcon /> : <PreviewIcon />}
                    onClick={() => setShowPreview(!showPreview)}
                    variant="outlined"
                    size="small"
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={showPreview ? 6 : 12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={12}
                      label="Markdown Content"
                      value={formData.bodyMd}
                      onChange={(e) => handleFieldChange('bodyMd', e.target.value)}
                      error={!!formErrors.bodyMd}
                      helperText={formErrors.bodyMd || 'Use {variable_name} syntax for template variables'}
                      placeholder="# Template Title&#10;&#10;Write your template content in markdown...&#10;&#10;Use {variable_name} for dynamic content"
                      required
                    />
                  </Grid>

                  {/* Markdown Preview */}
                  {showPreview && (
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, height: 312, overflow: 'auto', bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Preview:
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {formData.bodyMd ? (
                          <ReactMarkdown>{formData.bodyMd}</ReactMarkdown>
                        ) : (
                          <Typography color="text.secondary" fontStyle="italic">
                            Start typing to see preview...
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Grid>

              {/* Form Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  {editingTemplate && (
                    <Button
                      variant="outlined"
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
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        {/* Templates List */}
        <TabPanel value={activeTab} index={1}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No templates found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Create your first template to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setActiveTab(0)}
                sx={{ mt: 2 }}
              >
                Add Template
              </Button>
            </Box>
          ) : (
            <List>
              {templates.map((template) => (
                <Card key={template.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6">
                            {template.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={template.isActive ? 'Active' : 'Inactive'}
                            color={template.isActive ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Created: {new Date(template.createdAt).toLocaleDateString()}
                          {template.updatedAt !== template.createdAt && (
                            <> • Updated: {new Date(template.updatedAt).toLocaleDateString()}</>
                          )}
                        </Typography>

                        <Box sx={{ maxHeight: 100, overflow: 'hidden' }}>
                          <Typography variant="body2" sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {template.bodyMd}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                        <IconButton
                          onClick={() => handleEditTemplate(template)}
                          color="primary"
                          title="Edit template"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            setTemplateToDelete(template);
                            setDeleteDialogOpen(true);
                          }}
                          color="error"
                          title="Delete template"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
          )}
        </TabPanel>
      </Paper>

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