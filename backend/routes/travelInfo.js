const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user's travel information
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM user_travel_info WHERE user_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      // Return default empty structure if no travel info exists
      return res.json({
        travelInfo: {
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
        }
      });
    }

    const travelInfo = rows[0];
    
    // Parse JSON fields
    if (travelInfo.frequent_flyer_programs) {
      try {
        travelInfo.frequent_flyer_programs = JSON.parse(travelInfo.frequent_flyer_programs);
      } catch (e) {
        travelInfo.frequent_flyer_programs = [];
      }
    }

    res.json({ travelInfo });
  } catch (error) {
    console.error('Error fetching travel info:', error);
    res.status(500).json({ error: 'Failed to fetch travel information' });
  }
});

// Create or update user's travel information
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      frequent_flyer_programs,
      known_traveler_number,
      global_entry_number,
      passport_number,
      passport_expiry,
      passport_country,
      tsa_precheck,
      clear_membership,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      medical_conditions,
      allergies,
      medications,
      notes
    } = req.body;

    // Convert frequent flyer programs to JSON
    const ffpJson = JSON.stringify(frequent_flyer_programs || []);

    // Check if record exists
    const [existing] = await pool.execute(
      'SELECT id FROM user_travel_info WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length > 0) {
      // Update existing record
      await pool.execute(`
        UPDATE user_travel_info SET
          frequent_flyer_programs = ?,
          known_traveler_number = ?,
          global_entry_number = ?,
          passport_number = ?,
          passport_expiry = ?,
          passport_country = ?,
          tsa_precheck = ?,
          clear_membership = ?,
          emergency_contact_name = ?,
          emergency_contact_phone = ?,
          emergency_contact_relationship = ?,
          medical_conditions = ?,
          allergies = ?,
          medications = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        ffpJson,
        known_traveler_number || null,
        global_entry_number || null,
        passport_number || null,
        passport_expiry || null,
        passport_country || null,
        !!tsa_precheck,
        !!clear_membership,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        emergency_contact_relationship || null,
        medical_conditions || null,
        allergies || null,
        medications || null,
        notes || null,
        req.user.id
      ]);
    } else {
      // Create new record
      await pool.execute(`
        INSERT INTO user_travel_info (
          user_id,
          frequent_flyer_programs,
          known_traveler_number,
          global_entry_number,
          passport_number,
          passport_expiry,
          passport_country,
          tsa_precheck,
          clear_membership,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          medical_conditions,
          allergies,
          medications,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.id,
        ffpJson,
        known_traveler_number || null,
        global_entry_number || null,
        passport_number || null,
        passport_expiry || null,
        passport_country || null,
        !!tsa_precheck,
        !!clear_membership,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        emergency_contact_relationship || null,
        medical_conditions || null,
        allergies || null,
        medications || null,
        notes || null
      ]);
    }

    res.json({ message: 'Travel information saved successfully' });
  } catch (error) {
    console.error('Error saving travel info:', error);
    res.status(500).json({ error: 'Failed to save travel information' });
  }
});

// Delete user's travel information
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM user_travel_info WHERE user_id = ?',
      [req.user.id]
    );

    res.json({ message: 'Travel information deleted successfully' });
  } catch (error) {
    console.error('Error deleting travel info:', error);
    res.status(500).json({ error: 'Failed to delete travel information' });
  }
});

module.exports = router;
