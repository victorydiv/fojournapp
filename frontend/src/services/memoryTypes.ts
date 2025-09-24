import { MemoryType } from '../types';

// Cache for memory types to avoid repeated API calls
let memoryTypesCache: MemoryType[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache invalidation listeners
let cacheInvalidationListeners: (() => void)[] = [];

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

export const memoryTypesAPI = {
  // Fetch all active memory types
  getMemoryTypes: async (): Promise<MemoryType[]> => {
    // Return cached data if it's still fresh
    if (memoryTypesCache !== null && cacheTimestamp !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return [...memoryTypesCache]; // Return a copy to avoid mutation
    }

    try {
      const response = await fetch(`${API_BASE_URL}/memory-types`);
      if (!response.ok) {
        throw new Error('Failed to fetch memory types');
      }
      const data = await response.json();
      
      // Cache the results
      const memoryTypes = data.memoryTypes || [];
      memoryTypesCache = memoryTypes;
      cacheTimestamp = Date.now();
      
      return [...memoryTypes];
    } catch (error) {
      console.error('Error fetching memory types:', error);
      
      // Fallback to hardcoded values if API fails
      const fallback: MemoryType[] = [
        { id: 1, name: 'attraction', display_name: 'Attraction', is_active: true, sort_order: 1 },
        { id: 2, name: 'restaurant', display_name: 'Restaurant', is_active: true, sort_order: 2 },
        { id: 3, name: 'accommodation', display_name: 'Accommodation', is_active: true, sort_order: 3 },
        { id: 4, name: 'activity', display_name: 'Activity', is_active: true, sort_order: 4 },
        { id: 5, name: 'brewery', display_name: 'Brewery', is_active: true, sort_order: 5 },
        { id: 6, name: 'other', display_name: 'Other', is_active: true, sort_order: 6 },
      ];
      
      memoryTypesCache = fallback;
      cacheTimestamp = Date.now();
      
      return fallback;
    }
  },

  // Get all memory types for admin (includes id and inactive types)
  getAdminMemoryTypes: async (): Promise<MemoryType[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/memory-types`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin memory types');
      }
      
      const data = await response.json();
      return data.memoryTypes || [];
    } catch (error) {
      console.error('Error fetching admin memory types:', error);
      throw error;
    }
  },

  // Get memory type names only (for validation)
  getMemoryTypeNames: async (): Promise<string[]> => {
    const memoryTypes = await memoryTypesAPI.getMemoryTypes();
    return memoryTypes.map(type => type.name);
  },

  // Clear the cache (useful when memory types are updated in admin)
  clearCache: (): void => {
    memoryTypesCache = null;
    cacheTimestamp = null;
    // Notify all listeners that cache has been invalidated
    cacheInvalidationListeners.forEach(listener => listener());
  },

  // Add listener for cache invalidation
  addCacheInvalidationListener: (listener: () => void): (() => void) => {
    cacheInvalidationListeners.push(listener);
    // Return cleanup function
    return () => {
      cacheInvalidationListeners = cacheInvalidationListeners.filter(l => l !== listener);
    };
  },

  // Get a memory type by name
  getMemoryTypeByName: async (name: string): Promise<MemoryType | undefined> => {
    const memoryTypes = await memoryTypesAPI.getMemoryTypes();
    return memoryTypes.find(type => type.name === name);
  }
};