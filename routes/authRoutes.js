import express from 'express';
import passport from 'passport';
import {
  generateToken,
  jwtAuth,
  requireRole
} from '../middleware/auth.js';

const router = express.Router();

// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  passport.authenticate('google'),
  generateToken, // Will now properly set req.authToken
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/test?token=${req.authToken}`);
  }
);

// Protected test route
router.get('/protected',
  jwtAuth,
  requireRole(['customer', 'seller', 'admin']),
  (req, res) => {
    res.json({ message: 'Protected data', user: req.user });
  }
);

// // Facebook OAuth Routes
// router.get('/facebook',
//   passport.authenticate('facebook', {
//     scope: ['email', 'public_profile'] // Requested permissions
//   })
// );

router.get('/facebook',
  passport.authenticate('facebook', {
    // No scope requested (fallback to default public_profile only)
    authType: 'rerequest'
  })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: '/login',
    session: false 
  }),
  generateToken, // Reuse your token generation middleware
  (req, res) => {
    // Same success handling as Google
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${req.authToken}`);
  }
);


// // Local Authentication Routes
// router.post('/register', 
//   passport.authenticate('local-register', { session: false }),
//   generateToken,
//   (req, res) => {
//     res.json({ token: req.authToken });
//   }
// );

// router.post('/login',
//   passport.authenticate('local-login', { session: false }),
//   generateToken,
//   (req, res) => {
//     res.json({ token: req.authToken });
//   }
// );

export default router;