import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

const GoogleMapsDebug: React.FC = () => {
  const [status, setStatus] = useState<string>('Starting...');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    const debug = async () => {
      const logs: string[] = [];
      
      try {
        // Check environment
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        logs.push(`API Key present: ${!!apiKey}`);
        logs.push(`API Key length: ${apiKey?.length || 0}`);
        logs.push(`API Key starts with: ${apiKey?.substring(0, 10) || 'N/A'}`);
        
        setDetails([...logs]);
        setStatus('Checking API key...');
        
        if (!apiKey) {
          throw new Error('No Google Maps API key found');
        }
        
        // Try loading script directly
        setStatus('Loading Google Maps script...');
        logs.push('Attempting to load Google Maps script directly...');
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initMap`;
        script.async = true;
        script.defer = true;
        
        // Create callback function
        (window as any).initMap = () => {
          logs.push('Google Maps callback executed');
          logs.push(`window.google available: ${!!window.google}`);
          logs.push(`window.google.maps available: ${!!window.google?.maps}`);
          logs.push(`window.google.maps.places available: ${!!window.google?.maps?.places}`);
          
          setDetails([...logs]);
          setStatus('Google Maps loaded successfully!');
        };
        
        script.onerror = (e) => {
          logs.push(`Script error: ${e}`);
          setDetails([...logs]);
          setError('Failed to load Google Maps script');
          setStatus('Script loading failed');
        };
        
        document.head.appendChild(script);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (status === 'Loading Google Maps script...') {
            setError('Google Maps loading timed out');
            setStatus('Timeout');
          }
        }, 10000);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logs.push(`Error: ${errorMessage}`);
        setDetails([...logs]);
        setError(errorMessage);
        setStatus('Error');
      }
    };
    
    debug();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h5" gutterBottom>
        Google Maps Debug
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Status: {status}</Typography>
        {status.includes('Loading') && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Typography variant="h6" gutterBottom>
        Debug Information:
      </Typography>
      
      <Box component="pre" sx={{ 
        backgroundColor: '#f5f5f5', 
        p: 2, 
        borderRadius: 1, 
        fontSize: '0.875rem',
        overflow: 'auto'
      }}>
        {details.map((detail, index) => (
          <div key={index}>{detail}</div>
        ))}
      </Box>
    </Box>
  );
};

export default GoogleMapsDebug;
