import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Stack,
  Divider,
  Link,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { SOCIAL_MEDIA_LINKS, SocialMediaPlatform } from '../constants/socialMedia';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

interface StaticPage {
  id: number;
  slug: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
}

interface FooterProps {
  variant?: 'default' | 'minimal' | 'dark';
}

const Footer: React.FC<FooterProps> = ({ variant = 'default' }) => {
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);

  // Fetch static pages for footer
  useEffect(() => {
    const fetchStaticPages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/static-pages/public`);
        if (response.ok) {
          const data = await response.json();
          setStaticPages(data.pages || []);
        }
      } catch (error) {
        console.error('Failed to fetch static pages for footer:', error);
        // Graceful fallback - footer will render without static pages
      } finally {
        setPagesLoaded(true);
      }
    };

    fetchStaticPages();
  }, []);

  const handleSocialClick = (platform: SocialMediaPlatform) => {
    window.open(SOCIAL_MEDIA_LINKS[platform], '_blank', 'noopener,noreferrer');
  };

  const getFooterStyles = () => {
    switch (variant) {
      case 'minimal':
        return {
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        };
      case 'dark':
        return {
          py: 4,
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
        };
      default:
        return {
          py: 3,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        };
    }
  };

  const getTextColor = () => {
    return variant === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary';
  };

  return (
    <Box sx={getFooterStyles()}>
      <Container maxWidth="lg">
        {/* Static Pages Links (if available) */}
        {pagesLoaded && staticPages.length > 0 && (
          <>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 4, mb: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ 
                    color: variant === 'dark' ? 'white' : 'text.primary',
                    fontWeight: 'bold',
                    mb: 2
                  }}
                >
                  About Fojourn
                </Typography>
                <Stack spacing={1}>
                  {staticPages.slice(0, Math.ceil(staticPages.length / 2)).map((page) => (
                    <Link
                      key={page.id}
                      component={RouterLink}
                      to={`/${page.slug}`}
                      sx={{
                        color: getTextColor(),
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: variant === 'dark' ? 'white' : 'primary.main',
                          textDecoration: 'underline',
                        }
                      }}
                    >
                      {page.title}
                    </Link>
                  ))}
                </Stack>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  sx={{ 
                    color: variant === 'dark' ? 'white' : 'text.primary',
                    fontWeight: 'bold',
                    mb: 2
                  }}
                >
                  Legal
                </Typography>
                <Stack spacing={1}>
                  {staticPages.slice(Math.ceil(staticPages.length / 2)).map((page) => (
                    <Link
                      key={page.id}
                      component={RouterLink}
                      to={`/${page.slug}`}
                      sx={{
                        color: getTextColor(),
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        '&:hover': {
                          color: variant === 'dark' ? 'white' : 'primary.main',
                          textDecoration: 'underline',
                        }
                      }}
                    >
                      {page.title}
                    </Link>
                  ))}
                </Stack>
              </Box>
            </Box>
            <Divider sx={{ mb: 3, borderColor: variant === 'dark' ? 'rgba(255,255,255,0.1)' : 'divider' }} />
          </>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          {/* Copyright */}
          <Typography
            variant="body2"
            sx={{ 
              color: getTextColor(),
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            © 2025 Fojourn. Your memories, beautifully organized.
          </Typography>

          {/* Social Media Links */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="body2"
              sx={{ 
                color: getTextColor(),
                mr: 1,
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Follow us:
            </Typography>
            
            <IconButton
              onClick={() => handleSocialClick('facebook')}
              sx={{
                color: variant === 'dark' ? 'rgba(255,255,255,0.7)' : '#1877F2',
                '&:hover': {
                  color: '#1877F2',
                  backgroundColor: variant === 'dark' ? 'rgba(24, 119, 242, 0.1)' : 'rgba(24, 119, 242, 0.04)',
                },
              }}
              aria-label="Follow us on Facebook"
            >
              <FacebookIcon />
            </IconButton>
            
            <IconButton
              onClick={() => handleSocialClick('linkedin')}
              sx={{
                color: variant === 'dark' ? 'rgba(255,255,255,0.7)' : '#0077B5',
                '&:hover': {
                  color: '#0077B5',
                  backgroundColor: variant === 'dark' ? 'rgba(0, 119, 181, 0.1)' : 'rgba(0, 119, 181, 0.04)',
                },
              }}
              aria-label="Follow us on LinkedIn"
            >
              <LinkedInIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
