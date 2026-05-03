const Maintenance = require('../models/Maintenance');
const Property = require('../models/Property');
const Notification = require('../models/Notification');

// POST /api/maintenance – tenant creates request
const createMaintenanceRequest = async (req, res) => {
    try {
        const { property, title, description, priority } = req.body;
        if (!property || !title || !description) return res.status(400).json({ message: 'Property, title and description required' });

        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
        if (images.length === 0) return res.status(400).json({ message: 'At least one photo is required.' });

        const request = await Maintenance.create({
            property, tenant: req.user.id, owner: prop.owner,
            title, description, priority: priority || 'medium', images,
        });

        await Notification.create({
            user: prop.owner, title: 'New Maintenance Request',
            content: `A tenant submitted a new ${priority || 'medium'} priority maintenance request.`,
            type: 'maintenance', referenceId: request._id
        });

        res.status(201).json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/maintenance
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

// -------- DIRECT ACTIONS (For pending_approval) --------

// PUT /api/maintenance/:id/edit - Tenant edits a pending request directly
const editMaintenanceDirectly = async (req, res) => {
    try {
        const maint = await Maintenance.findOne({ _id: req.params.id, tenant: req.user.id, status: 'pending_approval' });
        if (!maint) return res.status(404).json({ message: 'Only pending requests can be edited directly' });

        const { title, description, priority, keepOldImages } = req.body;
        if (title) maint.title = title;
        if (description) maint.description = description;
        if (priority) maint.priority = priority;

        if (req.files && req.files.length > 0) {
            maint.images = req.files.map(f => `/uploads/${f.filename}`);
        } else if (keepOldImages === 'false') {
            maint.images = [];
        }

        if (maint.images.length === 0) return res.status(400).json({ message: 'At least one photo is required.' });

        await maint.save();
        res.json(maint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/maintenance/:id/delete - Tenant deletes a pending request directly
const deleteMaintenanceDirectly = async (req, res) => {
    try {
        const maint = await Maintenance.findOneAndDelete({ _id: req.params.id, tenant: req.user.id, status: 'pending_approval' });
        if (!maint) return res.status(404).json({ message: 'Only pending requests can be deleted directly' });

        await Notification.findOneAndDelete({ type: 'maintenance', referenceId: maint._id });
        res.json({ message: 'Maintenance request removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// -------- REQUEST WORKFLOWS (For approved/in_progress) --------

// POST /api/maintenance/:id/request-edit
const requestEditMaintenance = async (req, res) => {
    try {
        const maint = await Maintenance.findOne({ _id: req.params.id, tenant: req.user.id, status: { $in: ['approved', 'in_progress'] } });
        if (!maint) return res.status(404).json({ message: 'Maintenance request not found or not eligible for edit request' });

        const { title, description, priority, keepOldImages } = req.body;

        let images = maint.images;
        if (req.files && req.files.length > 0) {
            images = req.files.map(f => `/uploads/${f.filename}`);
        } else if (keepOldImages === 'false') {
            images = [];
        }

        maint.editRequest = {
            title: title || maint.title,
            description: description || maint.description,
            priority: priority || maint.priority,
            images,
            status: 'pending'
        };
        await maint.save();

        await Notification.create({
            user: maint.owner, title: 'Maintenance Edit Requested',
            content: `A tenant requested to edit a maintenance request.`,
            type: 'maintenance', referenceId: maint._id
        });

        res.json(maint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/maintenance/:id/request-delete
const requestDeleteMaintenance = async (req, res) => {
    try {
        const maint = await Maintenance.findOne({ _id: req.params.id, tenant: req.user.id, status: { $in: ['approved', 'in_progress'] } });
        if (!maint) return res.status(404).json({ message: 'Maintenance request not found or not eligible for cancellation request' });

        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Cancellation reason is required' });

        maint.deleteRequest = { reason, status: 'pending' };
        await maint.save();

        await Notification.create({
            user: maint.owner, title: 'Maintenance Cancellation Requested',
            content: `A tenant requested to cancel a maintenance request.`,
            type: 'maintenance', referenceId: maint._id
        });

        res.json(maint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// -------- OWNER APPROVAL --------

// PATCH /api/maintenance/:id/approve-edit
const approveEditRequest = async (req, res) => {
    try {
        const { action, reason } = req.body;
        const maint = await Maintenance.findOne({ _id: req.params.id, owner: req.user.id });
        if (!maint || !maint.editRequest) return res.status(404).json({ message: 'No edit request found' });

        if (action === 'approve') {
            maint.title = maint.editRequest.title;
            maint.description = maint.editRequest.description;
            maint.priority = maint.editRequest.priority;
            maint.images = maint.editRequest.images;
            maint.editRequest = undefined;
        } else {
            maint.editRequest.status = 'rejected';
            maint.editRequest.rejectionReason = reason || 'No reason provided';
        }

        await maint.save();

        await Notification.create({
            user: maint.tenant, title: `Maintenance Edit ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            content: `Your maintenance edit request was ${action === 'approve' ? 'approved' : 'rejected'}.`,
            type: 'maintenance', referenceId: maint._id
        });

        res.json(maint);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/maintenance/:id/approve-delete
const approveDeleteRequest = async (req, res) => {
    try {
        const { action, reason } = req.body;
        const maint = await Maintenance.findOne({ _id: req.params.id, owner: req.user.id });
        if (!maint || !maint.deleteRequest) return res.status(404).json({ message: 'No cancellation request found' });

        if (action === 'approve') {
            maint.status = 'cancelled';
            maint.deleteRequest = undefined;
        } else {
            maint.deleteRequest.status = 'rejected';
            maint.deleteRequest.rejectionReason = reason || 'No reason provided';
        }

        await maint.save();

        await Notification.create({
            user: maint.tenant, title: `Maintenance Cancel ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            content: `Your maintenance cancellation request was ${action === 'approve' ? 'approved' : 'rejected'}.`,
            type: 'maintenance', referenceId: maint._id
        });

        res.json({ message: 'Processed', maint });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/maintenance/:id/approve - (Original creation approval)
const approveMaintenanceRequest = async (req, res) => {
    try {
        const { action, rejectionReason, newStatus } = req.body;
        const maint = await Maintenance.findOne({ _id: req.params.id, owner: req.user.id });
        if (!maint) return res.status(404).json({ message: 'Request not found' });

        if (action === 'approve') {
            if (maint.status === 'pending_approval') {
                maint.status = newStatus || 'approved';
            } else if (['approved', 'in_progress'].includes(maint.status) && newStatus) {
                maint.status = newStatus;
            }
        } else {
            maint.status = 'rejected';
            if (rejectionReason) maint.rejectionReason = rejectionReason;
        }

        await maint.save();

        let actionWord = action === 'approve' ? 'processed' : 'rejected';
        if (newStatus) actionWord = `marked as ${newStatus}`;

        await Notification.create({
            user: maint.tenant, title: `Maintenance Request ${actionWord}`,
            content: `Your maintenance request was updated.`,
            type: 'maintenance', referenceId: maint._id
        });

        res.json({ message: 'Processed', maint });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/maintenance/:id/owner-cancel
const ownerCancelMaintenance = async (req, res) => {
    try {
        const { reason } = req.body;
        const maint = await Maintenance.findOne({ _id: req.params.id, owner: req.user.id });
        if (!maint) return res.status(404).json({ message: 'Request not found' });

        maint.status = 'cancelled';
        if (reason) maint.rejectionReason = reason;
        await maint.save();

        await Notification.create({
            user: maint.tenant, title: `Maintenance Cancelled by Owner`,
            content: `Your maintenance request was cancelled. Reason: ${reason || 'Not specified'}`,
            type: 'maintenance', referenceId: maint._id
        });

        res.json({ message: 'Cancelled', maint });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createMaintenanceRequest,
    getMaintenanceRequests,
    getMaintenanceRequestById,
    editMaintenanceDirectly,
    deleteMaintenanceDirectly,
    requestEditMaintenance,
    requestDeleteMaintenance,
    approveEditRequest,
    approveDeleteRequest,
    approveMaintenanceRequest,
    ownerCancelMaintenance
};
