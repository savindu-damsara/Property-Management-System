const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { upload } = require('../middleware/upload');
const {
    getProperties,
    getMyProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty
} = require('../controllers/propertiesController');

// GET /api/properties – all available (public)
router.get('/', getProperties);

// GET /api/properties/mine – owner's own properties
router.get('/mine', protect, requireRole('owner'), getMyProperties);

// GET /api/properties/:id – single property
router.get('/:id', getPropertyById);

// POST /api/properties – create (owner only), up to 10 images
router.post('/', protect, requireRole('owner'), upload.array('images', 10), createProperty);

// PUT /api/properties/:id – update (owner, own property)
router.put('/:id', protect, requireRole('owner'), upload.array('images', 10), updateProperty);

// DELETE /api/properties/:id – soft delete (owner)
router.delete('/:id', protect, requireRole('owner'), deleteProperty);

module.exports = router;
