const Appointment = require('../models/Appointment');
const Property = require('../models/Property');
const Notification = require('../models/Notification');

// POST /api/appointments – tenant creates
const createAppointment = async (req, res) => {
    try {
        const { property, date, time, location } = req.body;
        if (!property || !date || !time || !location) return res.status(400).json({ message: 'Property, date, time and location required' });

        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        const existingAppt = await Appointment.findOne({
            property,
            tenant: req.user.id,
            status: { $in: ['pending', 'accepted', 'change_requested'] }
        });
        if (existingAppt) return res.status(400).json({ message: 'You already have an active appointment for this property.' });

        const nicFront = req.files?.nicFront?.[0] ? `/uploads/${req.files.nicFront[0].filename}` : null;
        const nicBack = req.files?.nicBack?.[0] ? `/uploads/${req.files.nicBack[0].filename}` : null;

        if (!nicFront || !nicBack) return res.status(400).json({ message: 'Both NIC front and back photos are required' });

        const appt = await Appointment.create({
            property, tenant: req.user.id, owner: prop.owner,
            date: new Date(date), time, location, nicFront, nicBack,
        });

        await Notification.create({
            user: prop.owner,
            type: 'appointment',
            title: 'New Appointment',
            content: 'A tenant has requested a new appointment view.',
            referenceId: appt._id
        });

        res.status(201).json(appt);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/appointments – get mine (role-based)
const getAppointments = async (req, res) => {
    try {
        const filter = req.user.role === 'owner' ? { owner: req.user.id } : { tenant: req.user.id };
        const appointments = await Appointment.find(filter)
            .populate('property', 'title address city images')
            .populate('tenant', 'name email phone avatar')
            .populate('owner', 'name email phone')
            .sort('-createdAt');
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/appointments/:id
const getAppointmentById = async (req, res) => {
    try {
        const appt = await Appointment.findById(req.params.id)
            .populate('property', 'title address city images')
            .populate('tenant', 'name email phone avatar')
            .populate('owner', 'name email phone');
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        res.json(appt);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/appointments/:id/status – owner accepts/rejects
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

        const appt = await Appointment.findOne({ _id: req.params.id, owner: req.user.id });
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });

        appt.status = status;
        if (status === 'rejected' && rejectionReason) appt.rejectionReason = rejectionReason;
        await appt.save();

        await Notification.create({
            user: appt.tenant,
            type: 'appointment',
            title: `Appointment ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
            content: `Your appointment request was ${status} by the owner.`,
            referenceId: appt._id
        });

        res.json(appt);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/appointments/:id/change-request – tenant requests change
const requestAppointmentChange = async (req, res) => {
    try {
        const { date, time, location } = req.body;
        const appt = await Appointment.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });

        appt.changeRequest = { date: new Date(date), time, location, status: 'pending' };
        appt.status = 'change_requested';
        await appt.save();

        await Notification.create({
            user: appt.owner,
            type: 'appointment',
            title: 'Appointment Modification',
            content: 'A tenant requested a modification to an accepted appointment.',
            referenceId: appt._id
        });

        res.json(appt);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/appointments/:id/change-request/status – owner accepts/rejects change
const respondToAppointmentChange = async (req, res) => {
    try {
        const { status } = req.body;
        const appt = await Appointment.findOne({ _id: req.params.id, owner: req.user.id });
        if (!appt || !appt.changeRequest) return res.status(404).json({ message: 'Change request not found' });

        if (status === 'accepted') {
            if (appt.changeRequest.isCancellation) {
                appt.status = 'cancelled';
            } else {
                appt.date = appt.changeRequest.date;
                appt.time = appt.changeRequest.time;
                appt.location = appt.changeRequest.location;
                appt.status = 'accepted';
            }
        } else {
            appt.status = 'accepted'; // revert to accepted
        }
        appt.changeRequest.status = status;
        await appt.save();

        await Notification.create({
            user: appt.tenant,
            type: 'appointment',
            title: 'Appointment Modification Update',
            content: `Your appointment modification request was ${status}.`,
            referenceId: appt._id
        });

        res.json(appt);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteAppointment = async (req, res) => {
    try {
        const appt = await Appointment.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status !== 'pending') return res.status(400).json({ message: 'Only pending appointments can be deleted' });
        await appt.deleteOne();
        res.json({ message: 'Appointment deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const requestAppointmentCancellation = async (req, res) => {
    try {
        const appt = await Appointment.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status !== 'accepted') return res.status(400).json({ message: 'Only accepted appointments can be cancelled' });
        const reason = req.body?.reason || '';
        appt.changeRequest = { status: 'pending', isCancellation: true, cancellationReason: reason };
        appt.status = 'change_requested';
        await appt.save();

        await Notification.create({
            user: appt.owner,
            type: 'appointment',
            title: 'Cancellation Requested',
            content: 'A tenant requested to cancel an appointment.',
            referenceId: appt._id
        });

        res.json(appt);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const editAppointmentDirectly = async (req, res) => {
    try {
        const { date, time, location } = req.body;
        const appt = await Appointment.findOne({ _id: req.params.id, tenant: req.user.id });
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status !== 'pending') return res.status(400).json({ message: 'Only pending appointments can be edited directly' });

        appt.date = new Date(date);
        appt.time = time;
        appt.location = location;
        await appt.save();

        await Notification.create({
            user: appt.owner,
            type: 'appointment',
            title: 'Appointment Updated',
            content: 'A tenant updated a pending appointment request.',
            referenceId: appt._id
        });
        res.json(appt);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const ownerCancelAppointment = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Cancellation reason is required' });

        const appt = await Appointment.findOne({ _id: req.params.id, owner: req.user.id });
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status !== 'accepted') return res.status(400).json({ message: 'Only accepted appointments can be cancelled' });

        appt.status = 'cancelled';
        appt.cancellationReason = reason;
        await appt.save();

        await Notification.create({
            user: appt.tenant,
            type: 'appointment',
            title: 'Appointment Cancelled',
            content: `The owner cancelled your accepted appointment. Reason: ${reason}`,
            referenceId: appt._id
        });
        res.json(appt);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    requestAppointmentChange,
    respondToAppointmentChange,
    deleteAppointment,
    requestAppointmentCancellation,
    editAppointmentDirectly,
    ownerCancelAppointment
};
