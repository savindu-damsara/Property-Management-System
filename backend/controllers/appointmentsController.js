const Appointment = require('../models/Appointment');
const Property = require('../models/Property');

// POST /api/appointments – tenant creates
const createAppointment = async (req, res) => {
    try {
        const { property, date, time, location } = req.body;
        if (!property || !date || !time || !location) return res.status(400).json({ message: 'Property, date, time and location required' });

        const prop = await Property.findById(property);
        if (!prop) return res.status(404).json({ message: 'Property not found' });

        const receipt = req.file ? `/uploads/${req.file.filename}` : null;
        const appt = await Appointment.create({
            property, tenant: req.user.id, owner: prop.owner,
            date: new Date(date), time, location, receipt,
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
            appt.date = appt.changeRequest.date;
            appt.time = appt.changeRequest.time;
            appt.location = appt.changeRequest.location;
            appt.status = 'accepted';
        } else {
            appt.status = 'accepted'; // revert to accepted
        }
        appt.changeRequest.status = status;
        await appt.save();
        res.json(appt);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    requestAppointmentChange,
    respondToAppointmentChange
};
