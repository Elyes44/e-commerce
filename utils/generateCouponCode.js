import Discount from '../models/Discount.js';

function randomCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789&é"\'(-è_çà)=)çàè_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateUniqueCouponCode(length = 12) {
  let code;
  let exists = true;

  while (exists) {
    code = randomCode(length + Math.floor(Math.random() * 5)); // 12–16
    const existing = await Discount.findOne({ code });
    if (!existing) exists = false;
  }

  return code;
}
