import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  logo: {
    type: String,
    default: ''
  },
  banner: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// 🔁 Utility to create a URL-safe slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/(^-|-$)+/g, '');   // Trim hyphens from ends
}

// ⏳ Pre-save hook to generate slug from name
shopSchema.pre('save', function (next) {
  if (!this.isModified('name')) return next();
  this.slug = generateSlug(this.name);
  next();
});

const Shop = mongoose.model('Shop', shopSchema);
export default Shop;
