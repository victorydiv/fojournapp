import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Map as MapIcon,
  Dashboard as DashboardIcon,
  Hiking as JourneysIcon,
  Star as DreamsIcon,
  Camera as CameraIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon,
  Search as SearchIcon,
  Share as ShareIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
} from '@mui/icons-material';

interface AppTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AppTour: React.FC<AppTourProps> = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const tourSteps = [
    {
      title: "Welcome to Fojourn! 🧭",
      icon: <MapIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            Fojourn is your personal travel companion that helps you capture, organize, and relive your adventures.
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            Let's take a quick tour to show you how to make the most of your travel memories!
          </Typography>
        </Box>
      )
    },
    {
      title: "📸 Memories - Your Travel Journal",
      icon: <DashboardIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            <strong>Memories</strong> are the heart of Fojourn - your personal travel entries for places you've visited.
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" paragraph>
              • 📍 <strong>Pin locations</strong> on the map where you've been
            </Typography>
            <Typography variant="body2" paragraph>
              • 📝 <strong>Add notes</strong> about your experiences
            </Typography>
            <Typography variant="body2" paragraph>
              • 📷 <strong>Upload photos & videos</strong> to preserve the moment
            </Typography>
            <Typography variant="body2" paragraph>
              • 🗓️ <strong>Track dates</strong> to remember when you visited
            </Typography>
            <Typography variant="body2" paragraph>
              • 🔍 <strong>Search & filter</strong> to find specific memories
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: theme.palette.text.secondary }}>
            Think of Memories as your digital scrapbook of places you've already experienced.
          </Typography>
        </Box>
      )
    },
    {
      title: "🥾 Journeys - Your Trip Planner",
      icon: <JourneysIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />,
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            <strong>Journeys</strong> help you plan and organize multi-stop trips or themed adventures.
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" paragraph>
              • 🗺️ <strong>Create trip itineraries</strong> with multiple stops
            </Typography>
            <Typography variant="body2" paragraph>
              • 📅 <strong>Plan dates & duration</strong> for each destination
            </Typography>
            <Typography variant="body2" paragraph>
              • 👥 <strong>Collaborate with travel companions</strong>
            </Typography>
            <Typography variant="body2" paragraph>
              • 📋 <strong>Organize by themes</strong> (food tours, nature trips, etc.)
            </Typography>
            <Typography variant="body2" paragraph>
              • ⭐ <strong>Convert Dreams into planned stops</strong>
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: theme.palette.text.secondary }}>
            Perfect for planning your next vacation or organizing past trips into themed collections.
          </Typography>
        </Box>
      )
    },
    {
      title: "⭐ Dreams - Your Travel Wishlist",
      icon: <DreamsIcon sx={{ fontSize: 48, color: theme.palette.warning.main }} />,
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            <strong>Dreams</strong> are your bucket list of places you want to visit someday.
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" paragraph>
              • 🎯 <strong>Save destinations</strong> you want to explore
            </Typography>
            <Typography variant="body2" paragraph>
              • 🏷️ <strong>Categorize by type</strong> (restaurants, attractions, cities)
            </Typography>
            <Typography variant="body2" paragraph>
              • 📊 <strong>Set priorities</strong> (low, medium, high, urgent)
            </Typography>
            <Typography variant="body2" paragraph>
              • 💰 <strong>Add budget estimates</strong> for planning
            </Typography>
            <Typography variant="body2" paragraph>
              • 🔗 <strong>Save research links</strong> and notes
            </Typography>
            <Typography variant="body2" paragraph>
              • ✅ <strong>Mark as achieved</strong> when you visit them
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: theme.palette.text.secondary }}>
            Start building your travel wishlist and watch your dreams become memories!
          </Typography>
        </Box>
      )
    },
    {
      title: "🗺️ Views & Features",
      icon: <SearchIcon sx={{ fontSize: 48, color: theme.palette.info.main }} />,
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            Explore your travel data in multiple ways:
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" paragraph>
              • 🗺️ <strong>Map View:</strong> See all your locations on an interactive map
            </Typography>
            <Typography variant="body2" paragraph>
              • 📅 <strong>Calendar View:</strong> Browse memories by date
            </Typography>
            <Typography variant="body2" paragraph>
              • 📊 <strong>Dashboard:</strong> Get insights and statistics about your travels
            </Typography>
            <Typography variant="body2" paragraph>
              • 🔍 <strong>Search:</strong> Find specific memories by location, date, or keywords
            </Typography>
            <Typography variant="body2" paragraph>
              • 📱 <strong>Mobile-Friendly:</strong> Access everything on your phone while traveling
            </Typography>
            <Typography variant="body2" paragraph>
              • 🤝 <strong>Sharing:</strong> Share your favorite memories on social media
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      title: "🚀 Ready to Start Your Journey!",
      icon: <CameraIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      content: (
        <Box>
          <Typography variant="body1" paragraph>
            You're all set to start capturing your travel memories with Fojourn!
          </Typography>
          <Paper sx={{ p: 2, bgcolor: theme.palette.background.default, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Quick Start Tips:</strong>
            </Typography>
            <Typography variant="body2" paragraph>
              1. Add your first Memory by clicking the map where you've been
            </Typography>
            <Typography variant="body2" paragraph>
              2. Create some Dreams for places you want to visit
            </Typography>
            <Typography variant="body2" paragraph>
              3. Plan your next trip using Journeys
            </Typography>
            <Typography variant="body2">
              4. Explore different views to see your data in new ways
            </Typography>
          </Paper>
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', fontWeight: 'bold' }}>
            Happy travels! 🌟
          </Typography>
        </Box>
      )
    }
  ];

  const handleNext = () => {
    if (activeStep === tourSteps.length - 1) {
      onComplete();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          minHeight: isMobile ? '100vh' : 500,
          maxHeight: isMobile ? '100vh' : '80vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h5" component="div">
          Welcome to Fojourn
        </Typography>
        <IconButton onClick={handleSkip} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} orientation={isMobile ? "vertical" : "horizontal"}>
            {tourSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel>{`Step ${index + 1}`}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Paper elevation={0} sx={{ p: 3, bgcolor: theme.palette.background.default }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {tourSteps[activeStep].icon}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
            {tourSteps[activeStep].title}
          </Typography>

          {tourSteps[activeStep].content}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ 
        justifyContent: 'space-between', 
        px: 3, 
        py: 2,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 1 : 0
      }}>
        <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
          <Button 
            onClick={handleSkip} 
            color="inherit"
            fullWidth={isMobile}
          >
            Skip Tour
          </Button>
          
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<BackIcon />}
            fullWidth={isMobile}
          >
            Back
          </Button>
        </Box>

        <Button
          onClick={handleNext}
          variant="contained"
          endIcon={activeStep === tourSteps.length - 1 ? null : <NextIcon />}
          fullWidth={isMobile}
        >
          {activeStep === tourSteps.length - 1 ? 'Get Started!' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppTour;
