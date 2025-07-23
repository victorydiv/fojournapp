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

export default api;
