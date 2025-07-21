import express from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { 
  addProduct, 
  getProductsByCurrentUserShop, 
  getAllProducts, 
  updateProduct 
} from '../controllers/productController.js';

import { uploadProductImagesMiddleware } from '../middleware/uploadProductImages.js';

const router = express.Router();

router.post(
  '/',
  authenticateJWT,
  authorizeRoles('seller'),
  uploadProductImagesMiddleware,
  addProduct
);

router.get('/my-products', authenticateJWT, getProductsByCurrentUserShop);
router.get('/all-products', getAllProducts);
router.put(
  '/update-product/:id',
  authenticateJWT,
  authorizeRoles('seller'),
  uploadProductImagesMiddleware,
  updateProduct
);


export default router;
