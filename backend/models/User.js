const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'tenant'], required: true },
    avatar: { type: String, default: '' },
    notificationSeen: {
        appointments: { type: Date, default: null },
        leases: { type: Date, default: null },
        bills: { type: Date, default: null },
        maintenance: { type: Date, default: null },
        notices: { type: Date, default: null },
    },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.matchPassword = async function (entered) {
    return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
