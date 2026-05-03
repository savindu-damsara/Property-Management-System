const mongoose = require('mongoose');

const editRequestSchema = new mongoose.Schema({
    title: { type: String },
    description: { type: String },
    amount: { type: Number },
    paidDate: { type: Date },
    rentMonth: { type: String }, // YYYY-MM
    document: { type: String }, // new PDF path if uploaded
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
}, { _id: false });

const deleteRequestSchema = new mongoose.Schema({
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
}, { _id: false });

const billSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true }, // LKR
    paidDate: { type: Date, required: true },
    rentMonth: { type: String }, // YYYY-MM — required when billType === 'rent'
    document: { type: String }, // PDF URL
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'rejected'],
        default: 'pending_approval',
    },
    rejectionReason: { type: String },
    billType: { type: String, enum: ['rent', 'utility', 'maintenance', 'other'], default: 'rent' },
    editRequest: { type: editRequestSchema, default: null },
    deleteRequest: { type: deleteRequestSchema, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
