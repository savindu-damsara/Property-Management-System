const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    images: [{ type: String }], // Array for multiple images (up to 5)
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'],
        default: 'pending_approval',
    },
    editRequest: {
        title: String,
        description: String,
        priority: String,
        images: [{ type: String }],
        status: { type: String, enum: ['pending', 'rejected', 'approved'] },
        rejectionReason: String,
    },
    deleteRequest: {
        reason: String,
        status: { type: String, enum: ['pending', 'rejected', 'approved'] },
        rejectionReason: String,
    },
    rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
