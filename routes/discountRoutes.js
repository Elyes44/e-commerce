import express from 'express';
import { createDiscount, validateCoupon } from '../controllers/discountController.js';


const router = express.Router();
router.post('/', createDiscount);
router.post('/validation', validateCoupon);

export default router;