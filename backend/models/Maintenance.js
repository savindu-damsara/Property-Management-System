const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String }, // optional supporting image
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'rejected', 'in_progress', 'completed', 'pending_deletion', 'cancelled', 'pending_update'],
        default: 'pending_approval',
    },
    pendingUpdate: {
        title: String,
        description: String,
        priority: String,
        image: String,
    },
    rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
