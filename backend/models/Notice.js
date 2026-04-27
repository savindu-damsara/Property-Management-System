const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }, // optional – if null, applies to all
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    attachment: { type: String }, // PDF or image URL
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
