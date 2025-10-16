const express = require('express');
const router = express.Router();
const Location = require('../models/location.model');
const { protect } = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Get all locations (admin only)
router.get('/', protect, authorize(['admin']), async (req, res) => {
  const locations = await Location.find();
  res.json(locations);
});

// Create new location
router.post('/', protect, authorize(['admin']), async (req, res) => {
  const location = await Location.create(req.body);
  res.status(201).json(location);
});

// Update location
router.put('/:id', protect, authorize(['admin']), async (req, res) => {
  const location = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!location) return res.status(404).json({ message: 'Location not found' });
  res.json(location);
});

// Delete location
router.delete('/:id', protect, authorize(['admin']), async (req, res) => {
  await Location.findByIdAndDelete(req.params.id);
  res.json({ message: 'Location deleted' });
});

module.exports = router;
