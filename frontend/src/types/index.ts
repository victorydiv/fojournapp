export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarPath?: string;
  avatarFilename?: string;
  profileBio?: string;
  profilePublic?: boolean;
  createdAt: string;
}

export interface TravelEntry {
  id: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  memoryType?: 'attraction' | 'restaurant' | 'accommodation' | 'activity' | 'brewery' | 'other';
  restaurantRating?: 'happy' | 'sad' | 'neutral';
  isDogFriendly?: boolean;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  publicSlug?: string;
  featured?: boolean;
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
  memoryType?: 'attraction' | 'restaurant' | 'accommodation' | 'activity' | 'brewery' | 'other';
  restaurantRating?: 'happy' | 'sad' | 'neutral';
  isDogFriendly?: boolean;
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
  dreamId?: number; // ID of the dream this entry was created from
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

// Dreams feature types
export type DreamType = 'destination' | 'attraction' | 'restaurant' | 'accommodation' | 'activity' | 'brewery' | 'other';
export type DreamPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Dream {
  id: number;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  place_id?: string;
  country?: string;
  region?: string;
  dream_type: DreamType;
  priority: DreamPriority;
  notes?: string;
  tags: string[];
  estimated_budget?: number;
  best_time_to_visit?: string;
  research_links: string[];
  created_at: string;
  updated_at: string;
  is_achieved: boolean;
  achieved_at?: string;
}

export interface CreateDreamData {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  place_id?: string;
  country?: string;
  region?: string;
  dream_type?: DreamType;
  priority?: DreamPriority;
  notes?: string;
  tags?: string[];
  estimated_budget?: number;
  best_time_to_visit?: string;
  research_links?: string[];
}

export interface UpdateDreamData extends Partial<CreateDreamData> {
  is_achieved?: boolean;
}

export interface DreamsListResponse {
  dreams: Dream[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DreamsStats {
  total_dreams: number;
  achieved_dreams: number;
  high_priority_dreams: number;
  destinations: number;
  restaurants: number;
  attractions: number;
  avg_budget: number;
}
