import Shop from '../models/Shop.js';

// 🏪 Create a new shop
export const createShop = async (req, res) => {
  try {
    const { name, description, logo, banner } = req.body;

    // Check if user already owns a shop
    const existing = await Shop.findOne({ owner: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'User already owns a shop ! ' });
    }

    const shop = new Shop({
      name,
      description,
      logo,
      banner,
      owner: req.user.id
    });

    await shop.save();
    res.status(201).json(shop);
  } catch (err) {
    console.error('Create shop error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};