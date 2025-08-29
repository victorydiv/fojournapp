import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  Stack,
  Avatar,
  Paper,
} from '@mui/material';
import {
  ExploreOutlined,
  CameraAltOutlined,
  MapOutlined,
  FlightTakeoffOutlined,
  FavoriteOutlined,
  ArrowForwardOutlined,
  StarOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@mui/system';
import Footer from '../components/Footer';

// Animations
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <CameraAltOutlined sx={{ fontSize: 40 }} />,
      title: 'Capture Memories',
      description: 'Save your travel moments with photos, videos, and detailed notes',
      color: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    },
    {
      icon: <MapOutlined sx={{ fontSize: 40 }} />,
      title: 'Interactive Maps',
      description: 'Pin your adventures on an interactive world map and relive your journeys',
      color: '#4ECDC4',
      gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
    },
    {
      icon: <FlightTakeoffOutlined sx={{ fontSize: 40 }} />,
      title: 'Plan Adventures',
      description: 'Create dream destinations and plan future travels with smart organization',
      color: '#45B7D1',
      gradient: 'linear-gradient(135deg, #45B7D1 0%, #96CEB4 100%)',
    },
  ];

  const stats = [
    { number: '10K+', label: 'Memories Captured', icon: <CameraAltOutlined /> },
    { number: '500+', label: 'Points of Interest', icon: <ExploreOutlined /> },
    { number: '25K+', label: 'Adventures Planned', icon: <FlightTakeoffOutlined /> },
    { number: '98%', label: 'User Satisfaction', icon: <FavoriteOutlined /> },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      avatar: '🌸',
      location: 'San Francisco, CA',
      text: 'Fojourn helped me organize 2 years of travel memories across the West Coast. The map feature is incredible!',
      rating: 5,
    },
    {
      name: 'Marcus Rodriguez',
      avatar: '🏔️',
      location: 'Denver, CO',
      text: 'Planning my next adventure has never been easier. Love the dream destinations feature for exploring national parks.',
      rating: 5,
    },
    {
      name: 'Emma Thompson',
      avatar: '🏖️',
      location: 'Miami, FL',
      text: 'Beautiful interface and so intuitive. My travel journal finally feels complete after visiting all 50 states.',
      rating: 5,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box
          sx={{
            pt: { xs: 8, md: 12 },
            pb: { xs: 6, md: 8 },
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <Fade in={isVisible} timeout={1000}>
            <Box>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
                  fontWeight: 900,
                  background: 'linear-gradient(45deg, #FFE66D, #FF6B6B, #4ECDC4)',
                  backgroundSize: '400% 400%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  animation: `${gradientShift} 3s ease infinite`,
                  mb: 2,
                  textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                }}
              >
                Fojourn
              </Typography>
              
              <Typography
                variant="h4"
                sx={{
                  color: 'white',
                  mb: 3,
                  fontSize: { xs: '1.2rem', md: '1.8rem' },
                  fontWeight: 300,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                Your Digital Travel Companion
              </Typography>
              
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  mb: 4,
                  maxWidth: '600px',
                  mx: 'auto',
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  lineHeight: 1.6,
                }}
              >
                Capture memories, explore the world, and plan your next adventure 
                with our beautiful, intuitive travel journal
              </Typography>
            </Box>
          </Fade>

          <Slide in={isVisible} direction="up" timeout={1500}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              sx={{ mb: 6 }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  background: 'linear-gradient(45deg, #FF6B6B, #FFE66D)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  animation: `${pulse} 2s ease-in-out infinite`,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #FF5252, #FFD54F)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(255,107,107,0.3)',
                  },
                }}
                endIcon={<ArrowForwardOutlined />}
              >
                Start Your Journey
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.1)',
                    borderColor: 'white',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Sign In
              </Button>
            </Stack>
          </Slide>

          {/* Floating Elements */}
          <Box
            sx={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              animation: `${float} 3s ease-in-out infinite`,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <ExploreOutlined sx={{ fontSize: 60, color: 'rgba(255,255,255,0.3)' }} />
          </Box>
          
          <Box
            sx={{
              position: 'absolute',
              top: '30%',
              right: '15%',
              animation: `${float} 3s ease-in-out infinite 1s`,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <CameraAltOutlined sx={{ fontSize: 50, color: 'rgba(255,255,255,0.3)' }} />
          </Box>
        </Box>
      </Container>

      {/* Features Section */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          background: 'rgba(255,255,255,0.95)',
          position: 'relative',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            textAlign="center"
            sx={{
              mb: 6,
              fontWeight: 700,
              color: theme.palette.primary.main,
              fontSize: { xs: '2rem', md: '3rem' },
            }}
          >
            Everything You Need for Travel
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 4,
            }}
          >
            {features.map((feature, index) => (
              <Box key={index}>
                <Fade in={isVisible} timeout={1000 + index * 200}>
                  <Card
                    sx={{
                      height: '100%',
                      textAlign: 'center',
                      border: 'none',
                      borderRadius: 4,
                      overflow: 'hidden',
                      position: 'relative',
                      background: feature.gradient,
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: currentFeature === index ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: currentFeature === index 
                        ? '0 20px 40px rgba(0,0,0,0.2)' 
                        : '0 10px 20px rgba(0,0,0,0.1)',
                      '&:hover': {
                        transform: 'scale(1.05) translateY(-5px)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Box
                        sx={{
                          mb: 3,
                          animation: currentFeature === index ? `${pulse} 2s infinite` : 'none',
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="h5" fontWeight={700} gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Fade>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box
        sx={{
          py: { xs: 6, md: 8 },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 4,
            }}
          >
            {stats.map((stat, index) => (
              <Box key={index}>
                <Fade in={isVisible} timeout={1500 + index * 200}>
                  <Box textAlign="center" sx={{ color: 'white' }}>
                    <Box sx={{ mb: 2 }}>
                      {React.cloneElement(stat.icon, { 
                        sx: { fontSize: 40, color: '#FFE66D' } 
                      })}
                    </Box>
                    <Typography
                      variant="h3"
                      fontWeight={900}
                      sx={{
                        fontSize: { xs: '2rem', md: '3rem' },
                        color: '#FFE66D',
                        mb: 1,
                      }}
                    >
                      {stat.number}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                </Fade>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          background: 'rgba(255,255,255,0.98)',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            textAlign="center"
            sx={{
              mb: 6,
              fontWeight: 700,
              color: theme.palette.primary.main,
              fontSize: { xs: '2rem', md: '3rem' },
            }}
          >
            Loved by Travelers Worldwide
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 4,
            }}
          >
            {testimonials.map((testimonial, index) => (
              <Box key={index}>
                <Fade in={isVisible} timeout={2000 + index * 200}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      borderRadius: 3,
                      height: '100%',
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                      position: 'relative',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 15px 30px rgba(0,0,0,0.1)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ mr: 2, bgcolor: '#FFE66D', fontSize: '1.5rem' }}>
                        {testimonial.avatar}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {testimonial.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {testimonial.location}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box mb={2}>
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <StarOutlined key={i} sx={{ color: '#FFD700', fontSize: 20 }} />
                      ))}
                    </Box>
                    
                    <Typography variant="body1" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                      "{testimonial.text}"
                    </Typography>
                  </Paper>
                </Fade>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          background: 'linear-gradient(45deg, #FF6B6B 0%, #4ECDC4 100%)',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Fade in={isVisible} timeout={2500}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  mb: 3,
                  fontSize: { xs: '2rem', md: '3rem' },
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                Ready to Start Your Adventure?
              </Typography>
              
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  mb: 4,
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  lineHeight: 1.6,
                }}
              >
                Join thousands of travelers who trust Fojourn to capture and organize 
                their most precious memories
              </Typography>
              
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  background: 'white',
                  color: '#FF6B6B',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  px: 6,
                  py: 2,
                  borderRadius: 3,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.9)',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  },
                }}
                endIcon={<ArrowForwardOutlined />}
              >
                Get Started Free
              </Button>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* Footer */}
      <Footer variant="dark" />
    </Box>
  );
};

export default LandingPage;
