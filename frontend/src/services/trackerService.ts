import { apiClient } from './apiClient';
import { ApiResponse } from '../types';

export interface TrackerSyncResult {
  message: string;
  syncedCount: number;
  errorCount: number;
  totalExternal: number;
}

export interface Tracker {
  id: string;
  companyId: string;
  type: 'jira' | 'teamwork';
  baseUrl?: string;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
  };
  _count?: {
    issues: number;
  };
}

export class TrackerService {
  static async getTrackers(): Promise<{ trackers: Tracker[] }> {
    const response = await apiClient.get<{ trackers: Tracker[] }>('/trackers');
    return response.data;
  }

  static async syncTracker(trackerId: string): Promise<TrackerSyncResult> {
    const response = await apiClient.post<TrackerSyncResult>(`/trackers/${trackerId}/sync`);
    return response.data;
  }

  static async testConnection(trackerId: string): Promise<{
    connected: boolean;
    trackerType: string;
    baseUrl?: string;
    lastSync?: string;
  }> {
    const response = await apiClient.post(`/trackers/${trackerId}/test`);
    return response.data;
  }
} 