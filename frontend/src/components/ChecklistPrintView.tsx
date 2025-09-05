import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  CheckBox as CheckBoxIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

interface ChecklistItem {
  id: number;
  text: string;
  description?: string;
  is_completed: boolean;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
  sort_order: number;
}

interface Checklist {
  id: number;
  title: string;
  description?: string;
  category: string;
  is_template: boolean;
  is_public: boolean;
  color: string;
  created_at: string;
  updated_at: string;
  items: ChecklistItem[];
}

const ChecklistPrintView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchChecklist();
    }
  }, [id]);

  useEffect(() => {
    // Trigger print dialog when component mounts
    if (checklist) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [checklist]);

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/checklists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklist(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching checklist:', err);
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !checklist) {
    return <Alert severity="error">{error || 'Checklist not found'}</Alert>;
  }

  const completedCount = checklist.items.filter(item => item.is_completed).length;
  const totalCount = checklist.items.length;

  return (
    <Box sx={{ 
      p: 3, 
      maxWidth: '210mm', 
      margin: '0 auto',
      backgroundColor: 'white',
      color: 'black',
      '@media print': {
        p: 2,
        boxShadow: 'none'
      }
    }}>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body { margin: 0; }
            @page { margin: 1in; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Header */}
      <Box mb={3}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          {checklist.title}
        </Typography>
        
        {checklist.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {checklist.description}
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" gap={2}>
            <Chip 
              label={checklist.category.charAt(0).toUpperCase() + checklist.category.slice(1)}
              sx={{ 
                backgroundColor: checklist.color,
                color: 'white',
                '@media print': { 
                  backgroundColor: 'transparent !important',
                  color: 'black !important',
                  border: '1px solid black'
                }
              }}
            />
            
            {checklist.is_public === true && (
              <Chip label="Public" variant="outlined" />
            )}
            
            {checklist.is_template === true && (
              <Chip label="Template" variant="outlined" />
            )}
          </Box>

          <Typography variant="body2">
            Progress: {completedCount}/{totalCount} items ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Created: {new Date(checklist.created_at).toLocaleDateString()} | 
          Last Updated: {new Date(checklist.updated_at).toLocaleDateString()}
        </Typography>

        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Items List */}
      <List sx={{ 
        p: 0,
        '@media print': {
          '& .MuiListItem-root': {
            pageBreakInside: 'avoid'
          }
        }
      }}>
        {checklist.items.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No items in this checklist
            </Typography>
          </Box>
        ) : (
          checklist.items
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem
                  sx={{
                    py: 1.5,
                    pl: 0,
                    alignItems: 'flex-start',
                    '@media print': {
                      borderBottom: '1px solid #ddd'
                    }
                  }}
                >
                  <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                    {item.is_completed ? (
                      <CheckBoxIcon sx={{ 
                        fontSize: 20,
                        '@media print': { color: 'black !important' }
                      }} />
                    ) : (
                      <CheckBoxOutlineBlankIcon sx={{ 
                        fontSize: 20,
                        '@media print': { color: 'black !important' }
                      }} />
                    )}
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box>
                        <Typography
                          variant="body1"
                          sx={{
                            textDecoration: item.is_completed ? 'line-through' : 'none',
                            fontWeight: item.is_completed ? 'normal' : 'medium',
                            mb: 0.5
                          }}
                        >
                          {index + 1}. {item.text}
                        </Typography>
                        
                        <Box display="flex" gap={1} flexWrap="wrap" mb={item.description || item.notes ? 1 : 0}>
                          <Chip
                            label={item.priority.toUpperCase()}
                            size="small"
                            sx={{
                              backgroundColor: 
                                item.priority === 'high' ? '#f44336' :
                                item.priority === 'medium' ? '#ff9800' : '#4caf50',
                              color: 'white',
                              fontSize: '0.75rem',
                              '@media print': {
                                backgroundColor: 'transparent !important',
                                color: 'black !important',
                                border: '1px solid black'
                              }
                            }}
                          />
                          
                          {item.category && (
                            <Chip
                              label={item.category}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                          
                          {item.due_date && (
                            <Chip
                              icon={<ScheduleIcon sx={{ fontSize: '0.75rem !important' }} />}
                              label={`Due: ${new Date(item.due_date).toLocaleDateString()}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      (item.description || item.notes) && (
                        <Box>
                          {item.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {item.description}
                            </Typography>
                          )}
                          {item.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              Notes: {item.notes}
                            </Typography>
                          )}
                        </Box>
                      )
                    }
                  />
                </ListItem>
                
                {index < checklist.items.length - 1 && (
                  <Divider variant="inset" component="li" sx={{ ml: 5 }} />
                )}
              </React.Fragment>
            ))
        )}
      </List>

      {/* Footer */}
      <Box mt={4} pt={2} borderTop="1px solid #ddd">
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Generated from Fojourn • {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </Typography>
      </Box>

      {/* Print Instructions */}
      <Box className="no-print" mt={3} p={2} bgcolor="grey.100" borderRadius={1}>
        <Typography variant="body2" align="center">
          This page is optimized for printing. Your browser's print dialog should open automatically.
          If not, use Ctrl+P (Windows) or Cmd+P (Mac) to print.
        </Typography>
      </Box>
    </Box>
  );
};

export default ChecklistPrintView;
