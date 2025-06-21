// auth.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
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


//  Local Authentication Strategies
passport.use('local-register', new LocalStrategy(
  { usernameField: 'email', passReqToCallback: true },
  async (req, email, password, done) => {
    try {
      // Check if email exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return done(null, false, { message: 'Email already registered' });
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        email,
        password: hashedPassword,
        displayName: req.body.name,
        role: 'customer',
        isVerified: false 
      });

      await newUser.save();
      done(null, newUser);
    } catch (error) {
      done(error);
    }
  }
));

passport.use('local-login', new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return done(null, false, { message: 'Invalid credentials' });

      done(null, user);
    } catch (error) {
      done(error);
    }
  }
));
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

export const generateToken = (req, res, next) => {
  try {
    // Check if user exists
    if (!req.user || !req.user._id) {
      throw new Error('User not authenticated');
    }

    const user = req.user;
    
    // Create access token
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
    
    // Create refresh token
    const refreshToken = jwt.sign(
      { sub: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Attach tokens to request
    req.authToken = token; // Main token for immediate use
    req.authTokens = {     // Both tokens if needed
      token,
      refreshToken
    };
    
    next();
  } catch (error) {
    console.error('Token generation error:', error);
    return res.redirect('/login?error=token_generation_failed');
  }
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

// validateRegistration function
export const validateRegistration = (data) => {
  const { email, password, displayName } = data;
  const errors = {};
  
  // Field Length Limits (Security Hardening)
  const FIELD_LIMITS = {
    email: { min: 5, max: 254 }, // RFC 5321 compliant
    password: { min: 8, max: 128 },
    displayName: { min: 2, max: 50 }
  };

  // Email Validation
  if (!email) {
    errors.email = 'Email is required';
  } else {
    if (email.length < FIELD_LIMITS.email.min) {
      errors.email = `Email must be at least ${FIELD_LIMITS.email.min} characters`;
    }
    if (email.length > FIELD_LIMITS.email.max) {
      errors.email = `Email cannot exceed ${FIELD_LIMITS.email.max} characters`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }
  }

  // Password Validation
  if (!password) {
    errors.password = 'Password is required';
  } else {
    const { min, max } = FIELD_LIMITS.password;
    const hasNumber = /\d/;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;
    
    if (password.length < min) {
      errors.password = `Password must be at least ${min} characters`;
    }
    if (password.length > max) {
      errors.password = `Password cannot exceed ${max} characters`;
    }
    if (!hasNumber.test(password)) {
      errors.password = 'Must contain at least one number';
    }
    if (!hasSpecialChar.test(password)) {
      errors.password = 'Must contain one special character (!@#$...)';
    }
  }

  // Display Name Validation
  if (!displayName?.trim()) {
    errors.displayName = 'Display name is required';
  } else {
    const { min, max } = FIELD_LIMITS.displayName;
    if (displayName.length < min) {
      errors.displayName = `Name must be at least ${min} characters`;
    }
    if (displayName.length > max) {
      errors.displayName = `Name cannot exceed ${max} characters`;
    }
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error('Validation failed');
    error.details = errors;
    throw error;
  }
};
// Usage in Passport strategy
passport.use('local-register', new LocalStrategy(
  { usernameField: 'email', passReqToCallback: true },
  async (req, email, password, done) => {
    try {
      validateRegistration({ 
        email, 
        password, 
        displayName: req.body.displayName 
      });

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const user = new User({
        email,
        password,
        displayName: req.body.displayName,
        provider: 'local'
      });

      await user.save();
      done(null, user);
    } catch (error) {
      done(error);
    }
  }
));

// ==============================================
// Token Refresh Middleware
// ==============================================
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


