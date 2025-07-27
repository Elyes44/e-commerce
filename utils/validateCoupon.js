import Discount from '../models/Discount.js';

export const validateCoupon = async (code) => {
  if (!code) {
    throw { status: 400, message: 'Coupon code is required' };
  }

  const discount = await Discount.findOne({ code: code.trim() });

  if (!discount) {
    throw { status: 404, message: 'Coupon not found' };
  }

  if (discount.isUsed) {
    throw { status: 400, message: 'Coupon has already been used' };
  }

  const now = new Date();
  if (now < discount.validFrom || now > discount.validUntil) {
    throw { status: 400, message: 'Coupon expired or not active' };
  }

  return {
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
  };
};