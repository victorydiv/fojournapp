import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Chip,
  Stack,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  AirplanemodeActive as FlightIcon,
  Security as SecurityIcon,
  LocalHospital as MedicalIcon,
  ContactPhone as EmergencyIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { travelInfoAPI } from '../services/api';

interface FrequentFlyerProgram {
  airline: string;
  membershipNumber: string;
  status?: string;
}

interface TravelInfo {
  frequent_flyer_programs: FrequentFlyerProgram[];
  known_traveler_number: string;
  global_entry_number: string;
  passport_number: string;
  passport_expiry: string;
  passport_country: string;
  tsa_precheck: boolean;
  clear_membership: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  medical_conditions: string;
  allergies: string;
  medications: string;
  notes: string;
}

interface TravelInformationProps {
  onSaveSuccess: (message: string) => void;
  onSaveError: (message: string) => void;
}

const TravelInformation: React.FC<TravelInformationProps> = ({ onSaveSuccess, onSaveError }) => {
  const [travelInfo, setTravelInfo] = useState<TravelInfo>({
    frequent_flyer_programs: [],
    known_traveler_number: '',
    global_entry_number: '',
    passport_number: '',
    passport_expiry: '',
    passport_country: '',
    tsa_precheck: false,
    clear_membership: false,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_conditions: '',
    allergies: '',
    medications: '',
    notes: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ffpDialogOpen, setFFPDialogOpen] = useState(false);
  const [newFFP, setNewFFP] = useState<FrequentFlyerProgram>({
    airline: '',
    membershipNumber: '',
    status: ''
  });

  useEffect(() => {
    loadTravelInfo();
  }, []);

  const loadTravelInfo = async () => {
    try {
      const response = await travelInfoAPI.getTravelInfo();
      setTravelInfo(response.data.travelInfo);
    } catch (error) {
      console.error('Error loading travel info:', error);
      onSaveError('Failed to load travel information');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await travelInfoAPI.saveTravelInfo(travelInfo);
      onSaveSuccess('Travel information saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving travel info:', error);
      onSaveError('Failed to save travel information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    loadTravelInfo(); // Reload original data
    setIsEditing(false);
  };

  const handleAddFFP = () => {
    if (newFFP.airline && newFFP.membershipNumber) {
      setTravelInfo(prev => ({
        ...prev,
        frequent_flyer_programs: [...prev.frequent_flyer_programs, newFFP]
      }));
      setNewFFP({ airline: '', membershipNumber: '', status: '' });
      setFFPDialogOpen(false);
    }
  };

  const handleRemoveFFP = (index: number) => {
    setTravelInfo(prev => ({
      ...prev,
      frequent_flyer_programs: prev.frequent_flyer_programs.filter((_, i) => i !== index)
    }));
  };

  const formatPassportExpiry = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" />
            <Typography variant="h6">
              Private Travel Information
            </Typography>
          </Box>
          {!isEditing ? (
            <Button
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              variant="outlined"
            >
              Edit
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<SaveIcon />}
                onClick={handleSave}
                variant="contained"
                disabled={isSaving}
              >
                Save
              </Button>
              <Button
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                variant="outlined"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          This information is private and only visible to you. It's stored securely to help you while traveling.
        </Alert>

        {/* Security Programs Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              <Typography variant="subtitle1">Security Programs</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  sx={{ flex: '1 1 300px' }}
                  label="Known Traveler Number (KTN)"
                  value={travelInfo.known_traveler_number}
                  onChange={(e) => setTravelInfo(prev => ({ ...prev, known_traveler_number: e.target.value }))}
                  disabled={!isEditing}
                  helperText="TSA PreCheck/Global Entry number"
                />
                <TextField
                  sx={{ flex: '1 1 300px' }}
                  label="Global Entry Number"
                  value={travelInfo.global_entry_number}
                  onChange={(e) => setTravelInfo(prev => ({ ...prev, global_entry_number: e.target.value }))}
                  disabled={!isEditing}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={travelInfo.tsa_precheck}
                      onChange={(e) => setTravelInfo(prev => ({ ...prev, tsa_precheck: e.target.checked }))}
                      disabled={!isEditing}
                    />
                  }
                  label="TSA PreCheck"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={travelInfo.clear_membership}
                      onChange={(e) => setTravelInfo(prev => ({ ...prev, clear_membership: e.target.checked }))}
                      disabled={!isEditing}
                    />
                  }
                  label="CLEAR Membership"
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Frequent Flyer Programs Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlightIcon />
              <Typography variant="subtitle1">Frequent Flyer Programs</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              {travelInfo.frequent_flyer_programs.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {travelInfo.frequent_flyer_programs.map((ffp, index) => (
                    <Chip
                      key={index}
                      label={`${ffp.airline}: ${ffp.membershipNumber}${ffp.status ? ` (${ffp.status})` : ''}`}
                      onDelete={isEditing ? () => handleRemoveFFP(index) : undefined}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              ) : (
                <Typography color="textSecondary">No frequent flyer programs added</Typography>
              )}
            </Box>
            {isEditing && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setFFPDialogOpen(true)}
                variant="outlined"
                size="small"
              >
                Add Program
              </Button>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Passport Information Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Passport Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                sx={{ flex: '1 1 250px' }}
                label="Passport Number"
                value={travelInfo.passport_number}
                onChange={(e) => setTravelInfo(prev => ({ ...prev, passport_number: e.target.value }))}
                disabled={!isEditing}
                type="password"
              />
              <TextField
                sx={{ flex: '1 1 250px' }}
                label="Expiry Date"
                type={isEditing ? "date" : "text"}
                value={isEditing ? travelInfo.passport_expiry : formatPassportExpiry(travelInfo.passport_expiry)}
                onChange={(e) => setTravelInfo(prev => ({ ...prev, passport_expiry: e.target.value }))}
                disabled={!isEditing}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                sx={{ flex: '1 1 250px' }}
                label="Issuing Country"
                value={travelInfo.passport_country}
                onChange={(e) => setTravelInfo(prev => ({ ...prev, passport_country: e.target.value }))}
                disabled={!isEditing}
                placeholder="USA"
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Emergency Contact Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmergencyIcon />
              <Typography variant="subtitle1">Emergency Contact</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  sx={{ flex: '1 1 300px' }}
                  label="Contact Name"
                  value={travelInfo.emergency_contact_name}
                  onChange={(e) => setTravelInfo(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  disabled={!isEditing}
                />
                <TextField
                  sx={{ flex: '1 1 300px' }}
                  label="Phone Number"
                  value={travelInfo.emergency_contact_phone}
                  onChange={(e) => setTravelInfo(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  disabled={!isEditing}
                />
              </Box>
              <TextField
                fullWidth
                label="Relationship"
                value={travelInfo.emergency_contact_relationship}
                onChange={(e) => setTravelInfo(prev => ({ ...prev, emergency_contact_relationship: e.target.value }))}
                disabled={!isEditing}
                placeholder="Spouse, Parent, Sibling, etc."
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Medical Information Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalIcon />
              <Typography variant="subtitle1">Medical Information</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Medical Conditions"
                value={travelInfo.medical_conditions}
                onChange={(e) => setTravelInfo(prev => ({ ...prev, medical_conditions: e.target.value }))}
                disabled={!isEditing}
                multiline
                rows={2}
                placeholder="List any medical conditions relevant to travel"
              />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  sx={{ flex: '1 1 300px' }}
                  label="Allergies"
                  value={travelInfo.allergies}
                  onChange={(e) => setTravelInfo(prev => ({ ...prev, allergies: e.target.value }))}
                  disabled={!isEditing}
                  multiline
                  rows={2}
                  placeholder="Food allergies, medication allergies, etc."
                />
                <TextField
                  sx={{ flex: '1 1 300px' }}
                  label="Current Medications"
                  value={travelInfo.medications}
                  onChange={(e) => setTravelInfo(prev => ({ ...prev, medications: e.target.value }))}
                  disabled={!isEditing}
                  multiline
                  rows={2}
                  placeholder="List current medications"
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Additional Notes Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Additional Notes</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              label="Travel Notes"
              value={travelInfo.notes}
              onChange={(e) => setTravelInfo(prev => ({ ...prev, notes: e.target.value }))}
              disabled={!isEditing}
              multiline
              rows={3}
              placeholder="Any other travel-related information you want to remember"
            />
          </AccordionDetails>
        </Accordion>

        {/* Frequent Flyer Program Dialog */}
        <Dialog open={ffpDialogOpen} onClose={() => setFFPDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Frequent Flyer Program</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Airline"
                value={newFFP.airline}
                onChange={(e) => setNewFFP(prev => ({ ...prev, airline: e.target.value }))}
                placeholder="Delta, American, United, etc."
              />
              <TextField
                fullWidth
                label="Membership Number"
                value={newFFP.membershipNumber}
                onChange={(e) => setNewFFP(prev => ({ ...prev, membershipNumber: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Status (Optional)"
                value={newFFP.status}
                onChange={(e) => setNewFFP(prev => ({ ...prev, status: e.target.value }))}
                placeholder="Gold, Platinum, Diamond, etc."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFFPDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFFP} variant="contained" disabled={!newFFP.airline || !newFFP.membershipNumber}>
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TravelInformation;
