import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { validateCoupon } from '../utils/validateCoupon.js';
import Discount from '../models/Discount.js'; 


// Create a new order
// export const createOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { discountCoupon, paymentMethod, cart } = req.body;

//     console.log('Received Order Request:', {
//       userId,
//       discountCoupon,
//       paymentMethod,
//       cart,
//     });

//     if (!Array.isArray(cart) || cart.length === 0) {
//       console.warn('Invalid or empty cart:', cart);
//       return res.status(400).json({ message: 'Cart is empty or invalid' });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       console.warn('User not found with ID:', userId);
//       return res.status(404).json({ message: 'User not found' });
//     }

//     console.log('User found:', {
//       id: user._id,
//       name: `${user.firstName} ${user.lastName}`,
//       phone: user.phone,
//     });

//     const orderItems = [];
//     let totalPrice = 0;
//     let deliveryFee = 0;

//     for (const item of cart) {
//       console.log('Processing cart item:', item);

//       const product = await Product.findById(item.productId).populate('shop');
//       if (!product) {
//         console.warn('Product not found with ID:', item.productId);
//         continue;
//       }

//       const shop = product.shop;
//       const unitPrice = product.price;
//       const quantity = item.quantity || 1;

//       // Detailed breakdown for debugging
//       console.log('Unit Price:', unitPrice);
//       console.log('Quantity:', quantity);
//       console.log('Delivery Fee:', deliveryFee);
//       console.log('Subtotal:', unitPrice * quantity);
//       console.log('Subtotal + Delivery Fee:', (unitPrice * quantity) + deliveryFee);

//       totalPrice += ((unitPrice * quantity) + deliveryFee);

//       orderItems.push({
//         product: product._id,
//         shop: shop._id,
//         shopInfo: {
//           name: shop?.name || 'N/A',
//           address: shop?.address || 'N/A',
//           phone: shop?.phone || 'N/A',
//         },
//         quantity,
//         unitPrice,
//       });
//     }

//     if (orderItems.length === 0) {
//       console.warn('No valid products found in cart');
//       return res.status(400).json({ message: 'No valid products found in cart' });
//     }

//     console.log('Total price calculated:', totalPrice);
//     console.log('Order items:', orderItems);

//     const order = await Order.create({
//       user: user._id,
//       customerInfo: {
//         firstName: user.firstName,
//         lastName: user.lastName,
//         phone: user.phone,
//         address: user.address,
//       },
//       items: orderItems,
//       discountCoupon: discountCoupon || null,
//       paymentMethod,
//       totalPrice,
//     });

//     console.log('Order created successfully:', order._id);
//     res.status(201).json({ message: 'Order placed successfully', order });

//   } catch (error) {
//     console.error('Error creating order:', error);
//     res.status(500).json({ message: 'Server error while creating order' });
//   }
// };



// Get all orders for the authenticated user
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ user: req.user.id }).populate('items.product') 
  .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your orders.' });
  }
};







































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

    // Initialize variables
    let coupon = null;
    let discountApplied = 0;

    // Validate coupon if provided
    if (discountCoupon) {
      try {
        coupon = await validateCoupon(discountCoupon);
        
        // Additional check - coupon might be valid but we want to ensure it's not used
        if (coupon.isUsed) {
          throw { status: 400, message: 'Coupon has already been used' };
        }
      } catch (error) {
        console.warn('Coupon validation failed:', error.message);
        return res.status(error.status || 400).json({ message: error.message });
      }
    }

    const orderItems = [];
    let totalPrice = 0;
    let deliveryFee = 0;

    // Calculate initial total price
    for (const item of cart) {
      const product = await Product.findById(item.productId).populate('shop');
      if (!product) {
        console.warn('Product not found with ID:', item.productId);
        continue;
      }

      const shop = product.shop;
      const unitPrice = product.price;
      const quantity = item.quantity || 1;

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

    // Apply discount if valid coupon exists
    if (coupon) {
      if (coupon.type === 'percentage') {
        discountApplied = totalPrice * (coupon.value / 100);
        totalPrice -= discountApplied;
      } else if (coupon.type === 'fixed') {
        discountApplied = Math.min(coupon.value, totalPrice);
        totalPrice -= discountApplied;
      }

      console.log(`Applied ${coupon.type} discount of ${discountApplied}`);
      console.log('New total price after discount:', totalPrice);
    }

    // Create the order
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

    // Mark coupon as used if it was applied
    if (coupon) {
      await Discount.findByIdAndUpdate(coupon._id, { isUsed: true });
      console.log(`Marked coupon ${coupon.code} as used`);
    }

    console.log('Order created successfully:', order._id);
    res.status(201).json({ 
      message: 'Order placed successfully', 
      order,
      discountApplied: discountApplied > 0 ? discountApplied : undefined
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
};














// Cancel an order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { description } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order is still pending and unpaid
    if (order.status !== 'pending' || order.paymentStatus !== 'unpaid') {
      return res.status(400).json({ message: 'Only pending and unpaid orders can be cancelled' });
    }

    order.status = 'cancelled';
    order.cancelDescription = description || 'No reason provided';

    await order.save();

    res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
