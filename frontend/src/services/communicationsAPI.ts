import api from './api';
import { AxiosResponse } from 'axios';

// ============ TYPES ============

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_content: string;
  css_styles: string;
  is_default: boolean;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface EmailRecipient {
  id: number;
  email_address: string;
  user_id: number;
  delivery_status: 'pending' | 'sent' | 'failed' | 'bounced';
  sent_at: string | null;
  error_message: string | null;
}

export interface SentEmail {
  id: number;
  template_id: number | null;
  template_name: string | null;
  sender_id: number;
  sender_username: string;
  subject: string;
  html_content: string;
  recipient_type: 'all' | 'selected' | 'single';
  recipient_count: number;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  content_type: 'html' | 'markdown' | 'text';
  announcement_type: 'info' | 'warning' | 'success' | 'error' | 'feature';
  is_active: boolean;
  is_featured: boolean;
  priority: number;
  target_audience: 'all' | 'users' | 'admins';
  start_date: string | null;
  end_date: string | null;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  user_viewed_at?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface CreateEmailTemplateData {
  name: string;
  subject: string;
  html_content: string;
  css_styles?: string;
  is_default?: boolean;
}

export interface UpdateEmailTemplateData extends CreateEmailTemplateData {
  id: number;
}

export interface SendEmailData {
  template_id?: number;
  subject: string;
  html_content: string;
  recipient_type: 'all' | 'selected';
  selected_users?: number[];
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  content_type?: 'html' | 'markdown' | 'text';
  announcement_type?: 'info' | 'warning' | 'success' | 'error' | 'feature';
  is_active?: boolean;
  is_featured?: boolean;
  priority?: number;
  target_audience?: 'all' | 'users' | 'admins';
  start_date?: string;
  end_date?: string;
}

export interface UpdateAnnouncementData extends CreateAnnouncementData {
  id: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ API METHODS ============

export const communicationsAPI = {
  // ========== EMAIL TEMPLATES ==========
  
  getEmailTemplates: (): Promise<AxiosResponse<{ templates: EmailTemplate[] }>> =>
    api.get('/communications/templates'),

  getEmailTemplate: (id: number): Promise<AxiosResponse<{ template: EmailTemplate }>> =>
    api.get(`/communications/templates/${id}`),

  createEmailTemplate: (data: CreateEmailTemplateData): Promise<AxiosResponse<{ message: string; templateId: number }>> =>
    api.post('/communications/templates', data),

  updateEmailTemplate: (id: number, data: Omit<UpdateEmailTemplateData, 'id'>): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/communications/templates/${id}`, data),

  deleteEmailTemplate: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/communications/templates/${id}`),

  // ========== EMAIL SENDING ==========

  getUsers: (): Promise<AxiosResponse<{ users: User[] }>> =>
    api.get('/communications/users'),

  sendEmail: (data: SendEmailData): Promise<AxiosResponse<{ message: string; sent_email_id: number; recipient_count: number }>> =>
    api.post('/communications/send-email', data),

  getSentEmails: (params?: { page?: number; limit?: number }): Promise<AxiosResponse<{ emails: SentEmail[]; pagination: any }>> =>
    api.get('/communications/sent-emails', { params }),

  // ========== ANNOUNCEMENTS ==========

  getAnnouncements: (): Promise<AxiosResponse<{ announcements: Announcement[] }>> =>
    api.get('/communications/announcements'),

  getActiveAnnouncements: (): Promise<AxiosResponse<{ announcements: Announcement[] }>> =>
    api.get('/communications/announcements/active'),

  createAnnouncement: (data: CreateAnnouncementData): Promise<AxiosResponse<{ message: string; announcementId: number }>> =>
    api.post('/communications/announcements', data),

  updateAnnouncement: (id: number, data: Omit<UpdateAnnouncementData, 'id'>): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/communications/announcements/${id}`, data),

  deleteAnnouncement: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/communications/announcements/${id}`),

  markAnnouncementAsViewed: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/communications/announcements/${id}/view`),
};

export default communicationsAPI;
