// auth.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// ==============================================
//  JWT Configuration
// ==============================================
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE 
};

// ==============================================
//  Authentication Strategies
// ==============================================

// JWT Strategy for API authentication
passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);
    if (!user) return done(null, false);
    
    // Add additional token validation checks if needed
    if (payload.iss !== jwtOptions.issuer) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Google OAuth 2.0 Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
  scope: ['profile', 'email'],
  state: true,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId: profile.id }
      ]
    });

    if (!user) {
      user = new User({
        googleId: profile.id,
        email,
        displayName: profile.displayName,
        avatar: profile.photos?.[0]?.value,
        provider: 'google',
        isVerified: true,
        role: 'customer' // Default role
      });
      await user.save();
    } else if (!user.googleId) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.avatar = profile.photos?.[0]?.value;
      user.provider = 'google';
      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Facebook Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: '/api/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name', 'photos'],
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Facebook account has no email'), null);
    }

    let user = await User.findOne({ 
      $or: [
        { email },
        { facebookId: profile.id }
      ]
    });

    if (!user) {
      user = new User({
        facebookId: profile.id,
        email,
        displayName: `${profile.name.givenName} ${profile.name.familyName}`,
        avatar: profile.photos?.[0]?.value,
        provider: 'facebook',
        isVerified: true,
        role: 'customer'
      });
      await user.save();
    } else if (!user.facebookId) {
      // Link Facebook account to existing user
      user.facebookId = profile.id;
      user.avatar = profile.photos?.[0]?.value;
      user.provider = 'facebook';
      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// ==============================================
//  Session Serialization
// ==============================================
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ==============================================
//  Middleware Functions
// ==============================================

// JWT Authentication Middleware
export const jwtAuth = passport.authenticate('jwt', { session: false });

// Generate JWT after OAuth success
export const generateToken = (req, res, next) => {
  const user = req.user;
  
  const token = jwt.sign(
    { 
      sub: user._id,
      email: user.email,
      role: user.role,
      iss: jwtOptions.issuer,
      aud: jwtOptions.audience
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  const refreshToken = jwt.sign(
    { sub: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  req.authTokens = {
    token,
    refreshToken
  };
  
  next();
};

// Role-based Access Control
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Token Refresh Middleware
export const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Refresh token is required'
    });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }

    const newToken = jwt.sign(
      { 
        sub: user._id,
        email: user.email,
        role: user.role,
        iss: jwtOptions.issuer,
        aud: jwtOptions.audience
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: newToken
    });
  } catch (error) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }
};