const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    rentAmount: { type: Number, required: true }, // LKR/month
    rentDueDay: { type: Number, min: 1, max: 28, default: 1 }, // day of month rent is due
    terms: { type: String },
    documents: [{ type: String }], // Array of uploaded URLs (PDF, JPEG, PNG)
    status: {
        type: String,
        enum: ['pending_approval', 'active', 'rejected', 'pending_update', 'pending_termination', 'terminated', 'cancelled'],
        default: 'pending_approval',
    },
    cancellationReason: { type: String },        // shown to the owner (e.g. 'Change of mind')
    tenantCancellationReason: { type: String },  // shown to the tenant (e.g. 'Active lease already exists')
    // Pending changes stored here until approved
    pendingUpdate: {
        startDate: Date,
        endDate: Date,
        rentAmount: Number,
        rentDueDay: Number,
        terms: String,
        documents: [{ type: String }],
    },
    rejectionReason: { type: String },
    terminationReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Lease', leaseSchema);
