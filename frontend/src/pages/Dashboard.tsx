import React, { useState } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Fab,
  Box,
  Chip,
  Alert,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Fade,
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Photo as PhotoIcon,
  ArrowBack as ArrowBackIcon,
  Pets as PetsIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { entriesAPI } from '../services/api';
import { TravelEntry } from '../types';
import Loading from '../components/Loading';
import AuthenticatedImage from '../components/AuthenticatedImage';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get('date');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const limit = 12;

  // Build query parameters based on whether we have a selected date
  const queryParams = selectedDate 
    ? { date: selectedDate, sortBy: 'entry_date', sortOrder: 'DESC' }
    : { page, limit, sortBy: 'entry_date', sortOrder: 'DESC' };

  const {
    data: entriesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['entries', selectedDate || page, limit],
    queryFn: () => entriesAPI.getEntries(queryParams),
  });

  const handleCreateEntry = () => {
    navigate('/map'); // Navigate to map to create new entry
  };

  const handleViewEntry = (entryId: number) => {
    navigate(`/entry/${entryId}`, {
      state: {
        from: 'dashboard',
        selectedDate: selectedDate
      }
    });
  };

  if (isLoading) return <Loading />;
  if (error) return <Typography color="error">Error loading entries</Typography>;

  const entries = entriesData?.data.entries || [];
  const pagination = entriesData?.data.pagination;

  // Format the selected date for display
  const formattedDate = selectedDate && isValid(parseISO(selectedDate))
    ? format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')
    : null;

  return (
    <Box sx={backgroundStyles.secondary}>
      <Container maxWidth="lg" sx={{ pt: 4, pb: 4, minHeight: '100vh' }}>
        {/* Header with optional date and back button */}
        <Fade in timeout={800}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box display="flex" alignItems="center" gap={2}>
              {selectedDate && (
                <IconButton 
                  onClick={() => navigate('/calendar')} 
                  sx={{
                    background: 'rgba(255,255,255,0.9)',
                    '&:hover': {
                      background: 'rgba(255,255,255,1)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
              )}
              <Box>
                <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {selectedDate ? 'Memories for' : 'Your Fojourn'}
                </Typography>
                {formattedDate && (
                  <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
                    {formattedDate}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size="small"
                sx={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: 2,
                  '& .MuiToggleButton-root': {
                    px: { xs: 1, sm: 2 }, // Smaller padding on mobile
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }, // Smaller font on mobile
                  },
                }}
              >
                <ToggleButton value="grid">Grid</ToggleButton>
                <ToggleButton value="list">List</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateEntry}
                size="large"
                sx={{
                  px: { xs: 1.5, sm: 3 }, 
                  py: { xs: 1, sm: 1.5 }, 
                  fontSize: { xs: '0.875rem', sm: '1rem' }, 
                  minWidth: { xs: 'auto', sm: 'auto' },
                  display: { xs: 'none', sm: 'flex' }, // Hide on mobile
                }}
              >
                Add Memory
              </Button>
            </Box>
          </Box>
        </Fade>

        {entries.length === 0 ? (
          <Fade in timeout={1000}>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              minHeight="50vh"
              textAlign="center"
              sx={componentStyles.glassCard}
            >
              <Typography variant="h5" color="primary.main" gutterBottom sx={{ fontWeight: 600 }}>
                {selectedDate ? 'No travel memories for this date' : 'No travel memories yet'}
              </Typography>
              <Typography variant="body1" color="textSecondary" mb={4} sx={{ maxWidth: 500 }}>
                {selectedDate 
                  ? 'Start documenting your travels for this day by adding a memory'
                  : 'Start documenting your travels by adding your first memory. Capture the moments that matter!'
                }
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateEntry}
                size="large"
                sx={{
                  px: { xs: 2, sm: 4 },
                  py: { xs: 1, sm: 1.5 },
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                }}
              >
                Create Your First Memory
              </Button>
            </Box>
          </Fade>
        ) : (
          <>
            <Fade in timeout={1200}>
              <Box sx={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr', gap: 3 }}>
                {entries.map((entry: TravelEntry, index) => (
                  <Fade in timeout={800 + index * 100} key={entry.id}>
                    <Card 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                        },
                      }}
                      onClick={() => handleViewEntry(entry.id)}
                    >
                  {entry.media && entry.media.length > 0 && (
                    <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                      <AuthenticatedImage
                        src={entry.media[0].thumbnailUrl || entry.media[0].url}
                        alt={entry.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        loading="lazy"
                      />
                      {entry.media.length > 1 && (
                        <Chip
                          icon={<PhotoIcon />}
                          label={`+${entry.media.length - 1}`}
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                          }}
                        />
                      )}
                    </Box>
                  )}
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="h2">
                      {entry.title}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary">
                        {entry.entryDate && !isNaN(new Date(entry.entryDate).getTime()) 
                          ? format(new Date(entry.entryDate), 'MMM dd, yyyy')
                          : 'No date'
                        }
                      </Typography>
                    </Box>
                    
                    {entry.locationName && (
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="textSecondary">
                          {entry.locationName}
                        </Typography>
                      </Box>
                    )}
                    
                    {entry.isDogFriendly && (
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <PetsIcon fontSize="small" color="success" />
                        <Typography variant="body2" color="success.main">
                          Dog Friendly
                        </Typography>
                      </Box>
                    )}
                    
                    {entry.description && (
                      <Typography variant="body2" color="textSecondary" mb={2}>
                        {entry.description.length > 100
                          ? `${entry.description.substring(0, 100)}...`
                          : entry.description}
                      </Typography>
                    )}
                    
                    {entry.tags && entry.tags.length > 0 && (
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                        {entry.tags.length > 3 && (
                          <Chip label={`+${entry.tags.length - 3}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <Button size="small" onClick={() => handleViewEntry(entry.id)}>
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Fade>
            ))}
          </Box>
        </Fade>

        {pagination && pagination.totalPages > 1 && (
          <Fade in timeout={1400}>
            <Box display="flex" justifyContent="center" mt={4}>
              <Button
                variant="outlined"
                disabled={!pagination.hasPrev}
                onClick={() => setPage(page - 1)}
                sx={{ mr: 1 }}
              >
                Previous
              </Button>
              <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                Page {pagination.page} of {pagination.totalPages}
              </Typography>
              <Button
                variant="outlined"
                disabled={!pagination.hasNext}
                onClick={() => setPage(page + 1)}
                sx={{ ml: 1 }}
              >
                Next
              </Button>
            </Box>
          </Fade>
        )}
      </>
    )}

        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', sm: 'none' }, // Show only on mobile
          }}
          onClick={handleCreateEntry}
        >
          <AddIcon />
        </Fab>
      </Container>
    </Box>
  );
};

export default Dashboard;
