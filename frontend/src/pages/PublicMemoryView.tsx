import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  IconButton,
  Paper,
  ImageList,
  ImageListItem
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Share as ShareIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { publicAPI } from '../services/api';

interface PublicMemory {
  id: number;
  title: string;
  description?: string;
  public_slug: string;
  entry_date: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  featured: boolean;
  media: Array<{
    filename: string;
    original_name: string;
    file_type: 'image' | 'video' | 'document';
    file_size: number;
    url: string;
  }>;
  author: {
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}

const PublicMemoryView: React.FC = () => {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<PublicMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemory = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const response = await publicAPI.getPublicMemory(slug);
        setMemory(response.data);
      } catch (error: any) {
        console.error('Error fetching public memory:', error);
        if (error.response?.status === 404) {
          setError('Memory not found or is private');
        } else {
          setError('Failed to load memory');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMemory();
  }, [slug]);

  const handleShare = async () => {
    if (!memory) return;
    
    // Use the meta endpoint URL for proper Facebook sharing
    const shareUrl = `${window.location.origin}/api/meta/memory/${slug}/share`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: memory.title,
          text: memory.description || `${memory.title} - A travel memory by ${memory.author.firstName} ${memory.author.lastName}`,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleProfileClick = () => {
    navigate(`/u/${memory?.author.username}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box textAlign="center">
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button onClick={() => navigate('/')} startIcon={<ArrowBackIcon />}>
            Go Home
          </Button>
        </Box>
      </Container>
    );
  }

  if (!memory) return null;

  const images = memory.media.filter(m => m.file_type === 'image');
  const videos = memory.media.filter(m => m.file_type === 'video');
  const documents = memory.media.filter(m => m.file_type === 'document');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Navigation */}
      <Box mb={4}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            onClick={() => navigate(`/u/${username}`)}
            startIcon={<ArrowBackIcon />}
          >
            Back to {memory.author.firstName}'s Profile
          </Button>
          <Box flex={1} />
          <IconButton onClick={handleShare} color="primary" size="large">
            <ShareIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Memory Header */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <Typography variant="h4" component="h1">
                {memory.title}
              </Typography>
              {!!memory.featured && (
                <Chip
                  icon={<LocationIcon />}
                  label="Featured"
                  color="secondary"
                  size="small"
                />
              )}
            </Stack>
            
            <Stack direction="row" spacing={3} mb={3}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarIcon color="action" />
                <Typography variant="body1" color="text.secondary">
                  {formatDate(memory.entry_date)}
                </Typography>
              </Stack>
              {memory.location_name && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocationIcon color="action" />
                  <Typography variant="body1" color="text.secondary">
                    {memory.location_name}
                  </Typography>
                </Stack>
              )}
            </Stack>

            {memory.description && (
              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
                {memory.description}
              </Typography>
            )}
          </Box>
          
          {/* Author Info */}
          <Paper 
            elevation={1} 
            sx={{ p: 3, minWidth: 280, height: 'fit-content' }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={memory.author.avatarUrl}
                sx={{ width: 56, height: 56 }}
              >
                {(memory.author.firstName?.[0] || '') + (memory.author.lastName?.[0] || '')}
              </Avatar>
              <Box flex={1}>
                <Typography variant="h6">
                  {memory.author.firstName} {memory.author.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @{memory.author.username}
                </Typography>
              </Box>
            </Stack>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PersonIcon />}
              onClick={handleProfileClick}
              sx={{ mt: 2 }}
            >
              View Profile
            </Button>
          </Paper>
        </Stack>
      </Paper>

      {/* Media Section */}
      {memory.media.length > 0 && (
        <Box mb={4}>
          {/* Images */}
          {images.length > 0 && (
            <Box mb={4}>
              <Typography variant="h5" gutterBottom>
                Photos ({images.length})
              </Typography>
              <ImageList 
                variant="masonry" 
                cols={3} 
                gap={16}
                sx={{
                  // Responsive columns
                  '@media (max-width: 900px)': {
                    columnCount: 2,
                  },
                  '@media (max-width: 600px)': {
                    columnCount: 1,
                  },
                }}
              >
                {images.map((image, index) => (
                  <ImageListItem key={index}>
                    <img
                      src={image.url}
                      alt={image.original_name}
                      loading="lazy"
                      style={{
                        borderRadius: 8,
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(image.url, '_blank')}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </Box>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <Box mb={4}>
              <Typography variant="h5" gutterBottom>
                Videos ({videos.length})
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                {videos.map((video, index) => (
                  <Box key={index}>
                    <video
                      controls
                      style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: 8
                      }}
                    >
                      <source src={video.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {video.original_name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <Box mb={4}>
              <Typography variant="h5" gutterBottom>
                Documents ({documents.length})
              </Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                {documents.map((doc, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box flex={1}>
                          <Typography variant="h6" noWrap>
                            {doc.original_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatFileSize(doc.file_size)}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Footer with back navigation */}
      <Box textAlign="center" pt={4}>
        <Button
          variant="outlined"
          onClick={() => navigate(`/u/${username}`)}
          startIcon={<ArrowBackIcon />}
          size="large"
        >
          View More Memories from {memory.author.firstName}
        </Button>
      </Box>
    </Container>
  );
};

export default PublicMemoryView;
