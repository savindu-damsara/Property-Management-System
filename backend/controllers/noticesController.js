const Notice = require('../models/Notice');
const Lease = require('../models/Lease');
const Notification = require('../models/Notification');

const normalizeArray = (val) => Array.isArray(val) ? val : (val ? [val] : []);

// POST /api/notices – owner creates
const createNotice = async (req, res) => {
    try {
        const { title, content, targetAll } = req.body;
        const targetProperties = normalizeArray(req.body.targetProperties);
        const isTargetAll = targetAll === 'true' || targetAll === true;

        if (!title || !content || (!isTargetAll && targetProperties.length === 0)) {
            return res.status(400).json({ message: 'Title, content and target properties are required' });
        }

        const documents = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
        if (documents.length > 5) return res.status(400).json({ message: 'Maximum 5 files allowed' });

        const notice = await Notice.create({
            owner: req.user.id,
            targetAll: isTargetAll,
            targetProperties: isTargetAll ? [] : targetProperties,
            title: title.slice(0, 30),
            content: content.slice(0, 100),
            documents
        });

        // Notifications
        if (isTargetAll) {
            // Find all active leases for this owner
            const leases = await Lease.find({ owner: req.user.id, status: 'active' });
            const userIds = [...new Set(leases.map(l => l.tenant.toString()))];
            for (const uid of userIds) {
                await Notification.create({ user: uid, title: 'New Notice', content: title.slice(0, 30), type: 'notice', referenceId: notice._id });
            }
        } else {
            // Find active leases for targeted properties
            const leases = await Lease.find({ owner: req.user.id, property: { $in: targetProperties }, status: 'active' });
            const userIds = [...new Set(leases.map(l => l.tenant.toString()))];
            for (const uid of userIds) {
                await Notification.create({ user: uid, title: 'New Notice', content: title.slice(0, 30), type: 'notice', referenceId: notice._id });
            }
        }

        res.status(201).json(notice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/notices
const getNotices = async (req, res) => {
    try {
        const filter = {};

        if (req.user.role === 'owner') {
            filter.owner = req.user.id;
        } else if (req.user.role === 'tenant') {
            const activeLeases = await Lease.find({ tenant: req.user.id, status: 'active' });
            const propertyIds = activeLeases.map(l => l.property);

            filter.$or = [
                { targetAll: true },
                { targetProperties: { $in: propertyIds } }
            ];
        }

        const notices = await Notice.find(filter)
            .populate('owner', 'name email avatar')
            .populate('targetProperties', 'title address')
            .sort('-createdAt');
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/notices/:id
const getNoticeById = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id)
            .populate('owner', 'name email avatar')
            .populate('targetProperties', 'title address');
        if (!notice) return res.status(404).json({ message: 'Notice not found' });
        res.json(notice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/notices/:id – owner updates
const updateNotice = async (req, res) => {
    try {
        const notice = await Notice.findOne({ _id: req.params.id, owner: req.user.id });
        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        const { title, content, targetAll, keepOldDocuments } = req.body;
        const targetProperties = normalizeArray(req.body.targetProperties);
        const isTargetAll = targetAll === 'true' || targetAll === true;

        if (title) notice.title = title.slice(0, 30);
        if (content) notice.content = content.slice(0, 100);
        notice.targetAll = isTargetAll;
        if (isTargetAll) {
            notice.targetProperties = [];
        } else if (targetProperties.length > 0) {
            notice.targetProperties = targetProperties;
        }

        if (req.files && req.files.length > 0) {
            notice.documents = req.files.map(f => `/uploads/${f.filename}`);
        } else if (keepOldDocuments === 'false') {
            notice.documents = [];
        }

        if (notice.documents.length > 5) return res.status(400).json({ message: 'Maximum 5 files allowed' });

        await notice.save();
        res.json(notice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/notices/:id – owner deletes
const deleteNotice = async (req, res) => {
    try {
        const notice = await Notice.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        await Notification.deleteMany({ type: 'notice', referenceId: notice._id });
        res.json({ message: 'Notice deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createNotice,
    getNotices,
    getNoticeById,
    updateNotice,
    deleteNotice
};
