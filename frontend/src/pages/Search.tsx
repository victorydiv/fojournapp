import api, { searchAPI } from '../services/api';
import React, { useState, useEffect } from 'react';
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
  Avatar,
  Autocomplete,
  Chip,
  Fade
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon, 
  LocationOn as LocationIcon, 
  CalendarToday as CalendarIcon 
} from '@mui/icons-material';
import { TravelEntry, SearchParams } from '../types';
import { useNavigate } from 'react-router-dom';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [hasPhotos, setHasPhotos] = useState(false);
  const [results, setResults] = useState<TravelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch available tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await searchAPI.getTags();
        // Extract just the tag names from the {tag, count} objects
        const tagNames = response.data.tags?.map((tagObj: any) => tagObj.tag) || [];
        setAvailableTags(tagNames);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };

    fetchTags();
  }, []);

  const handleTagsChange = (event: any, value: string[]) => {
    setSelectedTags(value);
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      // Build search parameters
      const searchParams: SearchParams = {};
      
      if (keyword.trim()) {
        searchParams.q = keyword.trim();
      }
      
      if (startDate) {
        searchParams.startDate = startDate;
      }
      
      if (endDate) {
        searchParams.endDate = endDate;
      }
      
      if (selectedTags.length > 0) {
        searchParams.tags = selectedTags.join(',');
      }
      
      // Use the proper search API endpoint
      const response = await searchAPI.search(searchParams);
      let searchResults = response.data.entries || [];
      
      // Apply client-side filtering for features not supported by backend API
      if (hasPhotos) {
        searchResults = searchResults.filter((entry: TravelEntry) => 
          entry.media && entry.media.length > 0
        );
      }
      
      setResults(searchResults);
    } catch (err: any) {
      console.error('Search error:', err);
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
    setSelectedTags([]);
    setResults([]);
    setError(null);
    setHasSearched(false);
  };

  const handleEntryClick = (entryId: number) => {
    navigate(`/entry/${entryId}`, {
      state: {
        from: 'search'
      }
    });
  };

  return (
    <Box sx={backgroundStyles.secondary}>
      <Fade in timeout={800}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Search Travel Entries
          </Typography>

          <Card sx={{ ...componentStyles.glassCard, mb: 3 }}>
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
            <Autocomplete
              multiple
              freeSolo
              options={availableTags}
              value={selectedTags}
              onChange={handleTagsChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...otherProps } = getTagProps({ index });
                  return (
                    <Chip
                      variant="outlined"
                      label={option}
                      key={key}
                      {...otherProps}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Select or type tags to filter by..."
                />
              )}
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

      {!loading && hasSearched && results.length === 0 && (keyword || hasPhotos || selectedTags.length > 0) && (
        <Alert severity="info">
          No travel entries found matching your search criteria.
        </Alert>
      )}
        </Container>
      </Fade>
    </Box>
  );
};

export default Search;
