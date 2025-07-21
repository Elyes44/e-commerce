import express from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { addProduct } from '../controllers/productController.js';
import {  uploadProductImagesMiddleware   } from '../middleware/uploadProductImages.js'; 

const router = express.Router();

router.post(
  '/',
  authenticateJWT,
  authorizeRoles('seller'),
  uploadProductImagesMiddleware,
  addProduct
);

export default router;
