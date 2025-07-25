import api from '../services/api';
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  CardHeader,
  Avatar
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon, 
  LocationOn as LocationIcon, 
  CalendarToday as CalendarIcon 
} from '@mui/icons-material';
import { searchAPI } from '../services/api';
import { TravelEntry } from '../types';
import { useNavigate } from 'react-router-dom';

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [hasPhotos, setHasPhotos] = useState(false);
  const [results, setResults] = useState<TravelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/entries');
      let filteredEntries = response.data.entries || response.data || [];
      
      // Filter by keyword if provided
      if (keyword) {
        filteredEntries = filteredEntries.filter((entry: TravelEntry) => 
          (entry.title && entry.title.toLowerCase().includes(keyword.toLowerCase())) ||
          (entry.description && entry.description.toLowerCase().includes(keyword.toLowerCase())) ||
          (entry.locationName && entry.locationName.toLowerCase().includes(keyword.toLowerCase()))
        );
      }
      
      // Filter by photos if checkbox is checked
      if (hasPhotos) {
        filteredEntries = filteredEntries.filter((entry: TravelEntry) => 
          entry.media && entry.media.length > 0
        );
      }
      
      // Filter by date range if provided
      if (startDate && endDate) {
        filteredEntries = filteredEntries.filter((entry: TravelEntry) => {
          const entryDate = new Date(entry.entryDate).getTime();
          return entryDate >= new Date(startDate).getTime() && entryDate <= new Date(endDate).getTime();
        });
      }
      
      // Filter by tags if provided
      if (selectedTags) {
        const searchTags = selectedTags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
        filteredEntries = filteredEntries.filter((entry: TravelEntry) => {
          if (!entry.tags || entry.tags.length === 0) return false;
          // Check that ALL search tags are found in the entry's tags (AND logic)
          return searchTags.every(searchTag => 
            entry.tags!.some((entryTag: string) => 
              entryTag.toLowerCase().includes(searchTag)
            )
          );
        });
      }
      
      setResults(filteredEntries);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setKeyword('');
    setHasPhotos(false);
    setStartDate('');
    setEndDate('');
    setSelectedTags('');
    setResults([]);
    setError(null);
  };

  const handleEntryClick = (entryId: number) => {
    navigate(`/entry/${entryId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Search Travel Entries
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Search keywords"
              placeholder="Search in titles, descriptions, locations..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasPhotos}
                  onChange={(e) => setHasPhotos(e.target.checked)}
                />
              }
              label="Only entries with photos"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ flex: 1 }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Tags (comma separated)"
              placeholder="e.g. beach, sunset, friends"
              value={selectedTags}
              onChange={(e) => setSelectedTags(e.target.value)}
            />
          </Box>
        </CardContent>

        <CardActions>
          <Button 
            variant="contained" 
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<ClearIcon />}
            onClick={clearFilters}
          >
            Clear
          </Button>
        </CardActions>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader 
            title={`Search Results (${results.length})`}
            avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><SearchIcon /></Avatar>}
          />
          <CardContent>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {results.map((entry) => (
                <Card key={entry.id} variant="outlined" sx={{ p: 2 }} onClick={() => handleEntryClick(entry.id)}>
                  <Typography variant="h6" component="h3">
                    {entry.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {entry.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon fontSize="small" />
                      <Typography variant="body2">
                        {new Date(entry.entryDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    {entry.locationName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationIcon fontSize="small" />
                        <Typography variant="body2">
                          {entry.locationName}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {!loading && results.length === 0 && (keyword || hasPhotos) && (
        <Alert severity="info">
          No travel entries found matching your search criteria.
        </Alert>
      )}
    </Container>
  );
};

export default Search;