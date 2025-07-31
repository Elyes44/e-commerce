import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,      
      uppercase: true,  
      trim: true,        
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'], 
      required: true,                
    },
    value: {
      type: Number,
      required: true,
      min: 1, 
    },
    isUsed: {
      type: Boolean,
      default: false, 
    },
    validFrom: {
      type: Date,
      default: Date.now, 
    },
    validUntil: {
      type: Date,
      required: true, 
    },
  },
  {
    timestamps: true, 
  }
);

export default mongoose.model('Discount', discountSchema);
