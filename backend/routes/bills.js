const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');
const {
    createBill,
    getBills,
    getBillById,
    approveBill
} = require('../controllers/billsController');

// POST /api/bills – tenant uploads a bill
router.post('/', protect, requireRole('tenant'), upload.single('document'), createBill);

// GET /api/bills – get mine with stats
router.get('/', protect, getBills);

// GET /api/bills/:id
router.get('/:id', protect, getBillById);

// PATCH /api/bills/:id/approve – owner approves or rejects
router.patch('/:id/approve', protect, requireRole('owner'), approveBill);

module.exports = router;
