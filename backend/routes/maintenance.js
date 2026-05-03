const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadImages } = require('../middleware/upload');

const {
    createMaintenanceRequest,
    getMaintenanceRequests,
    getMaintenanceRequestById,
    editMaintenanceDirectly,
    deleteMaintenanceDirectly,
    requestEditMaintenance,
    requestDeleteMaintenance,
    approveEditRequest,
    approveDeleteRequest,
    approveMaintenanceRequest,
    ownerCancelMaintenance
} = require('../controllers/maintenanceController');

router.post('/', protect, requireRole('tenant'), uploadImages.array('images', 5), createMaintenanceRequest);
router.get('/', protect, getMaintenanceRequests);
router.get('/:id', protect, getMaintenanceRequestById);

// Tenant direct actions for pending
router.put('/:id/edit', protect, requireRole('tenant'), uploadImages.array('images', 5), editMaintenanceDirectly);
router.delete('/:id/delete', protect, requireRole('tenant'), deleteMaintenanceDirectly);

// Tenant request actions for approved
router.post('/:id/request-edit', protect, requireRole('tenant'), uploadImages.array('images', 5), requestEditMaintenance);
router.post('/:id/request-delete', protect, requireRole('tenant'), requestDeleteMaintenance);

// Owner approvals
router.patch('/:id/approve', protect, requireRole('owner'), approveMaintenanceRequest);
router.patch('/:id/approve-edit', protect, requireRole('owner'), approveEditRequest);
router.patch('/:id/approve-delete', protect, requireRole('owner'), approveDeleteRequest);
router.patch('/:id/owner-cancel', protect, requireRole('owner'), ownerCancelMaintenance);

module.exports = router;
