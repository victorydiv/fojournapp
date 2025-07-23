import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getYear, getMonth } from 'date-fns';
import { entriesAPI } from '../services/api';

interface CalendarDay {
  date: Date;
  hasEntries: boolean;
  entryCount: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(getYear(currentDate));
  const [selectedMonth, setSelectedMonth] = useState(getMonth(currentDate));
  
  // Create the date for the selected month/year
  const displayDate = new Date(selectedYear, selectedMonth, 1);
  
  // Fetch entries for the selected month
  const { data: entriesData, isLoading, error } = useQuery({
    queryKey: ['entries', selectedYear, selectedMonth],
    queryFn: async () => {
      const startDate = format(startOfMonth(displayDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(displayDate), 'yyyy-MM-dd');
      return entriesAPI.getEntries({ startDate, endDate });
    },
  });

  // Generate years for the year selector (current year ± 10 years)
  const years = Array.from({ length: 21 }, (_, i) => getYear(currentDate) - 10 + i);
  
  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate calendar days
  const generateCalendarDays = (): CalendarDay[] => {
    const start = startOfMonth(displayDate);
    const end = endOfMonth(displayDate);
    
    // Get all days of the month
    const monthDays = eachDayOfInterval({ start, end });
    
    // Add previous month days to fill the first week
    const startDay = start.getDay(); // 0 = Sunday
    const prevMonthDays: Date[] = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = new Date(start);
      prevDay.setDate(start.getDate() - (i + 1));
      prevMonthDays.push(prevDay);
    }
    
    // Add next month days to fill the last week
    const endDay = end.getDay(); // 0 = Sunday
    const nextMonthDays: Date[] = [];
    for (let i = 1; i <= (6 - endDay); i++) {
      const nextDay = new Date(end);
      nextDay.setDate(end.getDate() + i);
      nextMonthDays.push(nextDay);
    }
    
    // Combine all days
    const allDays = [...prevMonthDays, ...monthDays, ...nextMonthDays];
    
    // Map days with entry information
    return allDays.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      const dayEntries = entriesData?.data?.entries?.filter(entry => 
        format(new Date(entry.entryDate), 'yyyy-MM-dd') === dateString
      ) || [];
      
      return {
        date,
        hasEntries: dayEntries.length > 0,
        entryCount: dayEntries.length,
        isCurrentMonth: isSameMonth(date, displayDate),
        isToday: isToday(date)
      };
    });
  };

  const calendarDays = generateCalendarDays();

  const handleDayClick = (day: CalendarDay) => {
    const dateString = format(day.date, 'yyyy-MM-dd');
    navigate(`/dashboard?date=${dateString}`);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    setSelectedYear(getYear(currentDate));
    setSelectedMonth(getMonth(currentDate));
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load calendar data. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Travel Calendar
        </Typography>
        <IconButton onClick={handleToday} color="primary">
          <TodayIcon />
        </IconButton>
      </Box>

      {/* Month/Year Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <IconButton onClick={handlePrevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          
          <Box display="flex" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {months.map((month, index) => (
                  <MenuItem key={index} value={index}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map(year => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <IconButton onClick={handleNextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Typography variant="h5" textAlign="center">
          {format(displayDate, 'MMMM yyyy')}
        </Typography>
      </Paper>

      {/* Calendar Grid */}
      <Paper sx={{ p: 2 }}>
        {/* Day Headers */}
        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1} sx={{ mb: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box key={day}>
              <Typography 
                variant="subtitle2" 
                textAlign="center" 
                sx={{ fontWeight: 'bold', color: 'text.secondary' }}
              >
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calendar Days */}
        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1}>
          {calendarDays.map((day, index) => (
            <Box key={index}>
              <Card
                sx={{
                  minHeight: 80,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: day.isCurrentMonth ? 1 : 0.5,
                  bgcolor: day.isToday ? 'primary.light' : 'background.paper',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  }
                }}
                onClick={() => handleDayClick(day)}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: day.isToday ? 'bold' : 'normal',
                        color: day.isToday ? 'primary.contrastText' : 'text.primary'
                      }}
                    >
                      {format(day.date, 'd')}
                    </Typography>
                    
                    {day.hasEntries && (
                      <Chip
                        size="small"
                        label={day.entryCount}
                        color="secondary"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.6rem',
                          '& .MuiChip-label': { px: 0.5 }
                        }}
                      />
                    )}
                  </Box>
                  
                  {day.hasEntries && (
                    <Box mt={1}>
                      <Box
                        sx={{
                          width: '100%',
                          height: 4,
                          bgcolor: 'secondary.main',
                          borderRadius: 1
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Legend */}
      <Box mt={2} display="flex" justifyContent="center" gap={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: 'primary.light',
              borderRadius: 1
            }}
          />
          <Typography variant="caption">Today</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 16,
              height: 4,
              bgcolor: 'secondary.main',
              borderRadius: 1
            }}
          />
          <Typography variant="caption">Has Entries</Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Calendar;
