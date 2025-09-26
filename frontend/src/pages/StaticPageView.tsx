import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Paper
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Container>
        <Footer />
      </Box>
    );
  }

  if (error || !page) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Helmet>
          <title>Page Not Found | Fojourn</title>
        </Helmet>
        <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
          <Alert severity="error" sx={{ maxWidth: 400 }}>
            {error || 'Page not found'}
          </Alert>
        </Container>
        <Footer />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa' }}>
      <Helmet>
        <title>{page.meta_title || `${page.title} | Fojourn`}</title>
        <meta name="description" content={page.meta_description || `${page.title} - Fojourn`} />
        <meta property="og:title" content={page.meta_title || `${page.title} | Fojourn`} />
        <meta property="og:description" content={page.meta_description || `${page.title} - Fojourn`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/${page.slug}`} />
        <link rel="canonical" href={`${window.location.origin}/${page.slug}`} />
      </Helmet>

      <Container maxWidth="lg" sx={{ flex: 1, py: { xs: 3, md: 6 } }}>
        <Paper 
          elevation={1} 
          sx={{ 
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: 'white'
          }}
        >
          <Box sx={{ 
            background: 'linear-gradient(135deg, #151a38 0%, #21a7a0 100%)',
            color: 'white',
            p: { xs: 3, md: 6 },
            textAlign: 'center'
          }}>
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: '2rem', md: '3rem' },
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {page.title}
            </Typography>
            
            <Chip
              label={`Last updated: ${formatDate(page.updated_at)}`}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '& .MuiChip-label': {
                  fontSize: '0.875rem'
                }
              }}
            />
          </Box>

          <CardContent sx={{ p: { xs: 3, md: 6 } }}>
            <Box
              sx={{
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
                '& .static-page-content': {
                  '& > h1:first-of-type': {
                    marginTop: 0,
                  }
                }
              }}
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </CardContent>
        </Paper>
      </Container>

      <Footer />
    </Box>
  );
};

export default StaticPageView;