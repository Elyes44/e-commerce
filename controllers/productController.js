import Product from '../models/Product.js';
import Shop from '../models/Shop.js';

export const addProduct = async (req, res, next) => {
  try {
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const {
      name,
      description = '',
      price,
      stock,
      category = '',
    } = req.body;

    // Ensure at least one image was uploaded
    const imageFiles = req.files?.images;
    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ message: 'At least one product image is required.' });
    }

    const imagePaths = imageFiles.map(file => file.path);

    // 🔒 Find the seller's shop using the authenticated user's ID
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found for this seller.' });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      stock,
      category,
      seller: req.user.id,
      shop: shop._id, 
      images: imagePaths,
    });

    await newProduct.save();

    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (err) {
    next(err);
  }
};