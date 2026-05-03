const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Lease = require('../models/Lease');

const generateToken = (user) =>
    jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        if (!name || !email || !password || !role) return res.status(400).json({ message: 'All fields required' });
        if (!['owner', 'tenant'].includes(role)) return res.status(400).json({ message: 'Role must be owner or tenant' });
        if (!/^[^\s@]+@[^\s@]+\.(com|lk)$/i.test(email)) return res.status(400).json({ message: 'Email must end with .com or .lk' });

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email already registered' });

        const avatar = req.file ? `/uploads/${req.file.filename}` : null;
        const user = await User.create({ name, email, phone, password, role, avatar });
        res.status(201).json({
            _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar,
            token: generateToken(user),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        res.json({
            _id: user._id, name: user.name, email: user.email, phone: user.phone,
            role: user.role, avatar: user.avatar,
            token: generateToken(user),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/auth/me – get current user
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/auth/profile – update profile
const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (req.file) user.avatar = `/uploads/${req.file.filename}`;
        await user.save();
        res.json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/auth/password
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');
        if (!user || !(await user.matchPassword(oldPassword))) {
            return res.status(401).json({ message: 'Invalid current password' });
        }
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/auth/delete
const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ message: 'Password is required' });

        const user = await User.findById(req.user.id).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const activeLease = await Lease.findOne({
            $or: [{ tenant: user._id }, { owner: user._id }],
            status: 'active'
        });

        if (activeLease) {
            return res.status(400).json({ message: 'Cannot delete account with an active lease. Please arrange the cancellation first.' });
        }

        await user.deleteOne();
        res.json({ message: 'Account deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/auth/notifications
const getNotificationCounts = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('notificationSeen role');
        const seen = (user && user.notificationSeen) ? user.notificationSeen : {};

        let counts = { appointments: 0, leases: 0, bills: 0, maintenance: 0, notices: 0 };

        if (req.user.role === 'owner') {
            const apptAfter = seen.appointments || new Date(0);
            const leaseAfter = seen.leases || new Date(0);
            const billAfter = seen.bills || new Date(0);
            const maintAfter = seen.maintenance || new Date(0);

            counts.appointments = await require('../models/Appointment').countDocuments({
                owner: req.user.id, status: 'pending', updatedAt: { $gt: apptAfter }
            });
            counts.leases = await require('../models/Lease').countDocuments({
                owner: req.user.id,
                status: { $in: ['pending_approval', 'pending_update', 'pending_termination'] },
                updatedAt: { $gt: leaseAfter }
            });
            counts.bills = await require('../models/Bill').countDocuments({
                owner: req.user.id, status: 'pending_approval', updatedAt: { $gt: billAfter }
            });
            counts.maintenance = await require('../models/Maintenance').countDocuments({
                owner: req.user.id, status: 'pending_approval', updatedAt: { $gt: maintAfter }
            });
        } else {
            const apptAfter = seen.appointments || new Date(0);
            const noticeAfter = seen.notices || new Date(0);

            counts.appointments = await require('../models/Appointment').countDocuments({
                tenant: req.user.id,
                status: { $in: ['accepted', 'rejected'] },
                updatedAt: { $gt: apptAfter }
            });

            const myLeases = await require('../models/Lease').find({ tenant: req.user.id, status: 'active' });
            const propertyIds = myLeases.map(l => l.property);

            counts.notices = await require('../models/Notice').countDocuments({
                $or: [{ property: null }, { property: { $in: propertyIds } }],
                createdAt: { $gt: noticeAfter }
            });
        }

        res.json(counts);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// PATCH /api/auth/notifications/clear/:type
const clearNotificationCount = async (req, res) => {
    try {
        const validTypes = ['appointments', 'leases', 'bills', 'maintenance', 'notices'];
        const { type } = req.params;
        if (!validTypes.includes(type)) return res.status(400).json({ message: 'Invalid notification type' });

        await User.findByIdAndUpdate(req.user.id, {
            [`notificationSeen.${type}`]: new Date()
        });

        res.json({ message: 'Cleared', type });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    deleteAccount,
    getNotificationCounts,
    clearNotificationCount,
};
