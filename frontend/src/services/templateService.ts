import { apiClient } from './apiClient';
import { PromptTemplate, PaginatedResponse, ApiResponse } from '../types';

export interface TemplateQueryParams {
  page?: number;
  limit?: number;
  companyId?: string;
  isActive?: boolean;
  search?: string;
}

export interface CreateTemplateData {
  companyId: string;
  name: string;
  bodyMd: string;
  lintJson?: Record<string, any>;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  isActive?: boolean;
}

export interface RenderTemplateData {
  variables?: Record<string, any>;
}

export interface CloneTemplateData {
  name?: string;
  companyId: string;
}

export class TemplateService {
  static async getTemplates(params: TemplateQueryParams = {}): Promise<PaginatedResponse<PromptTemplate>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await apiClient.get<{
      templates: PromptTemplate[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/templates?${searchParams.toString()}`);

    return {
      data: response.data.templates,
      pagination: {
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.pages,
      },
    };
  }

  static async getTemplate(id: string): Promise<PromptTemplate> {
    const response = await apiClient.get<PromptTemplate>(`/templates/${id}`);
    return response.data;
  }

  static async createTemplate(data: CreateTemplateData): Promise<PromptTemplate> {
    const response = await apiClient.post<PromptTemplate>('/templates', {
      ...data,
      lintJson: data.lintJson || {},
    });
    return response.data;
  }

  static async updateTemplate(id: string, data: UpdateTemplateData): Promise<PromptTemplate> {
    const response = await apiClient.put<PromptTemplate>(`/templates/${id}`, data);
    return response.data;
  }

  static async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/templates/${id}`);
  }

  static async renderTemplate(id: string, data: RenderTemplateData): Promise<{
    rendered: string;
    originalTemplate: string;
    variables: Record<string, any>;
  }> {
    const response = await apiClient.post(`/templates/${id}/render`, data);
    return response.data;
  }

  static async cloneTemplate(id: string, data: CloneTemplateData): Promise<PromptTemplate> {
    const response = await apiClient.post<PromptTemplate>(`/templates/${id}/clone`, data);
    return response.data;
  }
}

export default TemplateService; 