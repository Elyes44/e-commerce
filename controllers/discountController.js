import Discount from '../models/Discount.js';

import { generateUniqueCouponCode } from '../utils/generateCouponCode.js';


/*
{
  "type": "percentage",      // Valid string for type
  "value": 20,               // Valid number
  "maxUsage": 1,             // Valid number (single use)
  "validUntil": "2025-12-31T23:59:59.999Z"  // Valid ISO date string
}

*/

// controllers/discountController.js

export const createDiscount = async (req, res) => {
  try {
    const {
      type,
      value,
      maxUsage,
      description,
      validUntil,
      validFrom,
    } = req.body;

    const code = await generateUniqueCouponCode(14); 

    const newDiscount = new Discount({
      code,
      type,
      value,
      maxUsage,
      description,
      validFrom: validFrom || new Date(),
      validUntil,
    });

    await newDiscount.save();

    res.status(201).json({ success: true, discount: newDiscount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};





export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const discount = await Discount.findOne({ code: code.trim() });

    if (!discount) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (discount.isUsed) {
      return res.status(400).json({ message: 'Coupon has already been used' });
    }

    const now = new Date();
    if (now < discount.validFrom || now > discount.validUntil) {
      return res.status(400).json({ message: 'Coupon Expired' });
    } 

    res.status(200).json({
      success: true,
      discount: {
        _id: discount._id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        isUsed: discount.isUsed,
        validFrom: discount.validFrom,
        validUntil: discount.validUntil,
        createdAt: discount.createdAt,
        updatedAt: discount.updatedAt,
        __v: discount.__v,
      },
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ message: 'Server error while validating coupon' });
  }
};

