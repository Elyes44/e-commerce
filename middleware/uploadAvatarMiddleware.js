// middlewares/uploadAvatarMiddleware.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const avatarPath = path.resolve('public/uploads/avatars');

if (!fs.existsSync(avatarPath)) {
  fs.mkdirSync(avatarPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, avatarPath);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `avatar-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

export const uploadAvatarMiddleware = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.test(ext)) {
      return cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
    }
    cb(null, true);
  }
}).single('avatar');
