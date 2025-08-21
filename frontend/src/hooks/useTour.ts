import { useState, useEffect } from 'react';

interface UseTourReturn {
  showTour: boolean;
  startTour: () => void;
  closeTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

export const useTour = (): UseTourReturn => {
  const [showTour, setShowTour] = useState(false);

  const TOUR_COMPLETED_KEY = 'fojourn_tour_completed';

  useEffect(() => {
    // Check if user has completed the tour before
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    
    // Show tour for new users who haven't completed it
    if (!tourCompleted) {
      // Add a small delay to let the app load first
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = () => {
    setShowTour(true);
  };

  const closeTour = () => {
    setShowTour(false);
  };

  const completeTour = () => {
    setShowTour(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    setShowTour(true);
  };

  return {
    showTour,
    startTour,
    closeTour,
    completeTour,
    resetTour,
  };
};
