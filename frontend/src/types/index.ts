export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

export interface TravelEntry {
  id: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  media?: MediaFile[];
  links?: ActivityLink[];
  tags?: string[];
}

export interface MediaFile {
  id: number;
  fileName: string;
  originalName: string;
  fileType: 'image' | 'video' | 'document';
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  url: string;
  thumbnailUrl?: string;
}

export interface ActivityLink {
  id: number;
  title: string;
  url: string;
  description?: string;
  linkType: 'activity' | 'attraction' | 'restaurant' | 'accommodation' | 'other';
  createdAt: string;
}

export interface CreateEntryData {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  entryDate: string;
  tags?: string[];
  links?: {
    title: string;
    url: string;
    description?: string;
    linkType?: string;
  }[];
  placeId?: string;
  placeName?: string;
  placeLat?: number | null;
  placeLng?: number | null;
}

export interface SearchParams {
  q?: string;
  startDate?: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  tags?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  entries: TravelEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPin {
  id: number;
  position: LatLng;
  title: string;
  date: string;
  entryId: number;
}
