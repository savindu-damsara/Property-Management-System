const Bill = require('../models/Bill');
const Property = require('../models/Property');
const Lease = require('../models/Lease');

// POST /api/bills – tenant uploads a bill
const createBill = async (req, res) => {
    try {
        const { property, title, description, amount, paidDate, billType } = req.body;
        if (!property || !title || !amount || !paidDate) return res.status(400).json({ message: 'Property, title, amount and paid date are required' });

        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        const document = req.file ? `/uploads/${req.file.filename}` : null;
        const bill = await Bill.create({
            property, tenant: req.user.id, owner: prop.owner,
            title, description, amount: Number(amount),
            paidDate: new Date(paidDate), document, billType: billType || 'rent',
        });
        res.status(201).json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/bills – get mine with stats
const getBills = async (req, res) => {
    try {
        const filter = req.user.role === 'owner' ? { owner: req.user.id } : { tenant: req.user.id };
        if (req.query.property) filter.property = req.query.property;

        const bills = await Bill.find(filter)
            .populate('property', 'title address city rentPerMonth')
            .populate('tenant', 'name email phone')
            .populate('owner', 'name email')
            .sort('-createdAt');

        // Stats
        const totalPaid = bills.filter(b => b.status === 'approved').reduce((s, b) => s + b.amount, 0);
        const totalPending = bills.filter(b => b.status === 'pending_approval').reduce((s, b) => s + b.amount, 0);

        // Calculate remaining rent (active lease rent - approved bills this month)
        let remainingRent = 0;
        if (req.user.role === 'tenant' && req.query.property) {
            const activeLease = await Lease.findOne({ property: req.query.property, tenant: req.user.id, status: 'active' });
            if (activeLease) {
                const now = new Date();
                const thisMonthApproved = bills.filter(b => {
                    const d = new Date(b.paidDate);
                    return b.status === 'approved' && b.billType === 'rent'
                        && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).reduce((s, b) => s + b.amount, 0);
                remainingRent = Math.max(0, activeLease.rentAmount - thisMonthApproved);
            }
        }

        res.json({ bills, stats: { totalPaid, totalPending, remainingRent } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/bills/:id
const getBillById = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id)
            .populate('property', 'title address city')
            .populate('tenant', 'name email phone')
            .populate('owner', 'name email');
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        res.json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/bills/:id/approve – owner approves or rejects
const approveBill = async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        const bill = await Bill.findOne({ _id: req.params.id, owner: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        bill.status = action === 'approve' ? 'approved' : 'rejected';
        if (action === 'reject' && rejectionReason) bill.rejectionReason = rejectionReason;
        await bill.save();
        res.json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createBill,
    getBills,
    getBillById,
    approveBill
};
