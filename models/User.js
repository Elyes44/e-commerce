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
  displayName: {
    type: String,
    trim: true,
    required: [true, 'Display name is required'],
    maxlength: 50

  },
  password: {
    type: String,
    select: false,
    required: function() {
      return this.provider === 'local'; 
    },
    maxlength: 128
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    required: true
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