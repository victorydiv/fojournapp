import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Card,
  CardContent,
  Autocomplete,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';

interface BadgeCriteria {
  type: string;
  value?: number | string;
  tag?: string;
  count?: number;
  states?: number;
  action?: string;
  location_type?: string;
  location_name?: string;
  visit_count?: number;
}

interface OptionConfig {
  label: string;
  options?: { value: string; label: string }[];
  type?: string;
  suggestions?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface BadgeCreatorProps {
  value: {
    criteria_type: string;
    criteria_value: number;
    logic_json: string;
  };
  onChange: (value: {
    criteria_type: string;
    criteria_value: number;
    logic_json: string;
  }) => void;
  error?: string;
}

const CRITERIA_TYPES: Record<string, {
  label: string;
  description: string;
  icon: string;
  options: Record<string, OptionConfig>;
}> = {
  count: {
    label: 'Count-based',
    description: 'Award when user reaches a specific count',
    icon: '🔢',
    options: {
      type: {
        label: 'Memory Type',
        options: [
          { value: 'restaurant', label: 'Restaurant visits' },
          { value: 'brewery', label: 'Brewery visits' },
          { value: 'attraction', label: 'Attraction visits' },
          { value: 'activity', label: 'Activity experiences' },
          { value: 'accommodation', label: 'Accommodation stays' },
          { value: 'other', label: 'Other memories' }
        ]
      },
      count: {
        label: 'Required Count',
        min: 1,
        max: 100,
        step: 1
      }
    }
  },
  first_time: {
    label: 'First Time',
    description: 'Award when user does something for the first time',
    icon: '🌟',
    options: {
      action: {
        label: 'Action',
        options: [
          { value: 'memory_created', label: 'Create first memory' },
          { value: 'journey_created', label: 'Create first journey' },
          { value: 'dream_created', label: 'Create first dream' },
          { value: 'photo_uploaded', label: 'Upload first photo' },
          { value: 'video_uploaded', label: 'Upload first video' }
        ]
      }
    }
  },
  tag: {
    label: 'Tag-based',
    description: 'Award when user uses a specific tag',
    icon: '🏷️',
    options: {
      tag: {
        label: 'Tag Name',
        type: 'text',
        suggestions: ['dog', 'beer', 'family', 'solo', 'romantic', 'adventure', 'food', 'nature']
      }
    }
  },
  state_count: {
    label: 'State Count',
    description: 'Award when user visits a certain number of states',
    icon: '🗺️',
    options: {
      states: {
        label: 'Number of States',
        min: 1,
        max: 50,
        step: 1
      }
    }
  },
  location: {
    label: 'Location Based',
    description: 'Award when user visits a specific city or state',
    icon: '📍',
    options: {
      location_type: {
        label: 'Location Type',
        options: [
          { value: 'city', label: 'Specific City' },
          { value: 'state', label: 'Specific State' },
          { value: 'country', label: 'Specific Country' }
        ]
      },
      location_name: {
        label: 'Location Name',
        type: 'text',
        suggestions: [
          'New York City', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas',
          'California', 'Texas', 'Florida', 'New York', 'Nevada',
          'Paris', 'London', 'Tokyo', 'Rome', 'Barcelona'
        ]
      },
      visit_count: {
        label: 'Required Visits',
        min: 1,
        max: 10,
        step: 1
      }
    }
  },
  completion: {
    label: 'Completion',
    description: 'Award when user completes a specific task',
    icon: '✅',
    options: {
      action: {
        label: 'Completion Type',
        options: [
          { value: 'complete_journey_plan', label: 'Plan every day of a journey' }
        ]
      }
    }
  }
};

const BadgeCreator: React.FC<BadgeCreatorProps> = ({ value, onChange, error }) => {
  const [criteria, setCriteria] = useState<BadgeCriteria>(() => {
    // Parse existing logic_json or create default
    if (value.logic_json && value.logic_json.trim()) {
      try {
        return JSON.parse(value.logic_json);
      } catch (e) {
        console.warn('Failed to parse existing logic_json:', e);
      }
    }
    return { type: '', count: 1 };
  });

  const [previewExpanded, setPreviewExpanded] = useState(false);

  const updateCriteria = (newCriteria: Partial<BadgeCriteria>) => {
    const updatedCriteria = { ...criteria, ...newCriteria };
    setCriteria(updatedCriteria);
    
    // Generate logic_json and update parent
    const logicJson = generateLogicJson(updatedCriteria);
    onChange({
      criteria_type: value.criteria_type,
      criteria_value: updatedCriteria.count || value.criteria_value,
      logic_json: logicJson
    });
  };

  const generateLogicJson = (criteriaObj: BadgeCriteria): string => {
    if (!value.criteria_type) return '';
    
    const logic: any = {};
    
    switch (value.criteria_type) {
      case 'count':
        if (criteriaObj.type && criteriaObj.count) {
          logic.type = criteriaObj.type;
          logic.count = criteriaObj.count;
        }
        break;
      case 'first_time':
        if (criteriaObj.action) {
          logic.action = criteriaObj.action;
        }
        break;
      case 'tag':
        if (criteriaObj.tag) {
          logic.tag = criteriaObj.tag;
        }
        break;
      case 'state_count':
        if (criteriaObj.states) {
          logic.states = criteriaObj.states;
        }
        break;
      case 'location':
        if (criteriaObj.location_type && criteriaObj.location_name) {
          logic.location_type = criteriaObj.location_type;
          logic.location_name = criteriaObj.location_name;
          logic.visit_count = criteriaObj.visit_count || 1;
        }
        break;
      case 'completion':
        if (criteriaObj.action) {
          logic.action = criteriaObj.action;
        }
        break;
    }
    
    return Object.keys(logic).length > 0 ? JSON.stringify(logic) : '';
  };

  const handleCriteriaTypeChange = (newType: string) => {
    onChange({
      criteria_type: newType,
      criteria_value: 1,
      logic_json: ''
    });
    setCriteria({ type: '', count: 1 });
  };

  const renderCriteriaBuilder = () => {
    if (!value.criteria_type || !CRITERIA_TYPES[value.criteria_type as keyof typeof CRITERIA_TYPES]) {
      return null;
    }

    const typeConfig = CRITERIA_TYPES[value.criteria_type as keyof typeof CRITERIA_TYPES];

    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              {typeConfig.icon} {typeConfig.label} Configuration
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {typeConfig.description}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(typeConfig.options).map(([optionKey, optionConfig]) => (
              <Box key={optionKey}>
                {optionConfig.options ? (
                  // Dropdown select
                  <FormControl fullWidth>
                    <InputLabel>{optionConfig.label}</InputLabel>
                    <Select
                      value={criteria[optionKey as keyof BadgeCriteria] || ''}
                      label={optionConfig.label}
                      onChange={(e) => updateCriteria({ [optionKey]: e.target.value })}
                    >
                      {optionConfig.options.map((option: { value: string; label: string }) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : optionConfig.type === 'text' ? (
                  // Text input with suggestions
                  <Autocomplete
                    freeSolo
                    options={optionConfig.suggestions || []}
                    value={criteria[optionKey as keyof BadgeCriteria] as string || ''}
                    onChange={(event, newValue) => {
                      updateCriteria({ [optionKey]: newValue || '' });
                    }}
                    onInputChange={(event, newValue) => {
                      updateCriteria({ [optionKey]: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={optionConfig.label}
                        fullWidth
                        helperText={optionConfig.suggestions ? 
                          `Suggestions: ${optionConfig.suggestions.join(', ')}` : undefined}
                      />
                    )}
                  />
                ) : optionConfig.min !== undefined && optionConfig.max !== undefined ? (
                  // Number slider
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      {optionConfig.label}: {criteria[optionKey as keyof BadgeCriteria] || optionConfig.min}
                    </Typography>
                    <Slider
                      value={criteria[optionKey as keyof BadgeCriteria] as number || optionConfig.min}
                      onChange={(event, newValue) => {
                        updateCriteria({ [optionKey]: newValue as number });
                      }}
                      min={optionConfig.min}
                      max={optionConfig.max}
                      step={optionConfig.step || 1}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: optionConfig.min, label: optionConfig.min.toString() },
                        { value: optionConfig.max, label: optionConfig.max.toString() }
                      ]}
                    />
                  </Box>
                ) : null}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderPreview = () => {
    const logicJson = generateLogicJson(criteria);
    if (!logicJson) return null;

    let previewText = '';
    try {
      const parsed = JSON.parse(logicJson);
      switch (value.criteria_type) {
        case 'count':
          previewText = `Award when user creates ${parsed.count} ${parsed.type} memories`;
          break;
        case 'first_time':
          previewText = `Award when user performs "${parsed.action}" for the first time`;
          break;
        case 'tag':
          previewText = `Award when user uses the "${parsed.tag}" tag for the first time`;
          break;
        case 'state_count':
          previewText = `Award when user visits ${parsed.states} different states`;
          break;
        case 'location':
          previewText = `Award when user visits "${parsed.location_name}" (${parsed.location_type}) ${parsed.visit_count} time${parsed.visit_count > 1 ? 's' : ''}`;
          break;
        case 'completion':
          previewText = `Award when user completes: ${parsed.action.replace(/_/g, ' ')}`;
          break;
      }
    } catch (e) {
      previewText = 'Invalid criteria configuration';
    }

    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Badge Logic Preview:
        </Typography>
        <Typography variant="body2">{previewText}</Typography>
        
        <Accordion 
          expanded={previewExpanded} 
          onChange={(e, expanded) => setPreviewExpanded(expanded)}
          sx={{ mt: 1, boxShadow: 'none' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption">Technical Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" component="pre" sx={{ 
              fontFamily: 'monospace', 
              bgcolor: 'grey.100', 
              p: 1, 
              borderRadius: 1,
              overflow: 'auto'
            }}>
              {JSON.stringify(JSON.parse(logicJson), null, 2)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Alert>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        🎖️ Badge Criteria Builder
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure when this badge should be awarded using visual tools instead of JSON.
      </Typography>

      {/* Criteria Type Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Criteria Type</InputLabel>
        <Select
          value={value.criteria_type}
          label="Criteria Type"
          onChange={(e) => handleCriteriaTypeChange(e.target.value)}
        >
          {Object.entries(CRITERIA_TYPES).map(([key, config]) => (
            <MenuItem key={key} value={key}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{config.icon}</span>
                <Box>
                  <Typography variant="body1">{config.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {config.description}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Dynamic Criteria Builder */}
      {renderCriteriaBuilder()}

      {/* Preview */}
      {renderPreview()}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Advanced Mode Toggle */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">⚙️ Advanced: Raw JSON Editor</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Advanced users can edit the raw JSON directly. Changes here will override the visual builder above.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="Raw Logic JSON"
            multiline
            rows={4}
            value={value.logic_json}
            onChange={(e) => {
              onChange({
                ...value,
                logic_json: e.target.value
              });
            }}
            helperText="Direct JSON editing - use with caution"
            sx={{ fontFamily: 'monospace' }}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default BadgeCreator;
