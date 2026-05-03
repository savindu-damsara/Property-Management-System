const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, required: true }, // 'appointment', 'lease', 'bill', 'maintenance', 'notice'
    isRead: { type: Boolean, default: false },
    referenceId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
