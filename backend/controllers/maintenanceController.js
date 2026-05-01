const Maintenance = require('../models/Maintenance');
const Property = require('../models/Property');

// POST /api/maintenance – tenant creates request
const createMaintenanceRequest = async (req, res) => {
    try {
        const { property, title, description, priority } = req.body;
        if (!property || !title || !description) return res.status(400).json({ message: 'Property, title and description required' });

        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const request = await Maintenance.create({
            property, tenant: req.user.id, owner: prop.owner,
            title, description, priority: priority || 'medium', image,
        });
        res.status(201).json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/maintenance – get mine
const getMaintenanceRequests = async (req, res) => {
    try {
        const filter = req.user.role === 'owner' ? { owner: req.user.id } : { tenant: req.user.id };
        if (req.query.property) filter.property = req.query.property;

        const requests = await Maintenance.find(filter)
            .populate('property', 'title address city')
            .populate('tenant', 'name email phone avatar')
            .populate('owner', 'name email phone')
            .sort('-createdAt');
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/maintenance/:id
const getMaintenanceRequestById = async (req, res) => {
    try {
        const req2 = await Maintenance.findById(req.params.id)
            .populate('property', 'title address city')
            .populate('tenant', 'name email phone avatar')
            .populate('owner', 'name email phone');
        if (!req2) return res.status(404).json({ message: 'Request not found' });
        res.json(req2);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/maintenance/:id – tenant requests update
const updateMaintenanceRequest = async (req, res) => {
    try {
        const maint = await Maintenance.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!maint) return res.status(404).json({ message: 'Request not found' });

        const { title, description, priority } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : maint.image;
        maint.pendingUpdate = {
            title: title || maint.title,
            description: description || maint.description,
            priority: priority || maint.priority,
            image,
        };
        maint.status = 'pending_update';
        await maint.save();
        res.json(maint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/maintenance/:id – tenant requests deletion
const deleteMaintenanceRequest = async (req, res) => {
    try {
        const maint = await Maintenance.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!maint) return res.status(404).json({ message: 'Request not found' });
        maint.status = 'pending_deletion';
        await maint.save();
        res.json({ message: 'Deletion request sent', maint });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/maintenance/:id/approve – owner approves/rejects
const approveMaintenanceRequest = async (req, res) => {
    try {
        const { action, rejectionReason, newStatus } = req.body;
        const maint = await Maintenance.findOne({ _id: req.params.id, owner: req.user.id });
        if (!maint) return res.status(404).json({ message: 'Request not found' });

        if (action === 'approve') {
            if (maint.status === 'pending_approval') {
                maint.status = newStatus || 'approved';
            } else if (maint.status === 'pending_update' && maint.pendingUpdate) {
                Object.assign(maint, maint.pendingUpdate);
                maint.pendingUpdate = undefined;
                maint.status = 'approved';
            } else if (maint.status === 'pending_deletion') {
                maint.status = 'cancelled';
            } else if (['approved', 'in_progress'].includes(maint.status) && newStatus) {
                maint.status = newStatus; // e.g. in_progress, completed
            }
        } else {
            if (['pending_update', 'pending_deletion'].includes(maint.status)) {
                maint.status = 'approved';
            } else {
                maint.status = 'rejected';
            }
            if (rejectionReason) maint.rejectionReason = rejectionReason;
            maint.pendingUpdate = undefined;
        }
        await maint.save();
        res.json(maint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createMaintenanceRequest,
    getMaintenanceRequests,
    getMaintenanceRequestById,
    updateMaintenanceRequest,
    deleteMaintenanceRequest,
    approveMaintenanceRequest
};
