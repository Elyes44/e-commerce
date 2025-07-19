import express from 'express';
import { createShop } from '../controllers/shopController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';


const router = express.Router();

// Create shop
router.post('/', authenticateJWT, authorizeRoles('seller', 'admin'), createShop);

export default router;
