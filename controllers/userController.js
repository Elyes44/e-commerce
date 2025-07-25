import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import { v4 as uuidv4 } from 'uuid'; 
import BlacklistedToken from '../models/BlacklistedToken.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const registerLocalUser = async (req, res) => {
  console.log('Register endpoint hit');

  try {
    const { email, password, firstName, lastName, phone, address, role } = req.body;
    const errors = {};

    const FIELD_LIMITS = {
      email: { min: 5, max: 254 },
      password: { min: 8, max: 128 },
      firstName: { min: 2, max: 50 },
      lastName: { min: 2, max: 50 }
    };

    // === Input Validation ===

    // Email
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

    // Password
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
        errors.password = 'Password must contain at least one number';
      }
      if (!hasSpecialChar.test(password)) {
        errors.password = 'Password must contain one special character (!@#$...)';
      }
    }

    // First Name
    if (!firstName?.trim()) {
      errors.firstName = 'First name is required';
    } else {
      const { min, max } = FIELD_LIMITS.firstName;
      if (firstName.length < min) {
        errors.firstName = `First name must be at least ${min} characters`;
      }
      if (firstName.length > max) {
        errors.firstName = `First name cannot exceed ${max} characters`;
      }
    }

    // Last Name
    if (!lastName?.trim()) {
      errors.lastName = 'Last name is required';
    } else {
      const { min, max } = FIELD_LIMITS.lastName;
      if (lastName.length < min) {
        errors.lastName = `Last name must be at least ${min} characters`;
      }
      if (lastName.length > max) {
        errors.lastName = `Last name cannot exceed ${max} characters`;
      }
    }

    // If any validation error
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // === Check if User Already Exists ===
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // === Hash Password ===
    const hashedPassword = await bcrypt.hash(password, 10);

    // === Create New User ===
    const newUser = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      provider: 'local',
      role: role || 'customer',
      isVerified: role === 'customer' 
    });

    await newUser.save();

    // === Generate JWT ===
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // === Final Response ===
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        address: newUser.address
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};


// Login function for  users
export const loginLocalUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email including password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials !' });
    }

    // Generate unique JWT ID for access token
    const jti = uuidv4();

    // Generate access token (15 mins)
    const token = jwt.sign(
      { userId: user._id, role: user.role, jti },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate refresh token (30 days)
    const refreshTokenRaw = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '30d' }
    );

    // Hash the refresh token with bcrypt (slow, secure)
    const hashedToken = await bcrypt.hash(refreshTokenRaw, 10);

    // Compute fast SHA-256 hash for quick DB lookup
    const lookupHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

    // Save refresh token with hashed token and lookup hash
    await RefreshToken.create({
      user: user._id,
      token: hashedToken,
      lookupHash,
    });

    // Set refresh token as secure HttpOnly cookie
    res.cookie('refreshToken', refreshTokenRaw, {
      httpOnly: true,
      secure: false, // set to true in production (HTTPS)
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Send response (without sending refresh token in body)
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
};




export const logout = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const decoded = req.tokenExpired ? req.decoded : jwt.verify(accessToken, process.env.JWT_SECRET);

    // Step 1: Revoke Refresh Token
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required in cookie' });
    }

    const allTokens = await RefreshToken.find({ revoked: false });
    let tokenDocFound = null;
    for (const tokenDoc of allTokens) {
      const isMatch = await bcrypt.compare(refreshToken, tokenDoc.token);
      if (isMatch) {
        tokenDocFound = tokenDoc;
        break;
      }
    }

    if (!tokenDocFound) {
      return res.status(404).json({ message: 'Refresh token not found or already revoked' });
    }

    tokenDocFound.revoked = true;
    await tokenDocFound.save();

    // Step 2: Blacklist Access Token
    if (decoded.jti) {
      const expiresAt = new Date(decoded.exp * 1000);
      await BlacklistedToken.create({ jti: decoded.jti, expiresAt });
    }

    // Step 3: Clear Cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};





export const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }

  try {
    const allTokens = await RefreshToken.find({ revoked: false });
let tokenDoc = null;
for (const t of allTokens) {
  const match = await bcrypt.compare(refreshToken, t.token);
  if (match) {
    tokenDoc = t;
    break;
  }
}
if (!tokenDoc || tokenDoc.revoked) {
  return res.status(403).json({ message: 'Token revoked or invalid' });
}


    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const isValid = await bcrypt.compare(refreshToken, tokenDoc.token);
    if (!isValid || tokenDoc.revoked) {
      return res.status(403).json({ message: 'Token revoked or invalid' });
    }

    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const newAccessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Function to upload user avatar

export const uploadUserAvatar = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const newAvatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      // Delete the uploaded file since user doesn't exist
      const uploadedPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', req.file.filename);
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(404).json({ message: 'User not found' });
    }

    // If the user already has an avatar, delete it from disk
    if (user.avatar) {
      const oldAvatarPath = path.join(process.cwd(), 'public', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      } else {
        console.log('Old avatar file not found on disk:', oldAvatarPath);
      }
    }

    // Update user with new avatar
    user.avatar = newAvatarUrl;
    await user.save();

    res.status(200).json({
      message: 'Avatar uploaded and updated successfully',
      user: user.toObject({ getters: true, virtuals: false }),
    });
  } catch (err) {
    console.error('Error uploading/updating avatar:', err);
    res.status(500).json({ message: 'Server error while updating avatar' });
  }
};















// Function to delete user avatar

export const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id; // assuming you have middleware that sets req.user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.avatar) {
      return res.status(400).json({ message: 'No avatar to delete' });
    }

    // Build full path to the avatar
const tempAvatarPath = path.join(__dirname, '..', 'public', user.avatar.replace(/^\/+/, ''));

    // Check if file exists before deleting
    if (fs.existsSync(tempAvatarPath)) {
      fs.unlink(tempAvatarPath, (err) => {
        if (err) {
          console.error("Error deleting avatar file from disk:", err);
        } else {
          console.log("Avatar file deleted from disk");
        }
      });
    } else {
      console.warn("File not found on disk:", tempAvatarPath);
    }

    // Remove avatar from user and save
    user.avatar = undefined;
    await user.save();

    res.status(200).json({ message: 'Avatar deleted successfully' });

  } catch (error) {
    console.error("Error deleting avatar:", error);
    res.status(500).json({ message: 'Error deleting avatar' });
  }
};


// Function to update personal information
export const updatePersonalInfo = async (req, res) => {
  try {
    const userId = req.user._id;

    // Only allow specific fields to be updated
    const { firstName, lastName, address } = req.body;

    const updates = {};

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (address !== undefined) updates.address = address;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Personal information updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating personal info:', error);
    res.status(500).json({ message: 'Server error while updating personal information' });
  }
};
