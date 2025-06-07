import React, { useState } from 'react';
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
  IconButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { apiClient } from '../services/apiClient';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
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

const PromptWizardPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: '' }
  ]);
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [instructions, setInstructions] = useState('');
  const [response, setResponse] = useState<ChatCompletionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const addMessage = () => {
    setMessages([...messages, { role: 'user', content: '' }]);
  };

  const updateMessage = (index: number, field: keyof Message, value: string) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = { ...updatedMessages[index], [field]: value };
    setMessages(updatedMessages);
  };

  const removeMessage = (index: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (messages.some(msg => !msg.content.trim())) {
      setError('All messages must have content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/prompts/chat-completion', {
        messages: messages.filter(msg => msg.content.trim()),
        model,
        temperature,
        max_tokens: maxTokens,
        instructions: instructions.trim() || undefined
      });

      const data: ChatCompletionResponse = response.data;
      setResponse(data);
      setActiveTab(1); // Switch to response tab
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Chat Completion
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Configuration" />
          <Tab label="Response" disabled={!response} />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          {/* Model Configuration */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Model Configuration
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={model}
                    label="Model"
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <MenuItem value="gpt-4">GPT-4</MenuItem>
                    <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                    <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                    <MenuItem value="gpt-4o">GPT-4o</MenuItem>
                    <MenuItem value="gpt-4o-mini">GPT-4o Mini</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Max Tokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  sx={{ width: 150 }}
                  inputProps={{ min: 1, max: 4096 }}
                />
              </Box>

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
                    { value: 0, label: 'Focused' },
                    { value: 1, label: 'Balanced' },
                    { value: 2, label: 'Creative' }
                  ]}
                />
              </Box>

              <TextField
                label="Instructions (Optional)"
                multiline
                rows={2}
                fullWidth
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="High-level instructions for the AI's behavior..."
              />
            </CardContent>
          </Card>

          {/* Messages Configuration */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Messages
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
                <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel size="small">Role</InputLabel>
                      <Select
                        size="small"
                        value={message.role}
                        label="Role"
                        onChange={(e) => updateMessage(index, 'role', e.target.value as Message['role'])}
                      >
                        <MenuItem value="system">System</MenuItem>
                        <MenuItem value="developer">Developer</MenuItem>
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="assistant">Assistant</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Chip 
                      label={`Message ${index + 1}`} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                    
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
                  />
                </Paper>
              ))}
            </CardContent>
          </Card>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || messages.some(msg => !msg.content.trim())}
            size="large"
            sx={{ mb: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Completion'}
          </Button>
        </Box>
      )}

      {activeTab === 1 && response && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Response
            </Typography>
            
            {response.usage && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Model: {response.model} | 
                  Tokens: {response.usage.prompt_tokens} in, {response.usage.completion_tokens} out, {response.usage.total_tokens} total
                </Typography>
              </Box>
            )}
            
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="body1" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {response.response}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PromptWizardPage; 