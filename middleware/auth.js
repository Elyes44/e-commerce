import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import BlacklistedToken from '../models/BlacklistedToken.js';

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const isLogoutRoute = req.path === '/logout'; // 👈 Add more if needed

  try {
    // Normal verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if blacklisted
    const blacklisted = await BlacklistedToken.findOne({ jti: decoded.jti });
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Check user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }

    req.user = user;
    next();
  } catch (err) {
    // If token is expired and we're on logout route
    if (isLogoutRoute) {
      const decoded = jwt.decode(token); // doesn't throw
      if (!decoded || !decoded.jti || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid token structure' });
      }

      req.tokenExpired = true;
      req.decoded = decoded; // pass to logout route
      return next();
    }

    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient role' });
    }
    next();
  };
};



