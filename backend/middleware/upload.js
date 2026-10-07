const multer = require('multer');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // Up to 100MB
  fileFilter: (req, file, cb) => {
    const ok =
      /^(image|video|audio|application|text)\//.test(file.mimetype) ||
      /\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Unsupported file type'), !!ok);
  },
});
