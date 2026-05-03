const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true }, // LKR
    paidDate: { type: Date, required: true },
    document: { type: String }, // PDF or image URL
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'rejected'],
        default: 'pending_approval',
    },
    rejectionReason: { type: String },
    billType: { type: String, enum: ['rent', 'utility', 'maintenance', 'other'], default: 'rent' },
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
