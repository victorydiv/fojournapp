import React from 'react';
import { Container, Typography, Box, Fade } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={backgroundStyles.secondary}>
      <Fade in timeout={800}>
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
      </Fade>
    </Box>
  );
};

export default Profile;
