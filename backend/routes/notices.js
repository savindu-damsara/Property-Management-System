const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadDocs } = require('../middleware/upload');
const {
    createNotice,
    getNotices,
    getNoticeById,
    updateNotice,
    deleteNotice
} = require('../controllers/noticesController');

// POST /api/notices – owner creates
router.post('/', protect, requireRole('owner'), uploadDocs.array('documents', 5), createNotice);

// GET /api/notices – all authenticated users can read
router.get('/', protect, getNotices);

// GET /api/notices/:id
router.get('/:id', protect, getNoticeById);

// PUT /api/notices/:id – owner updates
router.put('/:id', protect, requireRole('owner'), uploadDocs.array('documents', 5), updateNotice);

// DELETE /api/notices/:id – owner deletes
router.delete('/:id', protect, requireRole('owner'), deleteNotice);

module.exports = router;
