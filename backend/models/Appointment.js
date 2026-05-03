const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // "14:30"
    location: { type: String, required: true },
    receipt: { type: String }, // uploaded file URL
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'change_requested'],
        default: 'pending',
    },
    rejectionReason: { type: String },
    changeRequest: {
        date: Date,
        time: String,
        location: String,
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
