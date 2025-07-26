import express from 'express';
import { createOrder, getMyOrders, cancelOrder } from '../controllers/orderController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';


const router = express.Router();
router.post('/', authenticateJWT, authorizeRoles('customer'),createOrder);
router.post('/cancel-order/:orderId', authenticateJWT, authorizeRoles('customer'),cancelOrder);
router.get('/my-orders', authenticateJWT, authorizeRoles('customer'),getMyOrders);
export default router;
