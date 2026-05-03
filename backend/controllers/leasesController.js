const Lease = require('../models/Lease');
const Property = require('../models/Property');
const Notification = require('../models/Notification');

// POST /api/leases – create (pending_approval)
const createLease = async (req, res) => {
    try {
        const { property, startDate, endDate, rentAmount, terms, rentDueDay } = req.body;
        if (!property || !startDate || !endDate || !rentAmount) {
            return res.status(400).json({ message: 'Property, dates and rent amount are required' });
        }
        if (!rentDueDay || rentDueDay < 1 || rentDueDay > 28) {
            return res.status(400).json({ message: 'Rent due day is required (1–28).' });
        }

        // Block if the tenant already has an active lease
        const existingActive = await Lease.findOne({ tenant: req.user.id, status: 'active' });
        if (existingActive) {
            return res.status(400).json({
                message: 'You already have an active lease agreement. Please terminate your current lease before requesting a new one.',
            });
        }

        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        const documents = req.files && req.files.length > 0 ? req.files.map(f => `/uploads/${f.filename}`) : [];
        const lease = await Lease.create({
            property, tenant: req.user.id, owner: prop.owner,
            startDate: new Date(startDate), endDate: new Date(endDate),
            rentAmount: Number(rentAmount),
            rentDueDay: Math.min(28, Math.max(1, Number(rentDueDay))),
            terms, documents,
            status: 'pending_approval',
        });
        res.status(201).json(lease);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/leases – get mine
const getLeases = async (req, res) => {
    try {
        const filter = req.user.role === 'owner' ? { owner: req.user.id } : { tenant: req.user.id };
        const leases = await Lease.find(filter)
            .populate('property', 'title address city images')
            .populate('tenant', 'name email phone')
            .populate('owner', 'name email phone')
            .sort('-createdAt');
        res.json(leases);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/leases/:id
const getLeaseById = async (req, res) => {
    try {
        const lease = await Lease.findById(req.params.id)
            .populate('property', 'title address city images rentPerMonth')
            .populate('tenant', 'name email phone')
            .populate('owner', 'name email phone');
        if (!lease) return res.status(404).json({ message: 'Lease not found' });
        res.json(lease);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/leases/:id – request update (pending_update)
const requestLeaseUpdate = async (req, res) => {
    try {
        const lease = await Lease.findById(req.params.id);
        if (!lease) return res.status(404).json({ message: 'Lease not found' });

        const { startDate, endDate, rentAmount, terms, rentDueDay } = req.body;
        const documents = req.files && req.files.length > 0 ? req.files.map(f => `/uploads/${f.filename}`) : lease.documents;
        lease.pendingUpdate = {
            startDate: startDate ? new Date(startDate) : lease.startDate,
            endDate: endDate ? new Date(endDate) : lease.endDate,
            rentAmount: rentAmount ? Number(rentAmount) : lease.rentAmount,
            rentDueDay: rentDueDay ? Number(rentDueDay) : lease.rentDueDay,
            terms: terms || lease.terms,
            documents,
        };
        lease.status = 'pending_update';
        await lease.save();
        res.json(lease);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/leases/:id/terminate-request – tenant requests termination
const requestLeaseTermination = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Termination reason is required.' });

        const lease = await Lease.findById(req.params.id);
        if (!lease) return res.status(404).json({ message: 'Lease not found' });

        lease.status = 'pending_termination';
        lease.terminationReason = reason;
        await lease.save();
        res.json({ message: 'Termination request sent to owner', lease });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/leases/:id/approve – owner approves or rejects any pending operation
const approveLeaseAction = async (req, res) => {
    try {
        const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
        const lease = await Lease.findOne({ _id: req.params.id, owner: req.user.id });
        if (!lease) return res.status(404).json({ message: 'Lease not found' });

        if (action === 'approve') {
            if (lease.status === 'pending_approval') {
                lease.status = 'active';
            } else if (lease.status === 'pending_update' && lease.pendingUpdate) {
                Object.assign(lease, lease.pendingUpdate);
                lease.pendingUpdate = undefined;
                lease.status = 'active';
            } else if (lease.status === 'pending_termination') {
                lease.status = 'terminated';
            }
        } else {
            lease.status = lease.status === 'pending_approval' ? 'rejected'
                : lease.status === 'pending_update' ? 'active' : 'active';
            if (rejectionReason) lease.rejectionReason = rejectionReason;
            lease.pendingUpdate = undefined;
        }

        await lease.save();

        // If a new lease just became active, auto-cancel all other pending_approval leases for this tenant
        if (action === 'approve' && lease.status === 'active') {
            await Lease.updateMany(
                {
                    _id: { $ne: lease._id },
                    tenant: lease.tenant,
                    status: 'pending_approval',
                },
                {
                    $set: {
                        status: 'cancelled',
                        cancellationReason: 'Change of mind',
                        tenantCancellationReason: 'Cancelled — you accepted another lease agreement.',
                    },
                }
            );
        }

        // Send notification to tenant
        let notifTitle = '';
        let notifContent = '';
        if (action === 'approve') {
            if (lease.status === 'active') {
                notifTitle = 'Lease Approved';
                notifContent = `Your lease has been approved. Agreed rent: LKR ${lease.rentAmount.toLocaleString()}/month. You can now submit payments in the Billing section.`;
            } else if (lease.status === 'terminated') {
                notifTitle = 'Lease Termination Approved';
                notifContent = 'Your lease termination request has been approved by the owner.';
            }
        } else {
            notifTitle = 'Lease Request Update';
            notifContent = 'Your lease request was reviewed by the owner. Please check the Leases section for details.';
        }
        if (notifTitle) {
            await Notification.create({ user: lease.tenant, title: notifTitle, content: notifContent, type: 'lease', referenceId: lease._id });
        }

        // Enforce Property Visibility based on status flag!
        if (lease.status === 'active') {
            await Property.findByIdAndUpdate(lease.property, { isAvailable: false });
        } else if (['terminated', 'rejected'].includes(lease.status)) {
            // Before making it available again, guarantee no other active leases are running for it
            const otherActive = await Lease.findOne({ property: lease.property, status: 'active' });
            if (!otherActive) {
                await Property.findByIdAndUpdate(lease.property, { isAvailable: true });
            }
        }

        res.json(lease);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/leases/:id/owner-terminate - owner actively kills lease
const ownerTerminateLease = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Termination reason is required.' });

        const lease = await Lease.findOne({ _id: req.params.id, owner: req.user.id });
        if (!lease) return res.status(404).json({ message: 'Lease not found' });

        lease.status = 'terminated';
        lease.terminationReason = reason;
        await lease.save();

        const otherActive = await Lease.findOne({ property: lease.property, status: 'active' });
        if (!otherActive) {
            await Property.findByIdAndUpdate(lease.property, { isAvailable: true });
        }

        res.json({ message: 'Lease formally terminated', lease });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/leases/:id - Delete an unapproved lease
const deleteLeaseDirectly = async (req, res) => {
    try {
        const lease = await Lease.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!lease) return res.status(404).json({ message: 'Lease not found' });
        if (lease.status !== 'pending_approval' && lease.status !== 'rejected') {
            return res.status(400).json({ message: 'Only pending or rejected leases can be deleted directly.' });
        }
        await Lease.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lease request successfully deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/leases/:id/edit - Tenant edits a pending lease directly
const editLeaseDirectly = async (req, res) => {
    try {
        const lease = await Lease.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!lease) return res.status(404).json({ message: 'Lease not found' });
        if (lease.status !== 'pending_approval') {
            return res.status(400).json({ message: 'Only unapproved leases can be edited directly.' });
        }

        const { startDate, endDate, rentAmount, terms, rentDueDay } = req.body;

        // Build final documents list: surviving existing + newly uploaded
        let existingKept = [];
        if (req.body.existingDocuments) {
            existingKept = Array.isArray(req.body.existingDocuments)
                ? req.body.existingDocuments
                : [req.body.existingDocuments];
        }
        const newUploads = req.files && req.files.length > 0 ? req.files.map(f => `/uploads/${f.filename}`) : [];
        const documents = [...existingKept, ...newUploads];

        if (startDate) lease.startDate = new Date(startDate);
        if (endDate) lease.endDate = new Date(endDate);
        if (rentAmount) lease.rentAmount = Number(rentAmount);
        if (rentDueDay) lease.rentDueDay = Math.min(28, Math.max(1, Number(rentDueDay)));
        if (terms) lease.terms = terms;
        lease.documents = documents;

        await lease.save();
        res.json(lease);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createLease,
    getLeases,
    getLeaseById,
    requestLeaseUpdate,
    requestLeaseTermination,
    approveLeaseAction,
    ownerTerminateLease,
    deleteLeaseDirectly,
    editLeaseDirectly
};
