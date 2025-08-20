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
  useTheme
} from '@mui/material';
import {
  TravelExplore as JourneyIcon,
  Photo as MemoryIcon,
  CloudQueue as DreamIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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

  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/entries/stats');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
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
    }
  ];

  const renderMemoryCard = (card: any) => {
    const hasMemories = card.stats?.total > 0;
    
    return (
      <Card 
        key={card.type}
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8]
          }
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
                '&:hover': { 
                  backgroundColor: card.color,
                  filter: 'brightness(0.9)'
                }
              }}
            >
              Create
            </Button>
            
            {hasMemories && (
              <Button
                variant="outlined"
                onClick={() => navigate(card.viewPath)}
                sx={{ borderColor: card.color, color: card.color }}
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
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8]
          }
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
                '&:hover': { 
                  backgroundColor: card.color,
                  filter: 'brightness(0.9)'
                }
              }}
            >
              Create
            </Button>
            
            {hasJourneys && (
              <Button
                variant="outlined"
                onClick={() => navigate(card.viewPath)}
                sx={{ borderColor: card.color, color: card.color }}
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
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8]
          }
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
                '&:hover': { 
                  backgroundColor: card.color,
                  filter: 'brightness(0.9)'
                }
              }}
            >
              Create
            </Button>
            
            {hasDreams && (
              <Button
                variant="outlined"
                onClick={() => navigate(card.viewPath)}
                sx={{ borderColor: card.color, color: card.color }}
              >
                View All
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Welcome to Fojourn
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Your personal travel companion for memories, journeys, and dreams
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
        {cards.map((card) => (
          <Box key={card.type}>
            {card.type === 'memories' && renderMemoryCard(card)}
            {card.type === 'journeys' && renderJourneyCard(card)}
            {card.type === 'dreams' && renderDreamCard(card)}
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default HomePage;
