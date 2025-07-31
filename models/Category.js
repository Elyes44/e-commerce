// models/Category.js
import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true // Ensures consistent querying
  },
  inputType: { 
    type: String, 
    enum: ['dropdown', 'text', 'number', 'checkbox'], 
    default: 'dropdown',
    required: true
  },
  options: [{ 
    type: String,
    trim: true
  }],
  isRequired: { 
    type: Boolean, 
    default: false 
  },
  isFilterable: { 
    type: Boolean, 
    default: true 
  },
    allowMultiple: {    
    type: Boolean,
    default: false
  }
}, { _id: false });

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  slug: { 
    type: String, 
    unique: true,
    trim: true
  },
  attributes: [attributeSchema],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Auto-generate slug before saving
categorySchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '');
  }
  this.updatedAt = new Date();
  next();
});

// Indexes for critical queries
categorySchema.index({ slug: 1, isActive: 1 }); // For frontend fetching
categorySchema.index({ 'attributes.name': 1 });  // For attribute validation

const Category = mongoose.model('Category', categorySchema);

export default Category;