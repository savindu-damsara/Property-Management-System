const Lease = require('../models/Lease');
const Property = require('../models/Property');

// POST /api/leases – create (pending_approval)
const createLease = async (req, res) => {
    try {
        const { property, tenant, startDate, endDate, rentAmount, terms } = req.body;
        if (!property || !tenant || !startDate || !endDate || !rentAmount) {
            return res.status(400).json({ message: 'Property, tenant, dates and rent amount are required' });
        }
        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        const document = req.file ? `/uploads/${req.file.filename}` : null;
        const lease = await Lease.create({
            property, tenant, owner: prop.owner,
            startDate: new Date(startDate), endDate: new Date(endDate),
            rentAmount: Number(rentAmount), terms, document,
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

        const { startDate, endDate, rentAmount, terms } = req.body;
        const document = req.file ? `/uploads/${req.file.filename}` : lease.document;
        lease.pendingUpdate = {
            startDate: startDate ? new Date(startDate) : lease.startDate,
            endDate: endDate ? new Date(endDate) : lease.endDate,
            rentAmount: rentAmount ? Number(rentAmount) : lease.rentAmount,
            terms: terms || lease.terms,
            document,
        };
        lease.status = 'pending_update';
        await lease.save();
        res.json(lease);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/leases/:id – request termination
const requestLeaseTermination = async (req, res) => {
    try {
        const lease = await Lease.findById(req.params.id);
        if (!lease) return res.status(404).json({ message: 'Lease not found' });
        lease.status = 'pending_termination';
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
    approveLeaseAction
};
