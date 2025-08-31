import axios, { AxiosResponse } from 'axios';
import {
  User,
  TravelEntry,
  CreateEntryData,
  SearchParams,
  SearchResult,
  AuthResponse,
  LoginData,
  RegisterData,
  MediaFile
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Add cache busting utility
const addCacheBuster = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add cache control headers
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data: LoginData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),
  
  register: (data: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),
  
  getProfile: (): Promise<AxiosResponse<{ user: User }>> =>
    api.get('/auth/profile'),
  
  updateProfile: (data: Partial<User>): Promise<AxiosResponse<{ message: string }>> =>
    api.put('/auth/profile', data),
  
  verifyToken: (): Promise<AxiosResponse<{ valid: boolean; user: User }>> =>
    api.get('/auth/verify'),

  uploadAvatar: (formData: FormData): Promise<AxiosResponse<{ message: string; avatarPath: string; avatarFilename: string }>> => {
    return api.post('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<{ message: string }>> =>
    api.put('/auth/change-password', data),
};

// Travel Entries API
export const entriesAPI = {
  getEntries: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
  }): Promise<AxiosResponse<SearchResult>> =>
    api.get('/entries', { params }),
  
  getEntry: (id: number): Promise<AxiosResponse<{ entry: TravelEntry }>> =>
    api.get(`/entries/${id}`),
  
  createEntry: (data: CreateEntryData): Promise<AxiosResponse<{ message: string; entry: TravelEntry }>> =>
    api.post('/entries', data),
  
  updateEntry: (id: number, data: Partial<CreateEntryData>): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/entries/${id}`, data),
  
  deleteEntry: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/entries/${id}`),

  getStats: (): Promise<AxiosResponse<any>> =>
    api.get('/entries/stats'),
};

// Media API
export const mediaAPI = {
  uploadFiles: (entryId: number, files: File[]): Promise<AxiosResponse<{ message: string; files: MediaFile[] }>> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    return api.post(`/media/upload/${entryId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getEntryMedia: (entryId: number): Promise<AxiosResponse<{ files: MediaFile[] }>> =>
    api.get(`/media/entry/${entryId}`),
  
  deleteFile: (fileId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/media/${fileId}`),
  
  getMediaStats: (): Promise<AxiosResponse<{
    totalFiles: number;
    totalSize: number;
    imageCount: number;
    videoCount: number;
  }>> =>
    api.get('/media/stats'),
};

// Search API
export const searchAPI = {
  search: (params: SearchParams): Promise<AxiosResponse<SearchResult>> =>
    api.get('/search', { params }),
  
  getTags: (): Promise<AxiosResponse<{ tags: { tag: string; count: number }[] }>> =>
    api.get('/search/tags'),
  
  getLocations: (query?: string): Promise<AxiosResponse<{
    locations: {
      location_name: string;
      latitude: number;
      longitude: number;
      entry_count: number;
    }[];
  }>> =>
    api.get('/search/locations', { params: { q: query } }),
  
  getSuggestions: (query: string): Promise<AxiosResponse<{
    suggestions: {
      titles: string[];
      locations: string[];
      tags: string[];
    };
  }>> =>
    api.get('/search/suggestions', { params: { q: query } }),
  
  advancedSearch: (searchData: any): Promise<AxiosResponse<SearchResult>> =>
    api.post('/search/advanced', searchData),
};

