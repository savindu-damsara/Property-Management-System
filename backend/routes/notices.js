const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');
const {
    createNotice,
    getNotices,
    getNoticeById,
    updateNotice,
    deleteNotice
} = require('../controllers/noticesController');

// POST /api/notices – owner creates
router.post('/', protect, requireRole('owner'), upload.single('attachment'), createNotice);

// GET /api/notices – all authenticated users can read
router.get('/', protect, getNotices);

// GET /api/notices/:id
router.get('/:id', protect, getNoticeById);

// PUT /api/notices/:id – owner updates
router.put('/:id', protect, requireRole('owner'), upload.single('attachment'), updateNotice);

// DELETE /api/notices/:id – owner deletes
router.delete('/:id', protect, requireRole('owner'), deleteNotice);

module.exports = router;
