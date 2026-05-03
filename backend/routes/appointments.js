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
    respondToAppointmentChange,
    deleteAppointment,
    requestAppointmentCancellation,
    editAppointmentDirectly,
    ownerCancelAppointment
} = require('../controllers/appointmentsController');

// POST /api/appointments – tenant creates
router.post('/', protect, requireRole('tenant'), upload.fields([{ name: 'nicFront', maxCount: 1 }, { name: 'nicBack', maxCount: 1 }]), createAppointment);

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

// DELETE /api/appointments/:id – tenant deletes before approval
router.delete('/:id', protect, requireRole('tenant'), deleteAppointment);

// PATCH /api/appointments/:id/cancel-request – tenant requests cancellation
router.patch('/:id/cancel-request', protect, requireRole('tenant'), requestAppointmentCancellation);

// PATCH /api/appointments/:id/edit - tenant edits pending appointment
router.patch('/:id/edit', protect, requireRole('tenant'), editAppointmentDirectly);

// PATCH /api/appointments/:id/owner-cancel - owner cancels accepted appointment
router.patch('/:id/owner-cancel', protect, requireRole('owner'), ownerCancelAppointment);

module.exports = router;
