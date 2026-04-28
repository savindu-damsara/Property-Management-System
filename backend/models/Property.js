const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    propertyType: { type: String, enum: ['house', 'apartment', 'villa', 'room', 'commercial'], default: 'apartment' },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    area: { type: Number }, // sq ft
    rentPerMonth: { type: Number, required: true }, // LKR
    images: [{ type: String }], // up to 10 image URLs
    amenities: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
