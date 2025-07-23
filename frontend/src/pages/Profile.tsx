import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          User Profile
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Welcome, {user?.firstName || user?.username}!
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
          Profile management coming soon...
        </Typography>
      </Box>
    </Container>
  );
};

export default Profile;
