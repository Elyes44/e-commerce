import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    maxlength: 254
  },
  firstName: {
    type: String,
    trim: true,
    required: [true, 'First name is required'],
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    required: [true, 'Last name is required'],
    maxlength: 50
  },
  address: {
    type: String,
    trim: true,
    maxlength: 254
  },
  phone: {
    type: String,
    trim: true,
    required: [true, 'Phone number is required'],
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    select: false,
    maxlength: 128
  },
  role: {
    type: String,
    enum: ['customer', 'seller', 'service_provider', 'admin'], 
    default: 'customer',
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  avatar: String,
  lastLogin: Date
}, { timestamps: true });

// Password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model('User', userSchema);
