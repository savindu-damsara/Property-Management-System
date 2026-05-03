const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { register, login, getMe, updateProfile, changePassword, deleteAccount, getNotificationCounts, clearNotificationCount } = require('../controllers/authController');
const { upload } = require('../middleware/upload');

// POST /api/auth/register
router.post('/register', upload.single('avatar'), register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me – get current user
router.get('/me', protect, getMe);

// GET /api/auth/notifications
router.get('/notifications', protect, getNotificationCounts);

// PATCH /api/auth/notifications/clear/:type
router.patch('/notifications/clear/:type', protect, clearNotificationCount);

// PUT /api/auth/profile – update profile
router.put('/profile', protect, upload.single('avatar'), (req, res, next) => {
    require('fs').writeFileSync('C:/Users/Savindu/Desktop/ts/property and tenant management system/backend/debug_req.json', JSON.stringify({ file: req.file || null, body: req.body || null }));
    next();
}, updateProfile);

// PUT /api/auth/password – change password
router.put('/password', protect, changePassword);

// DELETE /api/auth/delete – delete account
router.delete('/delete', protect, deleteAccount);

module.exports = router;
