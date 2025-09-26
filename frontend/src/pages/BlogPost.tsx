import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Chip,
  Avatar,
  Button,
  Card,
  CardMedia,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import BlogSocialShare from '../components/BlogSocialShare';
import Footer from '../components/Footer';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  hero_image_url: string | null;
  published_at: string;
  reading_time: number;
  view_count: number;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[] | null;
  author_display_name: string;
  author_avatar: string | null;
  categories: string[];
  category_slugs: string[];
  category_colors: string[];
  related_posts: Array<{
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    hero_image_url: string | null;
    published_at: string;
    reading_time: number;
  }>;
}

interface BlogPostResponse {
  post: BlogPost;
}

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const fetchPost = async (postSlug: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/public/${postSlug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Blog post not found');
        }
        throw new Error('Failed to fetch blog post');
      }
      
      const data: BlogPostResponse = await response.json();
      setPost(data.post);
      
    } catch (error) {
      console.error('Error fetching post:', error);
      setError(error instanceof Error ? error.message : 'Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={40} />
      </Container>
    );
  }

  if (error || !post) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error || 'Blog post not found'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/blog')}>
          Back to Blog
        </Button>
      </Container>
    );
  }

  const pageTitle = post.seo_title || post.title;
  const pageDescription = post.seo_description || post.excerpt;

  return (
    <>
      <Helmet>
        <title>{pageTitle} | Fojourn Travel Blog</title>
        <meta name="description" content={pageDescription} />
        {post.tags && <meta name="keywords" content={post.tags.join(', ')} />}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        {post.hero_image_url && <meta property="og:image" content={`${window.location.origin}${post.hero_image_url}`} />}
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:author" content={post.author_display_name} />
        {post.categories.map((category) => (
          <meta key={category} property="article:tag" content={category} />
        ))}
        <link rel="canonical" href={window.location.href} />
        
        {/* JSON-LD structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "image": post.hero_image_url ? `${window.location.origin}${post.hero_image_url}` : undefined,
            "author": {
              "@type": "Person",
              "name": post.author_display_name
            },
            "publisher": {
              "@type": "Organization",
              "name": "Fojourn",
              "logo": {
                "@type": "ImageObject",
                "url": `${window.location.origin}/logo192.png`
              }
            },
            "datePublished": post.published_at,
            "dateModified": post.published_at,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": window.location.href
            }
          })}
        </script>
      </Helmet>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Back Button */}
        <IconButton 
          onClick={() => navigate('/blog')}
          sx={{ mb: 3, color: 'primary.main' }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          {/* Categories */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {post.categories.map((category, index) => (
              <Chip
                key={category}
                label={category}
                sx={{
                  backgroundColor: post.category_colors[index] || '#1976d2',
                  color: 'white',
                  fontWeight: 'medium'
                }}
                onClick={() => navigate(`/blog?category=${post.category_slugs[index]}`)}
              />
            ))}
          </Box>

          {/* Title */}
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
            {post.title}
          </Typography>

          {/* Meta Information */}
          <Stack direction="row" spacing={3} alignItems="center" sx={{ color: 'text.secondary', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar 
                src={post.author_avatar || undefined} 
                alt={post.author_display_name}
                sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              >
                {!post.author_avatar && post.author_display_name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon fontSize="small" />
                <Typography variant="body2">{post.author_display_name}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon fontSize="small" />
              <Typography variant="body2">{formatDate(post.published_at)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon fontSize="small" />
              <Typography variant="body2">{post.reading_time} min read</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ViewIcon fontSize="small" />
              <Typography variant="body2">{post.view_count} views</Typography>
            </Box>
          </Stack>

          {/* Share Button */}
          <Box sx={{ mb: 3 }}>
            <BlogSocialShare post={post} />
          </Box>
        </Box>

        {/* Hero Image */}
        {post.hero_image_url && (
          <Box sx={{ mb: 4 }}>
            <img
              src={post.hero_image_url}
              alt={post.title}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '400px',
                objectFit: 'cover',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
          </Box>
        )}

        {/* Content */}
        <Box sx={{ mb: 6 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3, 
              fontStyle: 'italic', 
              color: 'text.secondary',
              fontSize: '1.1rem',
              lineHeight: 1.6
            }}
          >
            {post.excerpt}
          </Typography>
          
          <Typography 
            component="div"
            sx={{ 
              fontSize: '1.1rem',
              lineHeight: 1.8,
              textAlign: 'left',
              '& p': { mb: 2, textAlign: 'left' },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                mt: 3,
                mb: 2,
                fontWeight: 'bold',
                textAlign: 'left'
              },
              '& ul, & ol': {
                pl: 3,
                mb: 2,
                textAlign: 'left'
              },
              '& li': {
                textAlign: 'left'
              },
              '& blockquote': {
                borderLeft: '4px solid #1976d2',
                pl: 2,
                py: 1,
                my: 2,
                backgroundColor: 'rgba(25, 118, 210, 0.05)',
                fontStyle: 'italic',
                textAlign: 'left'
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                my: 2
              },
              '& div': {
                textAlign: 'left'
              }
            }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Call to Action */}
        <Box sx={{ textAlign: 'center', py: 4, backgroundColor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Ready to Start Your Own Travel Journey?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Join thousands of travelers documenting their adventures with Fojourn
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/login')}
            >
              Start Logging Your Trips
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/blog')}
            >
              Read More Stories
            </Button>
          </Stack>
        </Box>

        {/* Related Posts */}
        {post.related_posts && post.related_posts.length > 0 && (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Related Stories
            </Typography>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)'
              },
              gap: 3
            }}>
              {post.related_posts.map((relatedPost) => (
                <Card
                  key={relatedPost.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3
                    }
                  }}
                  onClick={() => navigate(`/blog/${relatedPost.slug}`)}
                >
                  {relatedPost.hero_image_url && (
                    <CardMedia
                      component="img"
                      height="120"
                      image={relatedPost.hero_image_url}
                      alt={relatedPost.title}
                    />
                  )}
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: '1rem' }}>
                      {relatedPost.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {relatedPost.excerpt}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {relatedPost.reading_time} min read
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Container>

      <Footer />
    </>
  );
};

export default BlogPost;