// Journeys API
export const journeysAPI = {
  // Get all journeys
  getJourneys: (): Promise<AxiosResponse<any[]>> =>
    api.get('/journeys'),
  
  // Create new journey
  createJourney: (journeyData: any): Promise<AxiosResponse<any>> =>
    api.post('/journeys', journeyData),
  
  // Get specific journey
  getJourney: (id: number): Promise<AxiosResponse<any>> =>
    api.get(`/journeys/${id}`),
  
  // Update journey
  updateJourney: (id: number, journeyData: any): Promise<AxiosResponse<any>> =>
    api.put(`/journeys/${id}`, journeyData),
  
  // Delete journey
  deleteJourney: (id: number): Promise<AxiosResponse<any>> =>
    api.delete(`/journeys/${id}`),

  // Experience API functions
  getExperiences: (journeyId: number): Promise<AxiosResponse<any[]>> =>
    api.get(`/journeys/${journeyId}/experiences`),
  
  createExperience: (journeyId: number, experienceData: any): Promise<AxiosResponse<any>> =>
    api.post(`/journeys/${journeyId}/experiences`, experienceData),
  
  updateExperience: (journeyId: number, experienceId: number, experienceData: any): Promise<AxiosResponse<any>> =>
    api.put(`/journeys/${journeyId}/experiences/${experienceId}`, experienceData),
  
  deleteExperience: (journeyId: number, experienceId: number): Promise<AxiosResponse<any>> =>
    api.delete(`/journeys/${journeyId}/experiences/${experienceId}`),
  
  // Legacy waypoint/places endpoints (keeping for backward compatibility)
  getWaypoints: (journeyId: number): Promise<AxiosResponse<any[]>> =>
    api.get(`/journeys/${journeyId}/waypoints`),
  
  updateWaypoints: (journeyId: number, waypoints: any[]): Promise<AxiosResponse<any>> =>
    api.post(`/journeys/${journeyId}/waypoints`, { waypoints }),
  
  getPlaces: (journeyId: number): Promise<AxiosResponse<any[]>> =>
    api.get(`/journeys/${journeyId}/places`),
  
  updatePlaces: (journeyId: number, places: any[]): Promise<AxiosResponse<any>> =>
    api.post(`/journeys/${journeyId}/places`, { places }),
};

// Share API
export const shareAPI = {
  getShareContent: (entryId: number): Promise<AxiosResponse<any>> =>
    api.get(`/share/entry/${entryId}`),
  
  getShareStats: (entryId: number): Promise<AxiosResponse<any>> =>
    api.get(`/share/stats/${entryId}`),
};

// Collaboration API
export const collaborationAPI = {
  // Get collaborators for a journey
  getCollaborators: (journeyId: number): Promise<AxiosResponse<any>> =>
    api.get(`/journeys/${journeyId}/collaborators`),
  
  // Invite a user to collaborate
  inviteCollaborator: (journeyId: number, data: { email: string; role?: string; message?: string }): Promise<AxiosResponse<any>> =>
    api.post(`/journeys/${journeyId}/invite`, data),
  
  // Respond to collaboration invitation
  respondToInvitation: (invitationId: number, response: 'accept' | 'decline'): Promise<AxiosResponse<any>> =>
    api.put(`/journeys/invitations/${invitationId}/respond`, { response }),
  
  // Get pending invitations for current user
  getPendingInvitations: (): Promise<AxiosResponse<any>> =>
    api.get('/journeys/invitations/pending'),
  
  // Remove collaborator (owner only)
  removeCollaborator: (journeyId: number, collaboratorId: number): Promise<AxiosResponse<any>> =>
    api.delete(`/journeys/${journeyId}/collaborators/${collaboratorId}`),
  
  // Get pending experience suggestions (owner only)
  getSuggestions: (journeyId: number): Promise<AxiosResponse<any>> =>
    api.get(`/journeys/${journeyId}/suggestions`),
  
  // Get user's own pending suggestions (contributor view)
  getMySuggestions: (journeyId: number): Promise<AxiosResponse<any>> =>
    api.get(`/journeys/${journeyId}/my-suggestions`),
  
  // Update user's own pending suggestion
  updateMySuggestion: (suggestionId: number, data: any): Promise<AxiosResponse<any>> =>
    api.put(`/journeys/suggestions/${suggestionId}`, data),
  
  // Delete user's own pending suggestion
  deleteMySuggestion: (suggestionId: number): Promise<AxiosResponse<any>> =>
    api.delete(`/journeys/suggestions/${suggestionId}`),
  
  // Approve or reject experience suggestion
  reviewSuggestion: (journeyId: number, experienceId: number, data: { action: 'approve' | 'reject'; notes?: string }): Promise<AxiosResponse<any>> =>
    api.put(`/journeys/${journeyId}/suggestions/${experienceId}`, data),
  
  // Get notification counts
  getNotifications: (): Promise<AxiosResponse<any>> =>
    api.get('/journeys/notifications'),
  
  // Get detailed notification information
  getNotificationDetails: (): Promise<AxiosResponse<any>> =>
    api.get('/journeys/notifications/details'),

  // Memory visibility management
  updateMemoryVisibility: (entryId: number, data: { isPublic: boolean; featured?: boolean }): Promise<AxiosResponse<any>> =>
    api.put(`/entries/${entryId}/visibility`, data),
};

