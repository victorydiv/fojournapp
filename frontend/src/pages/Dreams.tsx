import React, { useState } from 'react';
import { Box } from '@mui/material';
import DreamsPage from '../components/DreamsPage';
import CreateDreamDialog from '../components/CreateDreamDialog';
import EditDreamDialog from '../components/EditDreamDialog';
import { Dream } from '../types';

const Dreams: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateDream = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleDreamCreated = (dream: any) => {
    // Refresh the dreams list by triggering a re-render
    setRefreshKey(prev => prev + 1);
    console.log('Dream created:', dream);
  };

  const handleEditDream = (dream: Dream) => {
    setSelectedDream(dream);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedDream(null);
  };

  const handleDreamUpdated = (dream: Dream) => {
    // Refresh the dreams list by triggering a re-render
    setRefreshKey(prev => prev + 1);
    console.log('Dream updated:', dream);
  };

  return (
    <Box sx={{ height: '100vh', overflow: 'auto' }}>
      <DreamsPage
        key={refreshKey}
        onCreateDream={handleCreateDream}
        onEditDream={handleEditDream}
      />
      
      <CreateDreamDialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        onDreamCreated={handleDreamCreated}
      />

      <EditDreamDialog
        open={editDialogOpen}
        dream={selectedDream}
        onClose={handleCloseEditDialog}
        onDreamUpdated={handleDreamUpdated}
      />
    </Box>
  );
};

export default Dreams;
