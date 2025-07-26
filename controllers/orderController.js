import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { discountCoupon, paymentMethod, cart } = req.body;

    console.log('Received Order Request:', {
      userId,
      discountCoupon,
      paymentMethod,
      cart,
    });

    if (!Array.isArray(cart) || cart.length === 0) {
      console.warn('Invalid or empty cart:', cart);
      return res.status(400).json({ message: 'Cart is empty or invalid' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.warn('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      phone: user.phone,
    });

    const orderItems = [];
    let totalPrice = 0;
    let deliveryFee = 0;

    for (const item of cart) {
      console.log('Processing cart item:', item);

      const product = await Product.findById(item.productId).populate('shop');
      if (!product) {
        console.warn('Product not found with ID:', item.productId);
        continue;
      }

      const shop = product.shop;
      const unitPrice = product.price;
      const quantity = item.quantity || 1;

      // Detailed breakdown for debugging
      console.log('Unit Price:', unitPrice);
      console.log('Quantity:', quantity);
      console.log('Delivery Fee:', deliveryFee);
      console.log('Subtotal:', unitPrice * quantity);
      console.log('Subtotal + Delivery Fee:', (unitPrice * quantity) + deliveryFee);

      totalPrice += ((unitPrice * quantity) + deliveryFee);

      orderItems.push({
        product: product._id,
        shop: shop._id,
        shopInfo: {
          name: shop?.name || 'N/A',
          address: shop?.address || 'N/A',
          phone: shop?.phone || 'N/A',
        },
        quantity,
        unitPrice,
      });
    }

    if (orderItems.length === 0) {
      console.warn('No valid products found in cart');
      return res.status(400).json({ message: 'No valid products found in cart' });
    }

    console.log('Total price calculated:', totalPrice);
    console.log('Order items:', orderItems);

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

    console.log('Order created successfully:', order._id);
    res.status(201).json({ message: 'Order placed successfully', order });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
};
