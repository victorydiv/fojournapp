/**
 * Utility functions for integrating with Yelp
 */

export interface YelpLinkParams {
  businessName: string;
  businessType?: string; // Dynamic memory type
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  address?: string;
}

/**
 * Generate a Yelp search URL for a restaurant
 * @param params - Restaurant information
 * @returns Yelp search URL
 */
export const generateYelpSearchUrl = (params: YelpLinkParams): string => {
  const baseUrl = 'https://www.yelp.com/search';
  const searchParams = new URLSearchParams();
  
  // Add the business name as the search term
  searchParams.append('find_desc', params.businessName);
  
  // Add location information
  if (params.location?.address) {
    searchParams.append('find_loc', params.location.address);
  } else if (params.address) {
    searchParams.append('find_loc', params.address);
  } else if (params.location) {
    // Use coordinates if no address available
    searchParams.append('find_loc', `${params.location.lat},${params.location.lng}`);
  }
  
  // Add category filter for restaurants
  searchParams.append('cflt', 'restaurants');
  
  return `${baseUrl}?${searchParams.toString()}`;
};

/**
 * Generate a more targeted Yelp business URL using the business name and location
 * This creates a direct link that's more likely to show the exact business
 * @param params - Restaurant information
 * @returns Yelp business search URL
 */
export const generateYelpBusinessUrl = (params: YelpLinkParams): string => {
  // For the most reliable results, we'll use the search URL with refined parameters
  // since the direct business URL format is harder to predict accurately
  const baseUrl = 'https://www.yelp.com/search';
  const searchParams = new URLSearchParams();
  
  // Clean and prepare the business name for search
  const cleanBusinessName = params.businessName
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  searchParams.append('find_desc', cleanBusinessName);
  
  // Add location with preference for more specific address
  if (params.location?.address) {
    // Try to extract city and state from address for better targeting
    const addressParts = params.location.address.split(',').map(part => part.trim());
    if (addressParts.length >= 2) {
      // Use the last two parts (usually city, state/country)
      const locationPart = addressParts.slice(-2).join(', ');
      searchParams.append('find_loc', locationPart);
    } else {
      searchParams.append('find_loc', params.location.address);
    }
  } else if (params.address) {
    searchParams.append('find_loc', params.address);
  } else if (params.location) {
    // Use coordinates as fallback
    searchParams.append('find_loc', `${params.location.lat},${params.location.lng}`);
  }
  
  // Add category filter for restaurants/breweries to improve accuracy
  if (params.businessType === 'brewery') {
    searchParams.append('cflt', 'breweries');
  } else {
    searchParams.append('cflt', 'restaurants');
  }
  
  // Sort by distance to get the closest match first
  searchParams.append('sortby', 'distance');
  
  return `${baseUrl}?${searchParams.toString()}`;
};

/**
 * Check if a business type is likely to be on Yelp
 * @param businessType - The type of business
 * @returns Whether the business type is typically found on Yelp
 */
export const isYelpRelevantBusiness = (businessType: string): boolean => {
  const yelpRelevantTypes = [
    'restaurant',
    'brewery',
    'bar',
    'cafe',
    'bakery',
    'food',
    'meal_takeaway',
    'meal_delivery',
    'night_club',
    'lodging',
    'spa',
    'beauty_salon',
    'hair_care',
    'gym',
    'tourist_attraction',
    'shopping_mall',
    'store'
  ];
  
  return yelpRelevantTypes.some(type => 
    businessType.toLowerCase().includes(type.toLowerCase())
  );
};

/**
 * Extract business type from Google Places types array
 * @param googlePlacesTypes - Array of Google Places types
 * @returns Whether this is likely a restaurant/food establishment
 */
export const isRestaurantType = (googlePlacesTypes?: string[]): boolean => {
  if (!googlePlacesTypes) return false;
  
  const restaurantTypes = [
    'restaurant',
    'food',
    'meal_takeaway',
    'meal_delivery',
    'bar',
    'cafe',
    'bakery'
  ];
  
  return googlePlacesTypes.some(type => 
    restaurantTypes.includes(type.toLowerCase())
  );
};
