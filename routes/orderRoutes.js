import express from 'express';
import { createOrder } from '../controllers/orderController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';


const router = express.Router();
router.post('/', authenticateJWT, authorizeRoles('customer'),createOrder);
export default router;
