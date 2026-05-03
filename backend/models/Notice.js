const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetAll: { type: Boolean, default: false },
    targetProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    documents: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
