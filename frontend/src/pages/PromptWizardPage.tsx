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
  Slider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Chip,
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
  Grid,
  Divider,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Fade,
  Skeleton,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  AutoAwesome as AutoAwesomeIcon,
  Settings as SettingsIcon,
  Lightbulb as LightbulbIcon,
  Code as CodeIcon,
  Article as ArticleIcon,
  Psychology as PsychologyIcon,
  Science as ScienceIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Star as StarIcon,
  Share as ShareIcon,
  Clear as ClearIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
  timestamp: Date;
}

interface ChatCompletionResponse {
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  messages: Message[];
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

interface PromptHistory {
  id: string;
  name: string;
  messages: Message[];
  response?: ChatCompletionResponse;
  timestamp: Date;
  favorite?: boolean;
}

const PRESET_TEMPLATES: PromptTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review Assistant',
    description: 'Comprehensive code review with best practices',
    category: 'Development',
    messages: [
      {
        id: '1',
        role: 'system',
        content: 'You are a senior software engineer conducting a thorough code review. Focus on code quality, security, performance, and best practices. Provide constructive feedback with specific suggestions for improvement.',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: 'Please review the following code and provide detailed feedback:\n\n[Paste your code here]',
        timestamp: new Date(),
      },
    ],
    settings: { model: 'gpt-4o', temperature: 0.3, maxTokens: 2000 },
  },
  {
    id: 'bug-debugger',
    name: 'Bug Debugging Expert',
    description: 'Step-by-step debugging assistance',
    category: 'Development',
    messages: [
      {
        id: '1',
        role: 'system',
        content: 'You are an expert debugging assistant. Help identify the root cause of bugs and provide step-by-step solutions. Ask clarifying questions when needed and explain your reasoning.',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: 'I\'m experiencing the following bug:\n\nProblem: [Describe the issue]\nExpected behavior: [What should happen]\nActual behavior: [What actually happens]\nCode snippet: [Relevant code]',
        timestamp: new Date(),
      },
    ],
    settings: { model: 'gpt-4o', temperature: 0.4, maxTokens: 2500 },
  },
  {
    id: 'feature-architect',
    name: 'Feature Architecture Guide',
    description: 'Plan and architect new features',
    category: 'Architecture',
    messages: [
      {
        id: '1',
        role: 'system',
        content: 'You are a senior software architect. Help design and plan new features with consideration for scalability, maintainability, and best practices. Provide detailed implementation strategies.',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: 'I need to implement a new feature:\n\nFeature description: [Describe the feature]\nRequirements: [List key requirements]\nConstraints: [Any limitations or constraints]\nExisting architecture: [Brief description of current system]',
        timestamp: new Date(),
      },
    ],
    settings: { model: 'gpt-4', temperature: 0.5, maxTokens: 3000 },
  },
  {
    id: 'documentation-writer',
    name: 'Documentation Writer',
    description: 'Generate comprehensive documentation',
    category: 'Documentation',
    messages: [
      {
        id: '1',
        role: 'system',
        content: 'You are a technical documentation expert. Create clear, comprehensive, and well-structured documentation that is easy to understand for developers at all levels.',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: 'Please create documentation for:\n\nTopic: [What needs documentation]\nAudience: [Who will read this]\nScope: [What should be covered]\nExisting code/features: [Relevant context]',
        timestamp: new Date(),
      },
    ],
    settings: { model: 'gpt-4o', temperature: 0.6, maxTokens: 3000 },
  },
  {
    id: 'test-generator',
    name: 'Test Case Generator',
    description: 'Generate comprehensive test cases',
    category: 'Testing',
    messages: [
      {
        id: '1',
        role: 'system',
        content: 'You are a QA engineer and testing expert. Generate comprehensive test cases including unit tests, integration tests, and edge cases. Focus on thorough coverage and realistic scenarios.',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: 'Generate test cases for:\n\nFunction/Feature: [What to test]\nProgramming language: [Language/framework]\nTest type: [Unit/Integration/E2E]\nCode to test: [Relevant code snippet]',
        timestamp: new Date(),
      },
    ],
    settings: { model: 'gpt-4o', temperature: 0.4, maxTokens: 2500 },
  },
];

const PromptWizardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'system', 
      content: '', 
      timestamp: new Date() 
    }
  ]);
  
  // AI Settings
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [streamResponse, setStreamResponse] = useState(true);
  
  // UI State
  const [response, setResponse] = useState<ChatCompletionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<PromptHistory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [responseTab, setResponseTab] = useState(0);
  const [copyNotification, setCopyNotification] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Load prompt history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('promptHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setPromptHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        })));
      } catch (error) {
        console.error('Failed to load prompt history:', error);
      }
    }
  }, []);

  // Save prompt history to localStorage
  const saveToHistory = (messages: Message[], response?: ChatCompletionResponse) => {
    const historyItem: PromptHistory = {
      id: Date.now().toString(),
      name: messages.find(m => m.role === 'user')?.content.substring(0, 50) + '...' || 'Untitled Prompt',
      messages,
      response,
      timestamp: new Date(),
    };

    const newHistory = [historyItem, ...promptHistory].slice(0, 20); // Keep last 20
    setPromptHistory(newHistory);
    localStorage.setItem('promptHistory', JSON.stringify(newHistory));
  };

  const addMessage = () => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: '',
      timestamp: new Date(),
    };
    setMessages([...messages, newMessage]);
  };

  const updateMessage = (index: number, field: keyof Message, value: string | Date) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = { 
      ...updatedMessages[index], 
      [field]: value,
      timestamp: field === 'content' ? new Date() : updatedMessages[index].timestamp
    };
    setMessages(updatedMessages);
  };

  const removeMessage = (index: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const clearAllMessages = () => {
    setMessages([{ 
      id: '1', 
      role: 'system', 
      content: '', 
      timestamp: new Date() 
    }]);
    setResponse(null);
    setError(null);
  };

  const loadTemplate = (template: PromptTemplate) => {
    setMessages(template.messages);
    setModel(template.settings.model);
    setTemperature(template.settings.temperature);
    setMaxTokens(template.settings.maxTokens);
    setSelectedTemplate(template);
    setTemplateDialogOpen(false);
    setResponse(null);
    setError(null);
  };

  const loadFromHistory = (historyItem: PromptHistory) => {
    setMessages(historyItem.messages);
    if (historyItem.response) {
      setResponse(historyItem.response);
    }
    setHistoryDialogOpen(false);
  };

  const toggleFavorite = (historyId: string) => {
    const newHistory = promptHistory.map(item => 
      item.id === historyId 
        ? { ...item, favorite: !item.favorite }
        : item
    );
    setPromptHistory(newHistory);
    localStorage.setItem('promptHistory', JSON.stringify(newHistory));
  };

  const handleSubmit = async () => {
    const validMessages = messages.filter(msg => msg.content.trim());
    
    if (validMessages.length === 0) {
      setError('At least one message must have content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestPayload = {
        messages: validMessages.map(msg => ({
          role: msg.role,
          content: msg.content.trim()
        })),
        model,
        temperature,
        max_tokens: maxTokens,
      };

      const response = await apiClient.post('/prompts/chat-completion', requestPayload);
      const data: ChatCompletionResponse = response.data;
      
      setResponse(data);
      saveToHistory(validMessages, data);
      setActiveTab(1); // Switch to response tab
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
      setError(errorMessage);
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

  const downloadResponse = () => {
    if (!response) return;
    
    const content = `# AI Response (${model})\n\n${response.response}\n\n---\n\n## Metadata\n- Model: ${response.model}\n- Tokens: ${response.usage?.total_tokens || 'N/A'}\n- Generated: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-response-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Development': return <CodeIcon />;
      case 'Architecture': return <ScienceIcon />;
      case 'Documentation': return <ArticleIcon />;
      case 'Testing': return <PsychologyIcon />;
      default: return <LightbulbIcon />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system': return '#1976d2';
      case 'user': return '#43a047';
      case 'assistant': return '#ff7043';
      case 'developer': return '#8e24aa';
      default: return '#9e9e9e';
    }
  };

  const getModelDisplayName = (modelName: string) => {
    const models: Record<string, string> = {
      'gpt-4o': 'GPT-4o (Latest)',
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-4o-mini': 'GPT-4o Mini',
    };
    return models[modelName] || modelName;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            AI Prompt Wizard ✨
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Load Template">
              <IconButton onClick={() => setTemplateDialogOpen(true)} color="primary">
                <AutoAwesomeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View History">
              <IconButton onClick={() => setHistoryDialogOpen(true)} color="primary">
                <HistoryIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear All">
              <IconButton onClick={clearAllMessages} color="error">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Create powerful AI prompts with templates, history, and advanced settings
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            label="Prompt Builder" 
            icon={<SettingsIcon />} 
            iconPosition="start"
          />
          <Tab 
            label={`Response ${response ? '✓' : ''}`} 
            icon={<AutoAwesomeIcon />} 
            iconPosition="start"
            disabled={!response}
          />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Left Column - Messages */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PsychologyIcon color="primary" />
                    Messages ({messages.length})
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addMessage}
                    variant="outlined"
                    size="small"
                  >
                    Add Message
                  </Button>
                </Box>

                {messages.map((message, index) => (
                  <Card 
                    key={message.id} 
                    sx={{ 
                      mb: 2, 
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: getRoleColor(message.role) }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: getRoleColor(message.role), width: 32, height: 32 }}>
                          {message.role.charAt(0).toUpperCase()}
                        </Avatar>
                        
                        <FormControl sx={{ minWidth: 120 }}>
                          <InputLabel size="small">Role</InputLabel>
                          <Select
                            size="small"
                            value={message.role}
                            label="Role"
                            onChange={(e) => updateMessage(index, 'role', e.target.value as Message['role'])}
                          >
                            <MenuItem value="system">🔧 System</MenuItem>
                            <MenuItem value="developer">👨‍💻 Developer</MenuItem>
                            <MenuItem value="user">👤 User</MenuItem>
                            <MenuItem value="assistant">🤖 Assistant</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <Chip 
                          label={`Message ${index + 1}`} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                        
                        <Box sx={{ flexGrow: 1 }} />
                        
                        {messages.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => removeMessage(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                      
                      <TextField
                        multiline
                        rows={4}
                        fullWidth
                        value={message.content}
                        onChange={(e) => updateMessage(index, 'content', e.target.value)}
                        placeholder={`Enter ${message.role} message content...`}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&:hover fieldset': {
                              borderColor: getRoleColor(message.role),
                            },
                          },
                        }}
                      />
                    </CardContent>
                  </Card>
                ))}

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || messages.every(msg => !msg.content.trim())}
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                    sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                      }
                    }}
                  >
                    {loading ? 'Generating...' : 'Generate Response'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => {
                      const validMessages = messages.filter(msg => msg.content.trim());
                      if (validMessages.length > 0) {
                        saveToHistory(validMessages);
                        setCopyNotification(true);
                        setTimeout(() => setCopyNotification(false), 2000);
                      }
                    }}
                    disabled={messages.every(msg => !msg.content.trim())}
                  >
                    Save to History
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Settings */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="primary" />
                  AI Configuration
                </Typography>

                {/* Selected Template */}
                {selectedTemplate && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">
                      Using template: {selectedTemplate.name}
                    </Typography>
                  </Alert>
                )}

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={model}
                    label="Model"
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <MenuItem value="gpt-4o">🚀 GPT-4o (Latest)</MenuItem>
                    <MenuItem value="gpt-4">🎯 GPT-4</MenuItem>
                    <MenuItem value="gpt-4-turbo">⚡ GPT-4 Turbo</MenuItem>
                    <MenuItem value="gpt-3.5-turbo">💨 GPT-3.5 Turbo</MenuItem>
                    <MenuItem value="gpt-4o-mini">🔥 GPT-4o Mini</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Max Tokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 100, max: 4096 }}
                />

                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Temperature: {temperature}
                  </Typography>
                  <Slider
                    value={temperature}
                    onChange={(_, value) => setTemperature(value as number)}
                    min={0}
                    max={2}
                    step={0.1}
                    marks={[
                      { value: 0, label: '🎯 Focused' },
                      { value: 1, label: '⚖️ Balanced' },
                      { value: 2, label: '🎨 Creative' }
                    ]}
                  />
                </Box>

                <Accordion expanded={showAdvancedSettings} onChange={() => setShowAdvancedSettings(!showAdvancedSettings)}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Advanced Settings</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={streamResponse}
                          onChange={(e) => setStreamResponse(e.target.checked)}
                        />
                      }
                      label="Stream Response"
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Quick Stats */}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Prompt Statistics
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Messages:
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {messages.filter(m => m.content.trim()).length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Estimated tokens:
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    ~{Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Model:
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {getModelDisplayName(model)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && response && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" />
                AI Response
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyToClipboard(response.response)}
                  size="small"
                >
                  Copy
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadResponse}
                  size="small"
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  size="small"
                >
                  Share
                </Button>
              </Box>
            </Box>
            
            {response.usage && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Model: {response.model} | 
                  Tokens: {response.usage.prompt_tokens} in, {response.usage.completion_tokens} out, {response.usage.total_tokens} total
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(response.usage.total_tokens / maxTokens) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={responseTab} onChange={(_, newValue) => setResponseTab(newValue)}>
                <Tab label="📄 Formatted" />
                <Tab label="📝 Raw Text" />
                <Tab label="🔍 Preview" />
              </Tabs>
            </Box>

            {responseTab === 0 && (
              <Paper sx={{ p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
                <ReactMarkdown>{response.response}</ReactMarkdown>
              </Paper>
            )}

            {responseTab === 1 && (
              <Paper sx={{ p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
                <Typography 
                  component="pre" 
                  sx={{ 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.6
                  }}
                >
                  {response.response}
                </Typography>
              </Paper>
            )}

            {responseTab === 2 && (
              <Paper sx={{ p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Preview as it would appear in documentation:
                </Typography>
                <Box sx={{ 
                  backgroundColor: 'white', 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <ReactMarkdown>{response.response}</ReactMarkdown>
                </Box>
              </Paper>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="primary" />
            Choose a Template
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {PRESET_TEMPLATES.map((template) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { 
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: 3
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onClick={() => loadTemplate(template)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {getCategoryIcon(template.category)}
                      </Avatar>
                      <Typography variant="h6">
                        {template.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {template.description}
                    </Typography>
                    <Chip 
                      label={template.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            Prompt History ({promptHistory.length})
          </Box>
        </DialogTitle>
        <DialogContent>
          {promptHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No prompt history yet. Start creating prompts to see them here!
              </Typography>
            </Box>
          ) : (
            <List>
              {promptHistory.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    onClick={() => loadFromHistory(item)}
                    sx={{ borderRadius: 1, mb: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {item.name}
                          </Typography>
                          {item.favorite && <StarIcon color="warning" fontSize="small" />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {item.messages.length} messages • {item.timestamp.toLocaleDateString()}
                          </Typography>
                          {item.response && (
                            <Chip 
                              label="Has Response" 
                              size="small" 
                              color="success" 
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      size="small"
                    >
                      <StarIcon color={item.favorite ? 'warning' : 'action'} />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Notification */}
      <Snackbar
        open={copyNotification}
        autoHideDuration={2000}
        onClose={() => setCopyNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled">
          Copied to clipboard! 📋
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PromptWizardPage; 