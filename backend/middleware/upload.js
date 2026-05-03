const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const cleanName = (file.originalname || 'file').replace(/\s+/g, '-');
        cb(null, `${unique}-${cleanName}`);
    },
});

// General (Images + PDF) (10MB Limit)
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, true)
});

// Images only (50MB Limit)
const uploadImages = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, true)
});

// Docs (Images + PDF) (50MB Limit)
const uploadDocs = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, true)
});

// PDF only (50MB Limit)
const uploadPdf = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, true)
});

module.exports = { upload, uploadImages, uploadDocs, uploadPdf };
