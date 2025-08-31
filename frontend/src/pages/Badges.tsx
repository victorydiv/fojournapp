import React from 'react';
import {
  Container,
  Typography,
  Box,
  Fade,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { backgroundStyles } from '../theme/fojournTheme';
import BadgeDisplay from '../components/BadgeDisplay';

const Badges: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={backgroundStyles.secondary}>
      <Fade in timeout={800}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Your Badge Collection
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Track your achievements and milestones in your travel journey
            </Typography>
          </Box>

          {user?.id && (
            <BadgeDisplay 
              userId={user.id}
              showProgress={true}
              variant="grid"
              size="large"
            />
          )}
        </Container>
      </Fade>
    </Box>
  );
};

export default Badges;
