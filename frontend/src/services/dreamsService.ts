import { CreateDreamData, UpdateDreamData, Dream, DreamsListResponse, DreamsStats, DreamType, DreamPriority } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class DreamsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getDreams(params?: {
    page?: number;
    limit?: number;
    sortBy?: 'created_at' | 'title' | 'priority' | 'dream_type';
    sortOrder?: 'ASC' | 'DESC';
    dreamType?: DreamType;
    priority?: DreamPriority;
    achieved?: boolean;
    search?: string;
  }): Promise<DreamsListResponse> {
    const url = new URL(`${API_BASE_URL}/dreams`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch dreams');
    }

    return response.json();
  }

  async getDream(id: number): Promise<{ dream: Dream }> {
    const response = await fetch(`${API_BASE_URL}/dreams/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch dream');
    }

    return response.json();
  }

  async createDream(dreamData: CreateDreamData): Promise<{ message: string; dream: Dream }> {
    console.log('Sending dream data to API:', dreamData);
    
    const response = await fetch(`${API_BASE_URL}/dreams`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(dreamData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
      console.error('API Error Response:', errorData);
      console.error('Response status:', response.status);
      
      // Log detailed validation errors if available
      if (errorData.errors && Array.isArray(errorData.errors)) {
        console.error('Validation errors:', errorData.errors);
        errorData.errors.forEach((err: any, index: number) => {
          console.error(`Validation error ${index + 1}:`, err);
        });
      }
      
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return response.json();
  }

  async updateDream(id: number, dreamData: UpdateDreamData): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/dreams/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(dreamData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update dream');
    }

    return response.json();
  }

  async deleteDream(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/dreams/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete dream');
    }

    return response.json();
  }

  async achieveDream(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/dreams/${id}/achieve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to mark dream as achieved';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        // If response is not JSON (like 429 Too Many Requests), use status text
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getDreamsStats(): Promise<{ stats: DreamsStats }> {
    const response = await fetch(`${API_BASE_URL}/dreams/stats/overview`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch dreams statistics');
    }

    return response.json();
  }

  // Helper method to convert a Google Places result to a CreateDreamData object
  convertPlacesToDreamData(place: google.maps.places.PlaceResult, dreamType: DreamType = 'destination'): Partial<CreateDreamData> {
    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();
    
    if (!lat || !lng) {
      throw new Error('Place must have valid coordinates');
    }

    return {
      title: place.name || 'Unnamed Location',
      description: '', // Can be filled by user later
      latitude: lat,
      longitude: lng,
      location_name: place.formatted_address || place.vicinity || '',
      place_id: place.place_id,
      country: this.extractCountryFromPlace(place),
      region: this.extractRegionFromPlace(place),
      dream_type: dreamType,
      priority: 'medium',
      tags: place.types || [],
    };
  }

  private extractCountryFromPlace(place: google.maps.places.PlaceResult): string | undefined {
    const countryComponent = place.address_components?.find(component =>
      component.types.includes('country')
    );
    return countryComponent?.long_name;
  }

  private extractRegionFromPlace(place: google.maps.places.PlaceResult): string | undefined {
    const regionComponent = place.address_components?.find(component =>
      component.types.includes('administrative_area_level_1')
    );
    return regionComponent?.long_name;
  }
}

export const dreamsService = new DreamsService();
export default dreamsService;
