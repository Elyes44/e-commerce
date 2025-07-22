import multer from 'multer';
import fs from 'fs';
import path from 'path';

const basePath = path.resolve('public/uploads/products');

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, basePath);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

export const uploadProductImagesMiddleware = multer({
  storage,
  limits: { fileSize: 9  * 1024 * 1024 }, // 9 MB limit
  fileFilter(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.test(ext)) {
      return cb(new Error('Only images (jpeg, jpg, png, webp) allowed'));
    }
    cb(null, true);
  }
}).fields([
  { name: 'images', maxCount: 5 }, // up to 5 images
]);
