const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    rentAmount: { type: Number, required: true }, // LKR/month
    terms: { type: String },
    document: { type: String }, // PDF/file URL
    status: {
        type: String,
        enum: ['pending_approval', 'active', 'rejected', 'pending_update', 'pending_termination', 'terminated'],
        default: 'pending_approval',
    },
    // Pending changes stored here until approved
    pendingUpdate: {
        startDate: Date,
        endDate: Date,
        rentAmount: Number,
        terms: String,
        document: String,
    },
    rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Lease', leaseSchema);
