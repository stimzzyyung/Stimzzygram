const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

const useCloud = !!process.env.CLOUDINARY_CLOUD_NAME;
if (useCloud) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/** Uploads a multer memory file. Returns { url, type }. Falls back to local disk if Cloudinary isn't configured. */
exports.uploadFile = (file, req) =>
  new Promise((resolve, reject) => {
    const type = file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('audio') ? 'audio' : 'image';
    if (useCloud) {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'stimzzysgram',
          resource_type: type === 'image' ? 'image' : 'video',
          // Shrink big photos/videos once, at upload time, so every phone downloads less
          transformation: type === 'image'
            ? [{ width: 1080, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
            : [{ width: 720, crop: 'limit', quality: 'auto' }],
        },
        (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, type }))
      );
      return stream.end(file.buffer);
    }
    const ext = path.extname(file.originalname) || '.' + file.mimetype.split('/')[1];
    const name = crypto.randomBytes(12).toString('hex') + ext;
    fs.writeFile(path.join(__dirname, '..', 'uploads', name), file.buffer, (err) => {
      if (err) return reject(err);
      resolve({ url: `${req.protocol}://${req.get('host')}/uploads/${name}`, type });
    });
  });
