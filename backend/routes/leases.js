const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { upload } = require('../middleware/upload');
const {
    createLease,
    getLeases,
    getLeaseById,
    requestLeaseUpdate,
    requestLeaseTermination,
    approveLeaseAction,
    ownerTerminateLease,
    deleteLeaseDirectly,
    editLeaseDirectly
} = require('../controllers/leasesController');

// POST /api/leases – create (pending_approval)
router.post('/', protect, upload.array('documents', 10), createLease);

// GET /api/leases – get mine
router.get('/', protect, getLeases);

// GET /api/leases/:id
router.get('/:id', protect, getLeaseById);

// PUT /api/leases/:id – request update (pending_update)
router.put('/:id', protect, upload.array('documents', 10), requestLeaseUpdate);

// PATCH /api/leases/:id/edit - edit pending directly
router.patch('/:id/edit', protect, upload.array('documents', 10), editLeaseDirectly);

// DELETE /api/leases/:id - delete pending directly
router.delete('/:id', protect, deleteLeaseDirectly);

// PATCH /api/leases/:id/terminate-request – tenant requests termination
router.patch('/:id/terminate-request', protect, requestLeaseTermination);

// PATCH /api/leases/:id/owner-terminate - owner actively kills lease
router.patch('/:id/owner-terminate', protect, requireRole('owner'), ownerTerminateLease);

// PATCH /api/leases/:id/approve – owner approves or rejects any pending operation
router.patch('/:id/approve', protect, requireRole('owner'), approveLeaseAction);

module.exports = router;
