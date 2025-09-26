import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  Chip,
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  CircularProgress,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  Login as LoginIcon,
  PersonAdd as SignUpIcon
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import Footer from '../components/Footer';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  hero_image_url: string | null;
  published_at: string;
  reading_time: number;
  view_count: number;
  featured: boolean;
  author_display_name: string;
  categories: string[];
  category_slugs: string[];
  category_colors: string[];
}

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  post_count: number;
}

interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [showFeatured, setShowFeatured] = useState(searchParams.get('featured') === 'true');
  
  // Auth dialog
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch posts when filters change
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    fetchPosts(page);
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPosts = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (showFeatured) params.append('featured', 'true');
      
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/public?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      
      const data: BlogResponse = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load blog posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    if (showFeatured) params.set('featured', 'true');
    params.set('page', '1');
    
    setSearchParams(params);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFeaturedPosts = () => posts.filter(post => post.featured).slice(0, 3);
  const getRegularPosts = () => posts.filter(post => !post.featured);

  return (
    <>
      <Helmet>
        <title>Travel Blog | Fojourn - Stories, Tips & Inspiration</title>
        <meta name="description" content="Discover amazing travel stories, destination guides, and insider tips from fellow travelers. Get inspired for your next adventure with Fojourn's travel blog." />
        <meta name="keywords" content="travel blog, travel stories, destination guides, travel tips, adventure, travel inspiration" />
        <meta property="og:title" content="Travel Blog | Fojourn - Stories, Tips & Inspiration" />
        <meta property="og:description" content="Discover amazing travel stories, destination guides, and insider tips from fellow travelers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${window.location.origin}/blog`} />
        <link rel="canonical" href={`${window.location.origin}/blog`} />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Travel Stories & Tips
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Discover amazing destinations, get insider tips, and find inspiration for your next adventure
          </Typography>
          
          {/* CTA Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/login')}
              sx={{ minWidth: 140 }}
            >
              Start Logging
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<SignUpIcon />}
              onClick={() => setAuthDialogOpen(true)}
              sx={{ minWidth: 140 }}
            >
              Join Community
            </Button>
          </Box>
        </Box>

        {/* Search & Filters */}
        <Box sx={{ mb: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFilterChange()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.slug}>
                    {category.name} ({category.post_count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleFilterChange}
              sx={{ minWidth: 120, height: 56 }}
            >
              Search
            </Button>
          </Stack>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Featured Posts */}
        {!loading && !error && getFeaturedPosts().length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
              Featured Stories
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              {getFeaturedPosts().map((post) => (
                <Card 
                  key={post.id}
                  sx={{ 
                    flex: 1,
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  {post.hero_image_url && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={post.hero_image_url}
                      alt={post.title}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {post.categories.map((category, index) => (
                        <Chip
                          key={category}
                          label={category}
                          size="small"
                          sx={{
                            backgroundColor: post.category_colors[index] || '#gray',
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {post.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {post.excerpt}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon fontSize="small" />
                        {post.author_display_name}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon fontSize="small" />
                        {formatDate(post.published_at)}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {/* Regular Posts */}
        {!loading && !error && getRegularPosts().length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
              Latest Posts
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
              {getRegularPosts().map((post) => (
                <Card 
                  key={post.id}
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3
                    }
                  }}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  {post.hero_image_url && (
                    <CardMedia
                      component="img"
                      height="160"
                      image={post.hero_image_url}
                      alt={post.title}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {post.categories.slice(0, 2).map((category, index) => (
                        <Chip
                          key={category}
                          label={category}
                          size="small"
                          sx={{
                            backgroundColor: post.category_colors[index] || '#gray',
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: '1.1rem' }}>
                      {post.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {post.excerpt}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon fontSize="small" />
                        {post.reading_time} min read
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ViewIcon fontSize="small" />
                        {post.view_count}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* Empty State */}
        {!loading && !error && posts.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              No posts found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your search criteria or check back later for new content.
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              size="large"
            />
          </Box>
        )}

        {/* Floating Action Button for logged out users */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => navigate('/login')}
        >
          <LoginIcon />
        </Fab>
      </Container>

      {/* Auth Dialog */}
      <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Join the Fojourn Community</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Ready to start documenting your own travel adventures? Join thousands of travelers sharing their stories.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            With Fojourn, you can:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>Create detailed travel memories with photos and notes</li>
            <li>Track your journeys on interactive maps</li>
            <li>Share experiences with fellow travelers</li>
            <li>Get personalized travel recommendations</li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuthDialogOpen(false)}>
            Maybe Later
          </Button>
          <Button variant="contained" onClick={() => {
            setAuthDialogOpen(false);
            navigate('/signup');
          }}>
            Sign Up Free
          </Button>
        </DialogActions>
      </Dialog>

      <Footer />
    </>
  );
};

export default Blog;
