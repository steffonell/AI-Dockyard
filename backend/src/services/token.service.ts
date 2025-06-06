import { logger } from '../utils/logger';

export class TokenService {
  // Approximate token estimation based on character count
  // This is a simplified estimation - for production, you might want to use tiktoken or similar
  private readonly CHARS_PER_TOKEN = 4; // Average characters per token for most models

  estimateTokens(text: string): number {
    if (!text) return 0;
    
    // Basic estimation: divide character count by average chars per token
    const charCount = text.length;
    const estimatedTokens = Math.ceil(charCount / this.CHARS_PER_TOKEN);
    
    logger.debug('Token estimation', {
      charCount,
      estimatedTokens,
      textPreview: text.substring(0, 100)
    });

    return estimatedTokens;
  }

  estimateTokensForPrompt(promptText: string): {
    totalTokens: number;
    inputTokens: number;
    breakdown: {
      characters: number;
      words: number;
      lines: number;
    };
  } {
    const characters = promptText.length;
    const words = promptText.split(/\s+/).filter(word => word.length > 0).length;
    const lines = promptText.split('\n').length;
    
    // More sophisticated estimation considering structure
    let totalTokens = this.estimateTokens(promptText);
    
    // Add some tokens for formatting and structure
    const structureTokens = Math.ceil(lines * 0.1); // Small overhead for line breaks
    totalTokens += structureTokens;

    return {
      totalTokens,
      inputTokens: totalTokens, // For input prompts, these are the same
      breakdown: {
        characters,
        words,
        lines
      }
    };
  }

  calculateCost(inputTokens: number, outputTokens: number = 0, model: string = 'gpt-3.5-turbo'): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  } {
    // Pricing per 1K tokens (as of 2024 - these should be configurable)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Math.round(inputCost * 10000) / 10000, // Round to 4 decimal places
      outputCost: Math.round(outputCost * 10000) / 10000,
      totalCost: Math.round(totalCost * 10000) / 10000,
      currency: 'USD'
    };
  }

  getTokenLimits(model: string = 'gpt-3.5-turbo'): {
    maxTokens: number;
    maxInputTokens: number;
    maxOutputTokens: number;
  } {
    const limits: Record<string, { max: number; maxInput: number; maxOutput: number }> = {
      'gpt-3.5-turbo': { max: 4096, maxInput: 3000, maxOutput: 1096 },
      'gpt-4': { max: 8192, maxInput: 6000, maxOutput: 2192 },
      'gpt-4-turbo': { max: 128000, maxInput: 100000, maxOutput: 28000 },
      'gpt-4-32k': { max: 32768, maxInput: 24000, maxOutput: 8768 },
      'claude-3-sonnet': { max: 200000, maxInput: 150000, maxOutput: 50000 },
      'claude-3-haiku': { max: 200000, maxInput: 150000, maxOutput: 50000 }
    };

    const modelLimits = limits[model] || limits['gpt-3.5-turbo'];

    return {
      maxTokens: modelLimits.max,
      maxInputTokens: modelLimits.maxInput,
      maxOutputTokens: modelLimits.maxOutput
    };
  }

  validatePromptLength(promptText: string, model: string = 'gpt-3.5-turbo'): {
    isValid: boolean;
    tokenCount: number;
    maxTokens: number;
    warnings: string[];
  } {
    const tokenCount = this.estimateTokens(promptText);
    const limits = this.getTokenLimits(model);
    const warnings: string[] = [];

    // Check if prompt exceeds input token limit
    const isValid = tokenCount <= limits.maxInputTokens;

    if (tokenCount > limits.maxInputTokens * 0.9) {
      warnings.push(`Prompt is approaching token limit (${tokenCount}/${limits.maxInputTokens})`);
    }

    if (tokenCount > limits.maxInputTokens * 0.8) {
      warnings.push('Consider shortening the prompt for better performance');
    }

    if (!isValid) {
      warnings.push(`Prompt exceeds maximum token limit for ${model}`);
    }

    return {
      isValid,
      tokenCount,
      maxTokens: limits.maxInputTokens,
      warnings
    };
  }

  optimizePrompt(promptText: string, targetTokens: number): {
    optimizedPrompt: string;
    originalTokens: number;
    optimizedTokens: number;
    reductionPercentage: number;
  } {
    const originalTokens = this.estimateTokens(promptText);
    
    if (originalTokens <= targetTokens) {
      return {
        optimizedPrompt: promptText,
        originalTokens,
        optimizedTokens: originalTokens,
        reductionPercentage: 0
      };
    }

    // Simple optimization: truncate to target character count
    const targetChars = targetTokens * this.CHARS_PER_TOKEN;
    const optimizedPrompt = promptText.substring(0, targetChars);
    const optimizedTokens = this.estimateTokens(optimizedPrompt);
    const reductionPercentage = ((originalTokens - optimizedTokens) / originalTokens) * 100;

    logger.info('Prompt optimized', {
      originalTokens,
      optimizedTokens,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100
    });

    return {
      optimizedPrompt,
      originalTokens,
      optimizedTokens,
      reductionPercentage: Math.round(reductionPercentage * 100) / 100
    };
  }
}

export const tokenService = new TokenService(); 