import jwt from 'jsonwebtoken';
import BlacklistedToken from '../models/BlacklistedToken.js';
import User from '../models/User.js';

export const validateAccessToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const blacklisted = await BlacklistedToken.findOne({ jti: decoded.jti });
    if (blacklisted) {
      return { valid: false, error: 'Token has been revoked' };
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return { valid: false, error: 'Unauthorized access' };
    }

    return { valid: true, decoded, user };
  } catch (err) {
    return { valid: false, error: 'Invalid or expired token' };
  }
};