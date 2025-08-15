import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  loading?: 'lazy' | 'eager';
  className?: string;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt,
  style,
  onError,
  loading,
  className
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        console.log('AuthenticatedImage loading:', src);
        
        // Use the provided URL directly (it already includes authentication token)
        const response = await fetch(src);
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error text:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
        }

        // Convert to blob and create object URL
        const blob = await response.blob();
        console.log('Blob created, size:', blob.size, 'type:', blob.type);
        
        if (blob.size === 0) {
          throw new Error('Received empty blob');
        }
        
        const objectUrl = URL.createObjectURL(blob);
        console.log('Created object URL:', objectUrl);
        setImageSrc(objectUrl);
        setIsLoading(false);

      } catch (error) {
        console.error('Failed to load authenticated image:', error);
        setHasError(true);
        setIsLoading(false);
        onError && onError(error as any);
      }
    };

    if (src) {
      loadImage();
    }

    // Cleanup on unmount
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src]);

  if (isLoading) {
    return (
      <Box
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}
        className={className}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (hasError || !imageSrc) {
    console.error('AuthenticatedImage error state:', { hasError, imageSrc, src });
    return (
      <Box
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#666',
          flexDirection: 'column',
          padding: '8px',
          fontSize: '12px',
          textAlign: 'center'
        }}
        className={className}
      >
        <div>Failed to load image</div>
        <div style={{ fontSize: '10px', marginTop: '4px', wordBreak: 'break-all' }}>
          {src.length > 60 ? src.substring(0, 60) + '...' : src}
        </div>
      </Box>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      style={style}
      loading={loading}
      className={className}
      onError={onError}
    />
  );
};

export default AuthenticatedImage;
