const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');
const {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    requestAppointmentChange,
    respondToAppointmentChange
} = require('../controllers/appointmentsController');

// POST /api/appointments – tenant creates
router.post('/', protect, requireRole('tenant'), upload.single('receipt'), createAppointment);

// GET /api/appointments – get mine (role-based)
router.get('/', protect, getAppointments);

// GET /api/appointments/:id
router.get('/:id', protect, getAppointmentById);

// PATCH /api/appointments/:id/status – owner accepts/rejects
router.patch('/:id/status', protect, requireRole('owner'), updateAppointmentStatus);

// PATCH /api/appointments/:id/change-request – tenant requests change
router.patch('/:id/change-request', protect, requireRole('tenant'), requestAppointmentChange);

// PATCH /api/appointments/:id/change-request/status – owner accepts/rejects change
router.patch('/:id/change-request/status', protect, requireRole('owner'), respondToAppointmentChange);

module.exports = router;
