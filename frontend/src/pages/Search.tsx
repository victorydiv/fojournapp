import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Search: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Search Travel Entries
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Advanced search functionality coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default Search;
