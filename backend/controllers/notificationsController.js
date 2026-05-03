const Notification = require('../models/Notification');

// GET /api/notifications
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id }).sort('-createdAt');
        res.json(notifications);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/notifications/unread/count
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user: req.user.id, isRead: false });
        res.json({ count });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { isRead: true },
            { new: true }
        );
        res.json(notif);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// PATCH /api/notifications/read-all
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
        res.json({ message: 'All marked as read' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
