import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import ChecklistManager from '../components/ChecklistManager';

const ChecklistsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <ChecklistManager />
    </Container>
  );
};

export default ChecklistsPage;
