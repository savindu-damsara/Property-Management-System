const Property = require('../models/Property');

// GET /api/properties – all available (public)
const getProperties = async (req, res) => {
    try {
        const { city, type, minPrice, maxPrice, search } = req.query;
        const filter = { isDeleted: false, isAvailable: true };
        if (city) filter.city = new RegExp(city, 'i');
        if (type) filter.propertyType = type;
        if (minPrice || maxPrice) {
            filter.rentPerMonth = {};
            if (minPrice) filter.rentPerMonth.$gte = Number(minPrice);
            if (maxPrice) filter.rentPerMonth.$lte = Number(maxPrice);
        }
        if (search) filter.$or = [
            { title: new RegExp(search, 'i') },
            { address: new RegExp(search, 'i') },
            { city: new RegExp(search, 'i') },
        ];

        const properties = await Property.find(filter).populate('owner', 'name email phone avatar').sort('-createdAt');
        res.json(properties);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/properties/mine – owner's own properties
const getMyProperties = async (req, res) => {
    try {
        const properties = await Property.find({ owner: req.user.id, isDeleted: false }).sort('-createdAt');
        res.json(properties);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/properties/:id – single property
const getPropertyById = async (req, res) => {
    try {
        const p = await Property.findOne({ _id: req.params.id, isDeleted: false }).populate('owner', 'name email phone avatar');
        if (!p) return res.status(404).json({ message: 'Property not found' });
        res.json(p);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/properties – create (owner only), up to 10 images
const createProperty = async (req, res) => {
    try {
        const { title, description, address, city, propertyType, bedrooms, bathrooms, area, rentPerMonth, amenities } = req.body;
        if (!title || !address || !city || !rentPerMonth) return res.status(400).json({ message: 'Title, address, city and rent are required' });

        const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
        const property = await Property.create({
            owner: req.user.id, title, description, address, city, propertyType,
            bedrooms: Number(bedrooms) || 0, bathrooms: Number(bathrooms) || 0,
            area: Number(area) || 0, rentPerMonth: Number(rentPerMonth),
            images, amenities: amenities ? (Array.isArray(amenities) ? amenities : amenities.split(',').map(a => a.trim())) : [],
        });
        const populated = await property.populate('owner', 'name email phone avatar');
        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/properties/:id – update (owner, own property)
const updateProperty = async (req, res) => {
    try {
        const p = await Property.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
        if (!p) return res.status(404).json({ message: 'Property not found' });

        const fields = ['title', 'description', 'address', 'city', 'propertyType', 'bedrooms', 'bathrooms', 'area', 'rentPerMonth', 'isAvailable'];
        fields.forEach(f => { if (req.body[f] !== undefined) p[f] = req.body[f]; });

        if (req.body.amenities) {
            p.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : req.body.amenities.split(',').map(a => a.trim());
        }
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(f => `/uploads/${f.filename}`);
            // If replaceImages flag set, replace; else append up to 10
            if (req.body.replaceImages === 'true') {
                p.images = newImages;
            } else {
                p.images = [...p.images, ...newImages].slice(0, 10);
            }
        }
        await p.save();
        res.json(p);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/properties/:id – soft delete (owner)
const deleteProperty = async (req, res) => {
    try {
        const p = await Property.findOne({ _id: req.params.id, owner: req.user.id });
        if (!p) return res.status(404).json({ message: 'Property not found' });
        p.isDeleted = true;
        await p.save();
        res.json({ message: 'Property removed from listing' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getProperties,
    getMyProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty
};
