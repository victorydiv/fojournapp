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
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Photo as PhotoIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { entriesAPI } from '../services/api';
import { TravelEntry } from '../types';
import Loading from '../components/Loading';

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
    navigate(`/entry/${entryId}`);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header with optional date and back button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          {selectedDate && (
            <IconButton onClick={() => navigate('/calendar')} color="primary">
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box>
            <Typography variant="h4" component="h1">
              {selectedDate ? 'Memories for' : 'Your Travel Log'}
            </Typography>
            {formattedDate && (
              <Typography variant="h6" color="text.secondary">
                {formattedDate}
              </Typography>
            )}
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid">Grid</ToggleButton>
            <ToggleButton value="list">List</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateEntry}
            size="large"
          >
            Add Memory
          </Button>
        </Box>
      </Box>

      {entries.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          textAlign="center"
        >
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {selectedDate ? 'No travel memories for this date' : 'No travel memories yet'}
          </Typography>
          <Typography variant="body1" color="textSecondary" mb={3}>
            {selectedDate 
              ? 'Start documenting your travels for this day by adding a memory'
              : 'Start documenting your travels by adding your first memory'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateEntry}
            size="large"
          >
            Create Your First Memory
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr', gap: 3 }}>
            {entries.map((entry: TravelEntry) => (
              <Box key={entry.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {entry.media && entry.media.length > 0 && (
                    <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                      <img
                        src={entry.media[0].fileType === 'video' && entry.media[0].thumbnailUrl 
                          ? entry.media[0].thumbnailUrl 
                          : entry.media[0].url}
                        alt={entry.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(e) => {
                          console.error('Image failed to load:', entry.media?.[0]?.url);
                          e.currentTarget.style.display = 'none';
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
              </Box>
            ))}
          </Box>

          {pagination && pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Button
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
                disabled={!pagination.hasNext}
                onClick={() => setPage(page + 1)}
                sx={{ ml: 1 }}
              >
                Next
              </Button>
            </Box>
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
        }}
        onClick={handleCreateEntry}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

export default Dashboard;
