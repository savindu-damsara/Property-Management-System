const Bill = require('../models/Bill');
const Property = require('../models/Property');
const Lease = require('../models/Lease');
const Notification = require('../models/Notification');

// ─── Helpers ────────────────────────────────────────────────────────────────

// Build monthly schedule for a lease.
// Includes ALL calendar months from lease.startDate month up to and including the CURRENT month,
// regardless of rentDueDay. The first month is always included immediately on lease approval.
// rentDueDay is shown as an informational deadline, not a schedule gate.
function buildMonthlySchedule(lease) {
    const schedule = [];
    if (!lease) return schedule;

    const dueDay = lease.rentDueDay || 1;
    const start = new Date(lease.startDate);
    const now = new Date();

    let year = start.getFullYear();
    let month = start.getMonth(); // 0-indexed

    while (true) {
        // Stop if this month is in the future (beyond current calendar month)
        if (year > now.getFullYear() ||
            (year === now.getFullYear() && month > now.getMonth())) break;

        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        // Cap due day to last day of month (e.g. Feb 28)
        const lastDay = new Date(year, month + 1, 0).getDate();
        const effectiveDueDay = Math.min(dueDay, lastDay);
        const dueDate = new Date(year, month, effectiveDueDay);
        const label = new Date(year, month, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        schedule.push({ month: monthStr, label, dueDate });

        month++;
        if (month > 11) { month = 0; year++; }
        if (year > now.getFullYear() + 10) break; // safety cap
    }
    return schedule;
}

// ─── POST /api/bills – tenant submits a payment ─────────────────────────────
const createBill = async (req, res) => {
    try {
        const { property, title, description, amount, paidDate, billType, rentMonth } = req.body;
        if (!property || !title || !amount || !paidDate) {
            return res.status(400).json({ message: 'Property, title, amount and paid date are required' });
        }
        if (billType === 'rent' && !rentMonth) {
            return res.status(400).json({ message: 'Please select which month this rent payment is for.' });
        }

        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        // Sum-based duplication check for rent to allow partial payments
        let propRentAmount = 0;
        if (billType === 'rent' && rentMonth) {
            const activeLease = await Lease.findOne({ property, tenant: req.user.id, status: 'active' });
            propRentAmount = activeLease ? activeLease.rentAmount : 0;

            const existingBills = await Bill.find({
                property, tenant: req.user.id, billType: 'rent', rentMonth,
                status: { $in: ['pending_approval', 'approved'] },
            });
            const sumExisting = existingBills.reduce((acc, b) => acc + b.amount, 0);
            if (sumExisting >= propRentAmount && propRentAmount > 0) {
                return res.status(400).json({ message: `Full rent for ${rentMonth} has already been paid or is pending.` });
            }
        }

        const document = req.file ? `/uploads/${req.file.filename}` : null;
        const bill = await Bill.create({
            property, tenant: req.user.id, owner: prop.owner,
            title, description, amount: Number(amount),
            paidDate: new Date(paidDate),
            rentMonth: billType === 'rent' ? rentMonth : undefined,
            document, billType: billType || 'rent',
        });

        await Notification.create({
            user: prop.owner, title: 'New Payment Submitted',
            content: `A tenant submitted a ${billType || 'rent'} payment${rentMonth ? ` for ${rentMonth}` : ''}.`,
            type: 'bill', referenceId: bill._id,
        });

        res.status(201).json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── GET /api/bills ──────────────────────────────────────────────────────────
const getBills = async (req, res) => {
    try {
        const filter = req.user.role === 'owner' ? { owner: req.user.id } : { tenant: req.user.id };
        if (req.query.property) filter.property = req.query.property;

        const bills = await Bill.find(filter)
            .populate('property', 'title address city rentPerMonth')
            .populate('tenant', 'name email phone')
            .populate('owner', 'name email')
            .sort('-createdAt');

        // Stats — totalPaid = ALL approved bill types
        const totalPaid = bills.filter(b => b.status === 'approved').reduce((s, b) => s + b.amount, 0);
        const totalPending = bills.filter(b => b.status === 'pending_approval').reduce((s, b) => s + b.amount, 0);

        // Monthly rent schedule (tenant + property-scoped)
        let remainingRent = 0;
        let monthlySchedule = [];

        if (req.user.role === 'tenant' && req.query.property) {
            const activeLease = await Lease.findOne({
                property: req.query.property, tenant: req.user.id, status: 'active',
            });

            if (activeLease) {
                const schedule = buildMonthlySchedule(activeLease);
                const approvedRentBills = bills.filter(b => b.status === 'approved' && b.billType === 'rent');

                // Build monthlySchedule with per-month sum logic to handle partial payments
                monthlySchedule = schedule.map(entry => {
                    const monthBills = bills.filter(b => b.billType === 'rent' && b.rentMonth === entry.month);
                    const approvedSum = monthBills.filter(b => b.status === 'approved').reduce((s, b) => s + b.amount, 0);
                    const pendingSum = monthBills.filter(b => b.status === 'pending_approval').reduce((s, b) => s + b.amount, 0);

                    let status = 'unpaid';
                    if (approvedSum >= activeLease.rentAmount) status = 'paid';
                    else if (approvedSum > 0) status = 'partial';
                    else if (pendingSum > 0) status = 'pending';

                    // pass along how much has been paid/pending for the UI if needed
                    return { ...entry, status, paidAmount: approvedSum, pendingAmount: pendingSum };
                });

                // Remaining = (owed months * rent) - total approved rent amount
                const owedAmount = schedule.length * activeLease.rentAmount;
                const totalRentPaid = approvedRentBills.reduce((s, b) => s + b.amount, 0);
                remainingRent = Math.max(0, owedAmount - totalRentPaid);
            }
        }

        res.json({ bills, stats: { totalPaid, totalPending, remainingRent }, monthlySchedule });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── GET /api/bills/:id ───────────────────────────────────────────────────────
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

// ─── PATCH /api/bills/:id/approve – owner approves or rejects ────────────────
const approveBill = async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        const bill = await Bill.findOne({ _id: req.params.id, owner: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        bill.status = action === 'approve' ? 'approved' : 'rejected';
        if (action === 'reject' && rejectionReason) bill.rejectionReason = rejectionReason;
        await bill.save();

        await Notification.create({
            user: bill.tenant,
            title: `Payment ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            content: `Your ${bill.billType} payment was ${action === 'approve' ? 'approved' : 'rejected'} by the owner.`,
            type: 'bill', referenceId: bill._id,
        });

        res.json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── PATCH /api/bills/:id – tenant edits a pending_approval bill ─────────────
const editBill = async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        if (bill.status !== 'pending_approval') {
            return res.status(400).json({ message: 'Only pending bills can be edited directly. Use request-edit for approved bills.' });
        }

        const { title, description, amount, paidDate, billType, rentMonth } = req.body;
        if (title) bill.title = title;
        if (description !== undefined) bill.description = description;
        if (amount) bill.amount = Number(amount);
        if (paidDate) bill.paidDate = new Date(paidDate);
        if (billType) bill.billType = billType;
        if (rentMonth !== undefined) bill.rentMonth = billType === 'rent' ? rentMonth : undefined;
        if (req.file) bill.document = `/uploads/${req.file.filename}`;

        await bill.save();
        res.json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── DELETE /api/bills/:id – tenant deletes a pending_approval bill ──────────
const deleteBill = async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        if (bill.status !== 'pending_approval') {
            return res.status(400).json({ message: 'Only pending bills can be deleted directly. Use request-delete for approved bills.' });
        }
        await Bill.findByIdAndDelete(req.params.id);
        res.json({ message: 'Bill deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── PATCH /api/bills/:id/request-edit – tenant requests edit of approved bill
const requestEditBill = async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        if (bill.status !== 'approved') {
            return res.status(400).json({ message: 'Edit requests are only for approved bills.' });
        }
        if (bill.editRequest?.status === 'pending') {
            return res.status(400).json({ message: 'An edit request is already pending.' });
        }

        const { title, description, amount, paidDate, rentMonth } = req.body;
        bill.editRequest = {
            title: title || bill.title,
            description: description !== undefined ? description : bill.description,
            amount: amount ? Number(amount) : bill.amount,
            paidDate: paidDate ? new Date(paidDate) : bill.paidDate,
            rentMonth: rentMonth || bill.rentMonth,
            document: req.file ? `/uploads/${req.file.filename}` : bill.document,
            status: 'pending',
        };
        await bill.save();

        await Notification.create({
            user: bill.owner, title: 'Payment Edit Requested',
            content: `A tenant requested to edit an approved ${bill.billType} payment.`,
            type: 'bill', referenceId: bill._id,
        });

        res.json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── PATCH /api/bills/:id/request-delete – tenant requests deletion ───────────
const requestDeleteBill = async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        if (bill.status !== 'approved') {
            return res.status(400).json({ message: 'Delete requests are only for approved bills.' });
        }
        if (bill.deleteRequest?.status === 'pending') {
            return res.status(400).json({ message: 'A delete request is already pending.' });
        }

        bill.deleteRequest = { reason: req.body.reason || '', status: 'pending' };
        await bill.save();

        await Notification.create({
            user: bill.owner, title: 'Payment Deletion Requested',
            content: `A tenant requested to delete an approved ${bill.billType} payment.`,
            type: 'bill', referenceId: bill._id,
        });

        res.json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── PATCH /api/bills/:id/approve-edit – owner approves/rejects edit request ─
const approveEditRequest = async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        const bill = await Bill.findOne({ _id: req.params.id, owner: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        if (!bill.editRequest || bill.editRequest.status !== 'pending') {
            return res.status(400).json({ message: 'No pending edit request.' });
        }

        if (action === 'approve') {
            // Apply the pending edits
            bill.title = bill.editRequest.title || bill.title;
            bill.description = bill.editRequest.description;
            bill.amount = bill.editRequest.amount || bill.amount;
            bill.paidDate = bill.editRequest.paidDate || bill.paidDate;
            bill.rentMonth = bill.editRequest.rentMonth || bill.rentMonth;
            if (bill.editRequest.document) bill.document = bill.editRequest.document;
            bill.editRequest.status = 'approved';
        } else {
            bill.editRequest.status = 'rejected';
            if (rejectionReason) bill.editRequest.rejectionReason = rejectionReason;
        }
        await bill.save();

        await Notification.create({
            user: bill.tenant,
            title: `Edit Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            content: `Your payment edit request was ${action === 'approve' ? 'approved' : 'rejected'}.`,
            type: 'bill', referenceId: bill._id,
        });

        res.json(bill);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── PATCH /api/bills/:id/approve-delete – owner approves/rejects delete request
const approveDeleteRequest = async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        const bill = await Bill.findOne({ _id: req.params.id, owner: req.user.id });
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        if (!bill.deleteRequest || bill.deleteRequest.status !== 'pending') {
            return res.status(400).json({ message: 'No pending delete request.' });
        }

        if (action === 'approve') {
            await Bill.findByIdAndDelete(bill._id);
            await Notification.create({
                user: bill.tenant, title: 'Payment Deletion Approved',
                content: 'Your payment deletion request was approved and the record has been removed.',
                type: 'bill', referenceId: bill._id,
            });
            return res.json({ message: 'Bill deleted after approval.' });
        } else {
            bill.deleteRequest.status = 'rejected';
            if (rejectionReason) bill.deleteRequest.rejectionReason = rejectionReason;
            await bill.save();

            await Notification.create({
                user: bill.tenant, title: 'Payment Deletion Rejected',
                content: 'Your payment deletion request was rejected by the owner.',
                type: 'bill', referenceId: bill._id,
            });
            return res.json(bill);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createBill, getBills, getBillById, approveBill,
    editBill, deleteBill,
    requestEditBill, requestDeleteBill,
    approveEditRequest, approveDeleteRequest,
};
