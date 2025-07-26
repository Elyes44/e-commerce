import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  shopInfo: {
    name: String,
    address: String,
    phone: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Snapshot of user info
  customerInfo: {
    firstName: String,
    lastName: String,
    phone: String,
    address: String,
  },

  items: [orderItemSchema],

  discountCoupon: {
    type: String,
    default: null,
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    required: true,
  },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid',
  },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },

  totalPrice: {
    type: Number,
    required: true,
  }

}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
