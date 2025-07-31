// models/Product.js
import mongoose from 'mongoose';

const attributeValueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Supports strings, numbers, etc.
    required: true
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  stock: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  attributes: [attributeValueSchema],
  images: {
    type: [String],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length > 0,
      message: 'At least one image is required'
    },
    required: true
  },
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

// Auto-update timestamps
productSchema.pre('save', async function(next) {
  if (this.isModified('attributes') || this.isNew) {
    try {
      const category = await mongoose.model('Category').findById(this.category);

      if (!category) {
        return next(new Error('Invalid category reference'));
      }

      // Validate each submitted attribute
      for (const attr of this.attributes) {
        const categoryAttr = category.attributes.find(a => a.name === attr.name);

        if (!categoryAttr) {
          return next(new Error(`Attribute '${attr.name}' is not allowed for this category`));
        }

        if (categoryAttr.inputType === 'dropdown') {
          const values = Array.isArray(attr.value) ? attr.value : [attr.value];

          // 🚫 Disallow multiple values if not allowed
          if (!categoryAttr.allowMultiple && values.length > 1) {
            return next(
              new Error(`Attribute '${attr.name}' does not support multiple values.`)
            );
          }

          // ✅ Validate each value
          for (const value of values) {
            if (!categoryAttr.options.includes(value)) {
              return next(
                new Error(
                  `Invalid value '${value}' for attribute '${attr.name}'. Allowed values: ${categoryAttr.options.join(', ')}`
                )
              );
            }
          }
        }
      }

      // Check if all required attributes are provided
      const missingAttributes = category.attributes
        .filter(a => a.isRequired)
        .filter(requiredAttr => 
          !this.attributes.some(attr => attr.name === requiredAttr.name)
        );

      if (missingAttributes.length > 0) {
        return next(
          new Error(
            `Missing required attributes: ${missingAttributes.map(a => a.name).join(', ')}`
          )
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});


// Indexes for performance
productSchema.index({ shop: 1 }); // All shop product queries
productSchema.index({ category: 1 }); // Category browsing
productSchema.index({ 'attributes.name': 1, 'attributes.value': 1 }); // Faceted search
productSchema.index({ isActive: 1 }); // Active product filtering

export default mongoose.model('Product', productSchema);