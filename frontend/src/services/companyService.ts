import { apiClient } from './apiClient';

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export class CompanyService {
  static async getCompanies(params: CompanyQueryParams = {}): Promise<{
    data: Company[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await apiClient.get<{
      companies: Company[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/companies?${searchParams.toString()}`);

    return {
      data: response.data.companies,
      pagination: {
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.pages,
      },
    };
  }

  static async getCompany(id: string): Promise<Company> {
    const response = await apiClient.get<Company>(`/companies/${id}`);
    return response.data;
  }
}

export default CompanyService; 