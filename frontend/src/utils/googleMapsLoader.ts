import { Loader } from '@googlemaps/js-api-loader';

let isGoogleMapsLoaded = false;
let loader: Loader | null = null;
let loadingPromise: Promise<void> | null = null;

export const loadGoogleMaps = async (): Promise<void> => {
  // Check if Google Maps is already available globally
  if (window.google?.maps?.places?.Autocomplete) {
    console.log('Google Maps already available globally');
    isGoogleMapsLoaded = true;
    return Promise.resolve();
  }

  if (isGoogleMapsLoaded) {
    console.log('Google Maps already loaded via loader');
    return Promise.resolve();
  }

  // If already loading, return the existing promise
  if (loadingPromise) {
    console.log('Google Maps loading in progress, waiting...');
    return loadingPromise;
  }

  // Check for existing script tags to avoid duplicates
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    console.log('Google Maps script already exists, waiting for global availability...');
    
    // Wait for Google Maps to become available
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places?.Autocomplete) {
          console.log('Google Maps became available');
          isGoogleMapsLoaded = true;
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for Google Maps to become available'));
      }, 10000);
    });
  }

  if (!loader) {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    console.log('Google Maps API Key (first 10 chars):', apiKey?.substring(0, 10));
    
    if (!apiKey) {
      console.error('Google Maps API key not found in environment variables');
      throw new Error('Google Maps API key not found in environment variables');
    }

    loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });

    console.log('Google Maps Loader created with libraries:', ['places', 'geometry']);
  }

  try {
    console.log('Loading Google Maps via @googlemaps/js-api-loader...');
    loadingPromise = loader.load().then(() => {
      isGoogleMapsLoaded = true;
      loadingPromise = null;
      console.log('Google Maps loaded successfully');
      console.log('Available APIs:', {
        maps: !!window.google?.maps,
        places: !!window.google?.maps?.places,
        geometry: !!window.google?.maps?.geometry
      });
    });
    
    await loadingPromise;
  } catch (error) {
    loadingPromise = null;
    console.error('Error loading Google Maps:', error);
    throw error;
  }
};

export const isGoogleMapsReady = (): boolean => {
  return !!window.google?.maps?.places?.Autocomplete;
};
