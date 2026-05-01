const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');
const {
    createLease,
    getLeases,
    getLeaseById,
    requestLeaseUpdate,
    requestLeaseTermination,
    approveLeaseAction
} = require('../controllers/leasesController');

// POST /api/leases – create (pending_approval)
router.post('/', protect, upload.single('document'), createLease);

// GET /api/leases – get mine
router.get('/', protect, getLeases);

// GET /api/leases/:id
router.get('/:id', protect, getLeaseById);

// PUT /api/leases/:id – request update (pending_update)
router.put('/:id', protect, upload.single('document'), requestLeaseUpdate);

// DELETE /api/leases/:id – request termination
router.delete('/:id', protect, requestLeaseTermination);

// PATCH /api/leases/:id/approve – owner approves or rejects any pending operation
router.patch('/:id/approve', protect, requireRole('owner'), approveLeaseAction);

module.exports = router;
