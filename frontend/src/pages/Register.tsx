import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Link,
  Fade,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={backgroundStyles.primary}>
      <Container component="main" maxWidth="sm" sx={componentStyles.pageContainer}>
        <Fade in timeout={1000}>
          <Paper elevation={0} sx={componentStyles.formCard}>
            <Typography component="h1" variant="h3" sx={componentStyles.brandTitle}>
              Fojourn
            </Typography>
            <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
              Start your journey today
            </Typography>

            {error && (
              <Fade in timeout={500}>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                autoFocus
                variant="outlined"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                variant="outlined"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  margin="normal"
                  fullWidth
                  name="firstName"
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                  variant="outlined"
                />
                <TextField
                  margin="normal"
                  fullWidth
                  name="lastName"
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                  variant="outlined"
                />
              </Box>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                variant="outlined"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                variant="outlined"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 3,
                  py: 1.5,
                  fontSize: '1.1rem',
                }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
              
              <Box textAlign="center">
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Already have an account?
                </Typography>
                <Link 
                  component={RouterLink} 
                  to="/login" 
                  variant="body1"
                  sx={{
                    color: 'secondary.main',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Sign in to Fojourn
                </Link>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Register;
