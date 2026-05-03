const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadPdf } = require('../middleware/upload');
const {
    createBill, getBills, getBillById, approveBill,
    editBill, deleteBill,
    requestEditBill, requestDeleteBill,
    approveEditRequest, approveDeleteRequest,
} = require('../controllers/billsController');

// POST /api/bills – tenant submits a payment
router.post('/', protect, requireRole('tenant'), uploadPdf.single('document'), createBill);

// GET /api/bills
router.get('/', protect, getBills);

// GET /api/bills/:id
router.get('/:id', protect, getBillById);

// PATCH /api/bills/:id – tenant directly edits a pending_approval bill
router.patch('/:id', protect, requireRole('tenant'), uploadPdf.single('document'), editBill);

// DELETE /api/bills/:id – tenant directly deletes a pending_approval bill
router.delete('/:id', protect, requireRole('tenant'), deleteBill);

// PATCH /api/bills/:id/approve – owner approves or rejects a bill
router.patch('/:id/approve', protect, requireRole('owner'), approveBill);

// PATCH /api/bills/:id/request-edit – tenant requests edit of an approved bill
router.patch('/:id/request-edit', protect, requireRole('tenant'), uploadPdf.single('document'), requestEditBill);

// PATCH /api/bills/:id/request-delete – tenant requests deletion of an approved bill
router.patch('/:id/request-delete', protect, requireRole('tenant'), requestDeleteBill);

// PATCH /api/bills/:id/approve-edit – owner approves/rejects an edit request
router.patch('/:id/approve-edit', protect, requireRole('owner'), approveEditRequest);

// PATCH /api/bills/:id/approve-delete – owner approves/rejects a delete request
router.patch('/:id/approve-delete', protect, requireRole('owner'), approveDeleteRequest);

module.exports = router;
