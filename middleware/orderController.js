import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Shop from '../models/Shop.js';

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id; // assuming user is authenticated via middleware
    const { discountCoupon, paymentMethod } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const cart = user.cart || [];
    if (!cart.length) return res.status(400).json({ message: 'Cart is empty' });

    const orderItems = [];
    let totalPrice = 0;

    for (const item of cart) {
      const product = await Product.findById(item.productId).populate('shop');
      if (!product) continue;

      const shop = product.shop;
      const unitPrice = product.price;
      const quantity = item.quantity || 1;

      totalPrice += unitPrice * quantity;

      orderItems.push({
        product: product._id,
        shop: shop._id,
        shopInfo: {
          name: shop.name,
          address: shop.address,
          phone: shop.phone,
        },
        quantity,
        unitPrice,
      });
    }

    const order = await Order.create({
      user: user._id,
      customerInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
      },
      items: orderItems,
      discountCoupon: discountCoupon || null,
      paymentMethod,
      totalPrice,
    });

    // Optionally: clear user cart
    user.cart = [];
    await user.save();

    res.status(201).json({ message: 'Order placed successfully', order });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
};
