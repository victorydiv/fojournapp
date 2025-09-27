import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Fade
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { backgroundStyles } from '../theme/fojournTheme';
import Footer from '../components/Footer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

interface StaticPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  updated_at: string;
}

const StaticPageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/static-pages/public/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Page not found');
          } else {
            throw new Error('Failed to fetch page');
          }
          return;
        }

        const data = await response.json();
        setPage(data.page);
      } catch (err) {
        console.error('Error fetching static page:', err);
        setError('Failed to load page. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
        <Footer />
      </Box>
    );
  }

  if (error || !page) {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Helmet>
          <title>Page Not Found | Fojourn</title>
        </Helmet>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ maxWidth: 400, mx: 'auto' }}>
            {error || 'Page not found'}
          </Alert>
        </Container>
        <Footer />
      </Box>
    );
  }

  return (
    <Box sx={backgroundStyles.secondary}>
      <Helmet>
        <title>{page.meta_title || `${page.title} | Fojourn`}</title>
        <meta name="description" content={page.meta_description || `${page.title} - Fojourn`} />
        <meta property="og:title" content={page.meta_title || `${page.title} | Fojourn`} />
        <meta property="og:description" content={page.meta_description || `${page.title} - Fojourn`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/${page.slug}`} />
        <link rel="canonical" href={`${window.location.origin}/${page.slug}`} />
      </Helmet>

      <Fade in timeout={800}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Header Section */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom 
              sx={{ fontWeight: 700 }}
            >
              {page.title}
            </Typography>
            
            <Chip
              label={`Last updated: ${formatDate(page.updated_at)}`}
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                '& .MuiChip-label': {
                  fontSize: '0.875rem'
                }
              }}
            />
          </Box>

          {/* Content Section */}
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: { xs: 3, md: 6 },
              boxShadow: '0 10px 30px rgba(21, 26, 56, 0.1)',
              '& h1': {
                color: '#151a38',
                fontSize: { xs: '1.75rem', md: '2.125rem' },
                fontWeight: 'bold',
                marginBottom: 2,
                marginTop: 3,
              },
              '& h2': {
                color: '#151a38',
                fontSize: { xs: '1.5rem', md: '1.875rem' },
                fontWeight: 'bold',
                marginBottom: 2,
                marginTop: 3,
              },
              '& h3': {
                color: '#21a7a0',
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 'bold',
                marginBottom: 1.5,
                marginTop: 2,
              },
              '& p': {
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.7,
                marginBottom: 2,
                color: '#333',
              },
              '& ul, & ol': {
                paddingLeft: 2,
                marginBottom: 2,
              },
              '& li': {
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.6,
                marginBottom: 0.5,
                color: '#333',
              },
              '& strong': {
                color: '#151a38',
                fontWeight: 'bold',
              },
              '& a': {
                color: '#21a7a0',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                }
              },
              '& blockquote': {
                borderLeft: '4px solid #21a7a0',
                paddingLeft: 2,
                marginLeft: 0,
                marginY: 2,
                fontStyle: 'italic',
                color: '#666',
              },
              '& > *:first-child': {
                marginTop: '0 !important',
              }
            }}
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </Container>
      </Fade>

      <Footer />
    </Box>
  );
};

export default StaticPageView;