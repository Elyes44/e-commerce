import User from '../models/User.js';
import { validateRegistration } from '../middleware/auth.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const registerLocalUser = async (req, res) => {
     console.log('Register endpoint hit');
  try {
    // 1. Validate Input
    validateRegistration(req.body);

    // 2. Check for Existing User
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 3. Create New User
    const newUser = new User({
      email: req.body.email,
      password: req.body.password, // Will be hashed by pre-save hook
      displayName: req.body.displayName,
      provider: 'local',
      role: req.body.role || 'customer', // Default role
      isVerified: req.body.role === 'customer' // Auto-verify customers
    });

    // 4. Save User (password auto-hashed via User model pre-save)
    await newUser.save();

    // 5. Generate JWT
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Sending response:', {
      success: true,
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        displayName: newUser.displayName
      }
    });
    // 6. Secure Response
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        displayName: newUser.displayName
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error.details) {
      return res.status(400).json({ errors: error.details });
    }
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};


