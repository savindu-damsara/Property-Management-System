const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');
const {
    createMaintenanceRequest,
    getMaintenanceRequests,
    getMaintenanceRequestById,
    updateMaintenanceRequest,
    deleteMaintenanceRequest,
    approveMaintenanceRequest
} = require('../controllers/maintenanceController');

// POST /api/maintenance – tenant creates request
router.post('/', protect, requireRole('tenant'), upload.single('image'), createMaintenanceRequest);

// GET /api/maintenance – get mine
router.get('/', protect, getMaintenanceRequests);

// GET /api/maintenance/:id
router.get('/:id', protect, getMaintenanceRequestById);

// PUT /api/maintenance/:id – tenant requests update
router.put('/:id', protect, requireRole('tenant'), upload.single('image'), updateMaintenanceRequest);

// DELETE /api/maintenance/:id – tenant requests deletion
router.delete('/:id', protect, requireRole('tenant'), deleteMaintenanceRequest);

// PATCH /api/maintenance/:id/approve – owner approves/rejects
router.patch('/:id/approve', protect, requireRole('owner'), approveMaintenanceRequest);

module.exports = router;
