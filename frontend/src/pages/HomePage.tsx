import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  useTheme,
  Fade,
} from '@mui/material';
import {
  TravelExplore as JourneyIcon,
  Photo as MemoryIcon,
  CloudQueue as DreamIcon,
  Add as AddIcon,
  EmojiEvents as BadgeIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { entriesAPI, badgeAPI } from '../services/api';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';
import AnnouncementDisplay from '../components/AnnouncementDisplay';
import BadgeDisplay from '../components/BadgeDisplay';

interface StatsResponse {
  memories: {
    total: number;
    thisMonth: number;
    favoriteType?: string;
    recentLocations: string[];
  };
  journeys: {
    total: number;
    active: number;
    completed: number;
    upcoming: number;
  };
  dreams: {
    total: number;
    achieved: number;
    pending: number;
    favoriteType?: string;
  };
}

const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await entriesAPI.getStats();
      return response.data;
    }
  });

  const { data: userBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await badgeAPI.getUserBadges(user.id);
      return response.data;
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LinearProgress />
        </Container>
      </Box>
    );
  }

  const cards = [
    {
      type: 'memories',
      title: 'Memories',
      icon: <MemoryIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      color: theme.palette.primary.main,
      stats: stats?.memories,
      createPath: '/dashboard',
      viewPath: '/dashboard'
    },
    {
      type: 'journeys',
      title: 'Journeys',
      icon: <JourneyIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
      color: theme.palette.secondary.main,
      stats: stats?.journeys,
      createPath: '/journeys',
      viewPath: '/journeys'
    },
    {
      type: 'dreams',
      title: 'Dreams',
      icon: <DreamIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />,
      color: theme.palette.success.main,
      stats: stats?.dreams,
      createPath: '/dreams',
      viewPath: '/dreams'
    },
    {
      type: 'badges',
      title: 'Badges',
      icon: <BadgeIcon sx={{ fontSize: 48, color: theme.palette.warning.main }} />,
      color: theme.palette.warning.main,
      stats: userBadges?.badges ? {
        total: userBadges.badges.length,
        earned: userBadges.badges.filter((b: any) => b.earned_at).length,
        progress: userBadges.badges.filter((b: any) => !b.earned_at && b.progress_percentage > 0).length
      } : { total: 0, earned: 0, progress: 0 },
      createPath: '/profile',
      viewPath: '/badges'
    }
  ];

  const renderMemoryCard = (card: any) => {
    const hasMemories = card.stats?.total > 0;
    
    return (
      <Card 
        key={card.type}
        sx={{ 
          ...componentStyles.glassCard,
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
          <Box sx={{ mb: 2 }}>
            {card.icon}
          </Box>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            {card.title}
          </Typography>

          {hasMemories ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ color: card.color, fontWeight: 700, mb: 1 }}>
                {card.stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total memories captured
              </Typography>
              
              {card.stats.thisMonth > 0 && (
                <Chip 
                  label={`${card.stats.thisMonth} this month`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
              )}
              
              {card.stats.favoriteType && (
                <Typography variant="body2" color="text.secondary">
                  Favorite: {card.stats.favoriteType}
                </Typography>
              )}

              {card.stats.recentLocations && card.stats.recentLocations.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Recent: {card.stats.recentLocations.slice(0, 2).join(', ')}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Start building your memories
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Capture your travel experiences with photos, notes, and locations
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(card.createPath)}
              sx={{ 
                backgroundColor: card.color,
                color: 'white',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': { 
                  backgroundColor: card.color,
                  filter: 'brightness(0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 20px ${card.color}40`
                }
              }}
            >
              Create
            </Button>
            
            {hasMemories && (
              <Button
                variant="outlined"
                onClick={() => navigate(card.viewPath)}
                sx={{ 
                  borderColor: card.color, 
                  color: card.color,
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: card.color,
                    backgroundColor: `${card.color}10`,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                View All
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderJourneyCard = (card: any) => {
    const hasJourneys = card.stats?.total > 0;
    
    return (
      <Card 
        key={card.type}
        sx={{ 
          ...componentStyles.glassCard,
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
          <Box sx={{ mb: 2 }}>
            {card.icon}
          </Box>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            {card.title}
          </Typography>

          {hasJourneys ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ color: card.color, fontWeight: 700, mb: 1 }}>
                {card.stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total journeys planned
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
                {card.stats.active > 0 && (
                  <Chip label={`${card.stats.active} active`} size="small" color="primary" />
                )}
                {card.stats.completed > 0 && (
                  <Chip label={`${card.stats.completed} completed`} size="small" color="success" />
                )}
                {card.stats.upcoming > 0 && (
                  <Chip label={`${card.stats.upcoming} upcoming`} size="small" color="warning" />
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Start building your journeys
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Plan collaborative trips with friends and track your adventures
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(card.createPath)}
              sx={{ 
                backgroundColor: card.color,
                color: 'white',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': { 
                  backgroundColor: card.color,
                  filter: 'brightness(0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 20px ${card.color}40`
                }
              }}
            >
              Create
            </Button>
            
            {hasJourneys && (
              <Button
                variant="outlined"
                onClick={() => navigate(card.viewPath)}
                sx={{ 
                  borderColor: card.color, 
                  color: card.color,
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: card.color,
                    backgroundColor: `${card.color}10`,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                View All
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderDreamCard = (card: any) => {
    const hasDreams = card.stats?.total > 0;
    
    return (
      <Card 
        key={card.type}
        sx={{ 
          ...componentStyles.glassCard,
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
          <Box sx={{ mb: 2 }}>
            {card.icon}
          </Box>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            {card.title}
          </Typography>

          {hasDreams ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ color: card.color, fontWeight: 700, mb: 1 }}>
                {card.stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Travel dreams & goals
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
                {card.stats.achieved > 0 && (
                  <Chip label={`${card.stats.achieved} achieved`} size="small" color="success" />
                )}
                {card.stats.pending > 0 && (
                  <Chip label={`${card.stats.pending} pending`} size="small" color="warning" />
                )}
              </Box>

              {card.stats.favoriteType && (
                <Typography variant="body2" color="text.secondary">
                  Favorite: {card.stats.favoriteType}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Start building your dreams
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set travel goals and track your bucket list destinations
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(card.createPath)}
              sx={{ 
                backgroundColor: card.color,
                color: 'white',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': { 
                  backgroundColor: card.color,
                  filter: 'brightness(0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 20px ${card.color}40`
                }
              }}
            >
              Create
            </Button>
            
            {hasDreams && (
              <Button
                variant="outlined"
                onClick={() => navigate(card.viewPath)}
                sx={{ 
                  borderColor: card.color, 
                  color: card.color,
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: card.color,
                    backgroundColor: `${card.color}10`,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                View All
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderBadgeCard = (card: any) => {
    const hasBadges = card.stats?.total > 0;
    
    return (
      <Card 
        key={card.type}
        sx={{ 
          ...componentStyles.glassCard,
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 20px ${card.color}40`
          }
        }}
        onClick={() => navigate(card.viewPath)}
      >
        <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
          <Box sx={{ mb: 2 }}>
            {card.icon}
          </Box>
          
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            {card.title}
          </Typography>

          {hasBadges ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ color: card.color, fontWeight: 700, mb: 1 }}>
                {card.stats.earned}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Badges earned
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
                <Chip 
                  label={`${card.stats.total} total`} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
                {card.stats.progress > 0 && (
                  <Chip 
                    label={`${card.stats.progress} in progress`} 
                    size="small" 
                    color="warning" 
                    variant="outlined" 
                  />
                )}
              </Box>

              {/* Mini badge preview */}
              <Box sx={{ mt: 2 }}>
                <BadgeDisplay 
                  userId={user?.id} 
                  variant="horizontal" 
                  showProgress={false}
                  maxDisplay={4}
                />
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Start earning badges
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete activities and milestones to unlock achievement badges
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                navigate(card.viewPath);
              }}
              sx={{ 
                backgroundColor: card.color,
                color: 'white',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': { 
                  backgroundColor: card.color,
                  filter: 'brightness(0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 20px ${card.color}40`
                }
              }}
            >
              View Collection
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={backgroundStyles.secondary}>
      <Fade in timeout={800}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Welcome to Fojourn
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Your personal travel companion for memories, journeys, and dreams
            </Typography>
          </Box>

          <AnnouncementDisplay maxAnnouncements={3} showFeaturedOnly={false} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 4 }}>
            {cards.map((card) => (
              <Box key={card.type}>
                {card.type === 'memories' && renderMemoryCard(card)}
                {card.type === 'journeys' && renderJourneyCard(card)}
                {card.type === 'dreams' && renderDreamCard(card)}
                {card.type === 'badges' && renderBadgeCard(card)}
              </Box>
            ))}
          </Box>
        </Container>
      </Fade>
    </Box>
  );
};

export default HomePage;
