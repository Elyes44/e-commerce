import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,      // ✅ ensures no duplicates in DB
      uppercase: true,   // ✅ normalize codes (e.g., "ABC123" == "abc123")
      trim: true,        // ✅ removes any leading/trailing spaces
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'], // ✅ allows flexible discounts
      required: true,                // ✅ must specify how to apply it
    },
    value: {
      type: Number,
      required: true,
      min: 1,  // ✅ minimum valid discount (no 0 or negative discounts)
    },
    isUsed: {
      type: Boolean,
      default: false, // ✅ flag to mark coupon as used (single-use behavior)
    },
    validFrom: {
      type: Date,
      default: Date.now, // ✅ coupon becomes active immediately unless set otherwise
    },
    validUntil: {
      type: Date,
      required: true, // ✅ allows you to set an expiry date
    },
  },
  {
    timestamps: true, // ✅ createdAt & updatedAt fields auto-managed by Mongoose
  }
);

export default mongoose.model('Discount', discountSchema);
