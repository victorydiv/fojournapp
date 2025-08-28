import api from './api';
import { AxiosResponse } from 'axios';

export interface AdminStats {
  users: {
    total_users: number;
    new_users_30d: number;
    public_profiles: number;
  };
  entries: {
    total_entries: number;
    new_entries_30d: number;
    public_entries: number;
  };
  media: {
    total_files: number;
    total_size: number;
  };
}

export interface RecentActivity {
  id: number;
  title: string;
  created_at: string;
  username: string;
  email: string;
  is_public: boolean;
}

export interface DashboardData {
  stats: AdminStats;
  recentActivity: RecentActivity[];
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_public: boolean;
  is_admin: boolean;
  created_at: string;
  avatar_filename: string;
  entry_count: number;
  last_entry: string;
}

export interface UserListResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserDetailsResponse {
  user: AdminUser;
  entries: any[];
  mediaStats: {
    count: number;
    total_size: number;
  };
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'error' | 'unknown';
    details: string;
  };
  fileSystem: {
    status: 'healthy' | 'error' | 'unknown';
    details: string;
  };
  uploads: {
    status: 'healthy' | 'error' | 'unknown';
    details: string;
  };
}

export interface OrphanedFile {
  fileName: string;
  path: string;
  size: number;
  created: string;
  issue: string;
}

export interface MissingFile {
  id: number;
  file_name: string;
  file_path: string;
  entry_id: number;
  thumbnail_path: string;
  issue: string;
  path: string;
}

export interface OrphanedMediaResponse {
  orphanedFiles: OrphanedFile[];
  missingFiles: MissingFile[];
  summary: {
    orphanedCount: number;
    missingCount: number;
    totalIssues: number;
  };
}

export interface DatabaseStats {
  users: number;
  travel_entries: number;
  media_files: number;
  entry_tags: number;
  activity_links: number;
  database_size_mb: number;
  recent_entries_7d: number;
  recent_users_7d: number;
}

export const adminAPI = {
  // Dashboard
  getDashboard: (): Promise<AxiosResponse<DashboardData>> =>
    api.get('/admin/dashboard'),

  // User management
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AxiosResponse<UserListResponse>> =>
    api.get('/admin/users', { params }),

  getUserDetails: (userId: number): Promise<AxiosResponse<UserDetailsResponse>> =>
    api.get(`/admin/users/${userId}`),

  updateUserAdminStatus: (userId: number, isAdmin: boolean): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/admin/users/${userId}/admin`, { isAdmin }),

  // Content moderation
  getContent: (params?: {
    type?: 'entries' | 'public_profiles' | 'all';
    page?: number;
    limit?: number;
  }): Promise<AxiosResponse<any>> =>
    api.get('/admin/content', { params }),

  // Content moderation actions
  toggleEntryVisibility: (entryId: number, isPublic: boolean): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.put(`/admin/entries/${entryId}/visibility`, { isPublic }),

  flagUser: (userId: number, isFlagged: boolean, reason?: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.put(`/admin/users/${userId}/flag`, { isFlagged, reason }),

  getEntryDetails: (entryId: number): Promise<AxiosResponse<any>> =>
    api.get(`/admin/entries/${entryId}`),

  // System maintenance
  getSystemHealth: (): Promise<AxiosResponse<SystemHealth>> =>
    api.get('/admin/maintenance/health'),

  getDatabaseStats: (): Promise<AxiosResponse<DatabaseStats>> =>
    api.get('/admin/maintenance/database-stats'),

  getOrphanedMedia: (): Promise<AxiosResponse<OrphanedMediaResponse>> =>
    api.get('/admin/maintenance/orphaned-media'),

  cleanupOrphanedFiles: (orphanedFiles: OrphanedFile[]): Promise<AxiosResponse<any>> =>
    api.post('/admin/maintenance/cleanup-orphaned', { orphanedFiles }),

  generateThumbnails: (): Promise<AxiosResponse<any>> =>
    api.post('/admin/maintenance/generate-thumbnails'),

  getStorageInfo: (): Promise<AxiosResponse<any>> =>
    api.get('/admin/maintenance/storage'),

  copyPublicFiles: (): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.post('/admin/copy-public-files'),
};
