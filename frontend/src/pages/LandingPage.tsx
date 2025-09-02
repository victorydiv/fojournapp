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
  ArticleOutlined,
  PeopleOutlined,
  EmojiEventsOutlined,
  ShareOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@mui/system';
import Footer from '../components/Footer';
import { useHeroImages } from '../hooks/useHeroImages';

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
  const { heroImages, loading: heroLoading } = useHeroImages();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 6);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through hero images
  useEffect(() => {
    if (heroImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
      }, 6000); // Change every 6 seconds
      return () => clearInterval(interval);
    }
  }, [heroImages.length]);

  const features = [
    {
      icon: <CameraAltOutlined sx={{ fontSize: 40 }} />,
      title: 'Capture Memories',
      description: 'Save your travel moments with photos, videos, and detailed notes with location tagging',
      color: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    },
    {
      icon: <MapOutlined sx={{ fontSize: 40 }} />,
      title: 'Interactive Maps',
      description: 'Pin your adventures on an interactive world map and relive your journeys visually',
      color: '#4ECDC4',
      gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
    },
    {
      icon: <FlightTakeoffOutlined sx={{ fontSize: 40 }} />,
      title: 'Plan Adventures',
      description: 'Create dream destinations, plan future travels, and collaborate with fellow travelers',
      color: '#45B7D1',
      gradient: 'linear-gradient(135deg, #45B7D1 0%, #96CEB4 100%)',
    },
    {
      icon: <ArticleOutlined sx={{ fontSize: 40 }} />,
      title: 'Travel Blog',
      description: 'Discover inspiring travel stories, tips, and guides from experienced travelers',
      color: '#9C27B0',
      gradient: 'linear-gradient(135deg, #9C27B0 0%, #E1BEE7 100%)',
    },
    {
      icon: <PeopleOutlined sx={{ fontSize: 40 }} />,
      title: 'Social Journeys',
      description: 'Connect with travelers, share experiences, and get inspired by others',
      color: '#FF9800',
      gradient: 'linear-gradient(135deg, #FF9800 0%, #FFE0B2 100%)',
    },
    {
      icon: <EmojiEventsOutlined sx={{ fontSize: 40 }} />,
      title: 'Achievement System',
      description: 'Earn badges, complete challenges, and gamify your travel experiences',
      color: '#4CAF50',
      gradient: 'linear-gradient(135deg, #4CAF50 0%, #C8E6C9 100%)',
    },
  ];

  const stats = [
    { number: '15K+', label: 'Memories Captured', icon: <CameraAltOutlined /> },
    { number: '1K+', label: 'Active Travelers', icon: <ExploreOutlined /> },
    { number: '500+', label: 'Blog Stories', icon: <ArticleOutlined /> },
    { number: '98%', label: 'User Satisfaction', icon: <FavoriteOutlined /> },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      avatar: '🌸',
      location: 'San Francisco, CA',
      text: 'Fojourn helped me organize 2 years of travel memories across the West Coast. The map feature and blog sharing are incredible!',
      rating: 5,
    },
    {
      name: 'Marcus Rodriguez',
      avatar: '🏔️',
      location: 'Denver, CO',
      text: 'Planning my next adventure has never been easier. Love the collaboration features and reading travel stories from the community.',
      rating: 5,
    },
    {
      name: 'Emma Thompson',
      avatar: '🏖️',
      location: 'Miami, FL',
      text: 'Beautiful interface and so intuitive. The achievement system keeps me motivated to explore more destinations!',
      rating: 5,
    },
  ];

  const currentHeroImage = heroImages[currentHeroIndex];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: heroImages.length > 0 && currentHeroImage
          ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${currentHeroImage.image_url})`
          : 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 1s ease-in-out',
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
              <Box
                component="img"
                src="/fojourn-logo.png"
                alt="Fojourn"
                sx={{
                  height: { xs: '80px', md: '120px', lg: '150px' },
                  width: 'auto',
                  mb: 2,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  animation: `${pulse} 2s ease-in-out infinite`,
                }}
              />
              
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
                {currentHeroImage?.title || 'Your Digital Travel Companion'}
              </Typography>
              
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  mb: 4,
                  maxWidth: '700px',
                  mx: 'auto',
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  lineHeight: 1.6,
                }}
              >
                {currentHeroImage?.subtitle || 'Capture memories, explore with interactive maps, share your stories, and connect with fellow travelers in the ultimate digital travel companion'}
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
                onClick={() => navigate('/blog')}
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
                startIcon={<ArticleOutlined />}
              >
                Explore Blog
              </Button>
              
              <Button
                variant="text"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.1)',
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

      {/* Blog Highlight Section */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ mb: 6 }}>
            <Typography
              variant="h3"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: 'white',
                fontSize: { xs: '2rem', md: '3rem' },
              }}
            >
              Discover Travel Stories
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
              Get inspired by travel stories, destination guides, and tips from our community of adventurous travelers
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 4,
              mb: 6,
            }}
          >
            <Card
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
              }}
            >
              <ArticleOutlined sx={{ fontSize: 50, mb: 2, color: '#FFE66D' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Travel Guides
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                In-depth destination guides and travel tips from experienced explorers
              </Typography>
            </Card>

            <Card
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
              }}
            >
              <ShareOutlined sx={{ fontSize: 50, mb: 2, color: '#4ECDC4' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Personal Stories
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Real adventures and experiences shared by fellow travelers
              </Typography>
            </Card>

            <Card
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
              }}
            >
              <ExploreOutlined sx={{ fontSize: 50, mb: 2, color: '#FF6B6B' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Hidden Gems
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Discover off-the-beaten-path destinations and local secrets
              </Typography>
            </Card>
          </Box>

          <Box textAlign="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/blog')}
              sx={{
                background: 'linear-gradient(45deg, #FF6B6B, #FFE66D)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FF5252, #FFD54F)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(255,107,107,0.3)',
                },
              }}
              endIcon={<ArrowForwardOutlined />}
            >
              Explore Travel Blog
            </Button>
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
                Join thousands of travelers who trust Fojourn to capture memories, 
                share stories, and discover amazing destinations
              </Typography>
              
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                justifyContent="center"
                sx={{ mb: 3 }}
              >
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
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/blog')}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    px: 4,
                    py: 2,
                    borderRadius: 3,
                    textTransform: 'none',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)',
                      borderColor: 'white',
                      transform: 'translateY(-2px)',
                    },
                  }}
                  startIcon={<ArticleOutlined />}
                >
                  Read Travel Stories
                </Button>
              </Stack>
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
