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

/** Uploads a multer memory file. Returns { url, type, fileName, fileSize, mimeType }. Falls back to local disk if Cloudinary isn't configured. */
exports.uploadFile = (file, req) =>
  new Promise((resolve, reject) => {
    let type = 'image';
    if (file.mimetype.startsWith('video')) type = 'video';
    else if (file.mimetype.startsWith('audio')) type = 'audio';
    else if (
      file.mimetype.startsWith('application') ||
      file.mimetype.startsWith('text') ||
      file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|txt|zip|rar)$/i)
    ) {
      type = 'document';
    }

    const fileInfo = {
      fileName: file.originalname || 'file',
      fileSize: file.size || (file.buffer ? file.buffer.length : 0),
      mimeType: file.mimetype || 'application/octet-stream',
    };

    if (useCloud) {
      const resourceType = type === 'image' ? 'image' : type === 'video' ? 'video' : 'raw';
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'stimzzyvibe',
          resource_type: resourceType,
          transformation: type === 'image'
            ? [{ width: 1080, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
            : type === 'video'
            ? [{ width: 720, crop: 'limit', quality: 'auto' }]
            : undefined,
        },
        (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, type, ...fileInfo }))
      );
      return stream.end(file.buffer);
    }

    const ext = path.extname(file.originalname) || ('.' + (file.mimetype.split('/')[1] || 'bin'));
    const name = crypto.randomBytes(12).toString('hex') + ext;
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    fs.writeFile(path.join(uploadPath, name), file.buffer, (err) => {
      if (err) return reject(err);
      resolve({ url: `${req.protocol}://${req.get('host')}/uploads/${name}`, type, ...fileInfo });
    });
  });