// Public API methods (no authentication required)
export const publicAPI = {
  // Get public user profile
  getPublicProfile: (username: string): Promise<AxiosResponse<any>> =>
    axios.get(`${API_BASE_URL}/public/users/${username}`),
  
  // Get public memories for a user
  getPublicMemories: (username: string, page = 1, limit = 12): Promise<AxiosResponse<any>> =>
    axios.get(`${API_BASE_URL}/public/users/${username}/memories`, { params: { page, limit } }),
  
  // Get individual public memory
  getPublicMemory: (slug: string): Promise<AxiosResponse<any>> =>
    axios.get(`${API_BASE_URL}/public/memories/${slug}`),
};

export const emailPreferencesAPI = {
  // Get user email preferences
  getPreferences: (): Promise<AxiosResponse<{
    preferences: {
      notifications: boolean;
      marketing: boolean;
      announcements: boolean;
      lastUpdated: string | null;
    }
  }>> =>
    api.get('/email-preferences/preferences'),

  // Update user email preferences
  updatePreferences: (preferences: {
    notifications: boolean;
    marketing: boolean;
    announcements: boolean;
  }): Promise<AxiosResponse<{ message: string; preferences: any }>> =>
    api.put('/email-preferences/preferences', preferences),

  // Generate new unsubscribe token
  generateUnsubscribeToken: (): Promise<AxiosResponse<{ message: string; token: string }>> =>
    api.post('/email-preferences/generate-unsubscribe-token'),

  // Get unsubscribe token and URLs
  getUnsubscribeToken: (): Promise<AxiosResponse<{
    token: string;
    unsubscribeUrls: {
      all: string;
      marketing: string;
      announcements: string;
      notifications: string;
    }
  }>> =>
    api.get('/email-preferences/unsubscribe-token'),
};

export const badgeAPI = {
  // Get all available badges
  getAvailableBadges: (): Promise<AxiosResponse<{ badges: any[] }>> =>
    api.get('/badges/available'),

  // Get user's earned badges
  getUserBadges: (userId: number): Promise<AxiosResponse<{ badges: any[] }>> =>
    api.get(`/badges/user/${userId}`),

  // Get user's badge progress
  getBadgeProgress: (userId: number): Promise<AxiosResponse<{ progress: any[] }>> =>
    api.get(`/badges/progress/${userId}`),

  // Get user's badge statistics
  getBadgeStats: (userId: number): Promise<AxiosResponse<{ stats: any }>> =>
    api.get(`/badges/stats/${userId}`),

  // Award a badge (admin only)
  awardBadge: (userId: number, badgeId: number, progressData?: any): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.post('/badges/award', { userId, badgeId, progressData }),

  // Update badge progress
  updateProgress: (userId: number, badgeId: number, currentCount: number, progressData?: any): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.post('/badges/progress', { userId, badgeId, currentCount, progressData }),

  // Admin badge management
  createBadge: (badgeData: { name: string; description: string; badge_type: string; criteria_type: string; criteria_value?: number; icon_name: string; logic_json?: string }): Promise<AxiosResponse<{ success: boolean; message: string; badgeId: number }>> =>
    api.post('/badges/admin/create', badgeData),

  updateBadge: (badgeId: number, badgeData: { name: string; description: string; badge_type: string; criteria_type: string; criteria_value?: number; icon_name: string; logic_json?: string }): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.put(`/badges/admin/${badgeId}`, badgeData),

  deleteBadge: (badgeId: number): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.delete(`/badges/admin/${badgeId}`),

  // Badge icon upload
  uploadBadgeIcon: (iconFile: File): Promise<AxiosResponse<{ success: boolean; iconPath: string; filename: string; message: string }>> => {
    const formData = new FormData();
    formData.append('icon', iconFile);
    return api.post('/badges/admin/upload-icon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
