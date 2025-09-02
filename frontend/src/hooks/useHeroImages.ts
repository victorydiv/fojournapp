import { useState, useEffect } from 'react';

interface HeroImage {
  id: number;
  filename: string;
  image_url: string;
  title: string;
  subtitle: string;
  display_order: number;
}

export const useHeroImages = () => {
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/hero-images/public`);
        
        if (response.ok) {
          const data = await response.json();
          setHeroImages(data);
        } else {
          setError('Failed to fetch hero images');
        }
      } catch (err) {
        setError('Error fetching hero images');
        console.error('Error fetching hero images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeroImages();
  }, []);

  return { heroImages, loading, error };
};
