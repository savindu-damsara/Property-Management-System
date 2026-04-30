const Notice = require('../models/Notice');

// POST /api/notices – owner creates
const createNotice = async (req, res) => {
    try {
        const { title, content, property } = req.body;
        if (!title || !content) return res.status(400).json({ message: 'Title and content required' });

        const attachment = req.file ? `/uploads/${req.file.filename}` : null;
        const notice = await Notice.create({ owner: req.user.id, property: property || null, title, content, attachment });
        res.status(201).json(notice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



