import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  TravelExplore as TravelIcon,
  PhotoLibrary as PhotoIcon,
  FeaturedPlayList as FeaturedIcon,
  EmojiEvents as BadgeIcon,
  Pets as PetsIcon
} from '@mui/icons-material';
import { publicAPI } from '../services/api';
import Footer from '../components/Footer';
import BadgeDisplay from '../components/BadgeDisplay';
import ProfileSocialShare from '../components/ProfileSocialShare';

interface PublicUser {
  id: number;
  username: string;
  publicUsername?: string;
  firstName?: string;
  lastName?: string;
  profileBio?: string;
  avatarUrl?: string;
  heroImageUrl?: string;
  stats: {
    total_memories: number;
    featured_memories: number;
    earliest_memory?: string;
    latest_memory?: string;
  };
}

interface PublicMemory {
  id: number;
  title: string;
  description?: string;
  public_slug: string;
  entry_date: string;
  location_name?: string;
  thumbnail_url?: string;
  featured: boolean;
  isDogFriendly?: boolean;
}

const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [memories, setMemories] = useState<PublicMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!username) return;
      
      try {
        setLoading(true);
        
        // Fetch user profile and memories in parallel
        const [userResponse, memoriesResponse] = await Promise.all([
          publicAPI.getPublicProfile(username),
          publicAPI.getPublicMemories(username)
        ]);
        
        // Combine user data with stats
        const userWithStats = {
          ...userResponse.data.user,
          stats: userResponse.data.stats
        };
        
        setUser(userWithStats);
        setMemories(memoriesResponse.data.memories || []);
      } catch (error: any) {
        console.error('Error fetching profile data:', error);
        if (error.response?.status === 404) {
          setError('Profile not found or is private');
        } else {
          setError('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [username]);

  const handleMemoryClick = (memory: PublicMemory) => {
    navigate(`/u/${username}/memory/${memory.public_slug}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Box>
      </Container>
    );
  }

  if (!user) return null;

  const featuredMemories = memories.filter(m => m.featured);
  const recentMemories = memories.filter(m => !m.featured).slice(0, 6);

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Profile Header */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
        {/* Hero Image Section */}
        {user.heroImageUrl && (
          <Box
            sx={{
              width: '100%',
              height: { xs: 200, md: 300 },
              backgroundImage: `url(${user.heroImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }}
          >
            {/* Optional overlay for better text readability */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.3))'
              }}
            />
          </Box>
        )}
        
        {/* Profile Info Section */}
        <Box sx={{ p: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center">
            <Avatar
              src={user.avatarUrl}
              sx={{ 
                width: { xs: 120, md: 150 }, 
                height: { xs: 120, md: 150 },
                border: 3,
                borderColor: 'primary.main',
                // Move avatar up slightly if hero image exists
                ...(user.heroImageUrl && {
                  mt: { xs: -6, md: -10 },
                  boxShadow: 3
                })
              }}
            >
              {user.firstName?.[0]}{user.lastName?.[0]}
            </Avatar>
            
            <Box flex={1} textAlign={{ xs: 'center', md: 'left' }}>
              <Typography variant="h3" component="h1" gutterBottom>
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                @{user.publicUsername || user.username}
              </Typography>
              
              {user.profileBio && (
                <Typography variant="body1" sx={{ mb: 3, maxWidth: 600 }}>
                  {user.profileBio}
                </Typography>
              )}
              
              <ProfileSocialShare 
                user={user}
                username={user.publicUsername || user.username}
              />
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* Stats Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
          gap: 2 
        }}>
          <Card sx={{ textAlign: 'center', p: 3 }}>
            <TravelIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="primary">
              {user.stats.total_memories}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Memories
            </Typography>
          </Card>
          
          <Card sx={{ textAlign: 'center', p: 3 }}>
            <LocationIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="secondary">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Countries
            </Typography>
          </Card>
          
          <Card sx={{ textAlign: 'center', p: 3 }}>
            <PhotoIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="info.main">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cities
            </Typography>
          </Card>
          
          <Card sx={{ textAlign: 'center', p: 3 }}>
            <StarIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {user.stats.featured_memories}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Featured
            </Typography>
          </Card>
        </Box>
      </Box>

      {/* Badge Collection */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <BadgeIcon color="warning" />
          <Typography variant="h4" component="h2">
            Badge Collection
          </Typography>
        </Stack>
        
        <Card sx={{ p: 3 }}>
          <BadgeDisplay 
            username={username}
            showProgress={false}
            variant="grid"
            size="medium"
            maxDisplay={8}
            publicMode={true}
          />
        </Card>
      </Box>

      {/* Featured Memories */}
      {featuredMemories.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={3}>
            <FeaturedIcon color="primary" />
            <Typography variant="h4" component="h2">
              Featured Memories
            </Typography>
          </Stack>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
            gap: 3 
          }}>
            {featuredMemories.map((memory) => (
              <Card
                key={memory.id}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleMemoryClick(memory)}
              >
                {memory.thumbnail_url && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={memory.thumbnail_url}
                    alt={memory.title}
                  />
                )}
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" spacing={1} mb={1}>
                    <Typography variant="h6" component="h3" flex={1}>
                      {memory.title}
                    </Typography>
                    <Chip
                      icon={<StarIcon />}
                      label="Featured"
                      color="primary"
                      size="small"
                    />
                  </Stack>
                  
                  {memory.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                      }}
                    >
                      {memory.description}
                    </Typography>
                  )}
                  
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="caption">
                        {formatDate(memory.entry_date)}
                      </Typography>
                    </Stack>
                    {memory.location_name && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="caption" noWrap>
                          {memory.location_name}
                        </Typography>
                      </Stack>
                    )}
                    {memory.isDogFriendly && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <PetsIcon fontSize="small" color="success" />
                        <Typography variant="caption" color="success.main">
                          Dog Friendly
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Recent Memories */}
      {recentMemories.length > 0 && (
        <Box>
          <Typography variant="h4" component="h2" gutterBottom>
            Recent Memories
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
            gap: 3 
          }}>
            {recentMemories.map((memory) => (
              <Card
                key={memory.id}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleMemoryClick(memory)}
              >
                {memory.thumbnail_url && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={memory.thumbnail_url}
                    alt={memory.title}
                  />
                )}
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {memory.title}
                  </Typography>
                  
                  {memory.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                      }}
                    >
                      {memory.description}
                    </Typography>
                  )}
                  
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="caption">
                        {formatDate(memory.entry_date)}
                      </Typography>
                    </Stack>
                    {memory.location_name && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="caption" noWrap>
                          {memory.location_name}
                        </Typography>
                      </Stack>
                    )}
                    {memory.isDogFriendly && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <PetsIcon fontSize="small" color="success" />
                        <Typography variant="caption" color="success.main">
                          Dog Friendly
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {memories.length === 0 && (
        <Box textAlign="center" py={8}>
          <TravelIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No public memories yet
          </Typography>
          <Typography variant="body1" color="text.disabled">
            {user.firstName} hasn't shared any travel memories publicly yet.
          </Typography>
        </Box>
      )}
      </Container>
      
      <Footer />
    </>
  );
};

export default PublicProfile;