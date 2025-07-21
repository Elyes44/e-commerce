import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import path from 'path';
import fs from 'fs/promises';


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


// Fetch products for the current user's shop
export const getProductsByCurrentUserShop = async (req, res, next) => {
  try {
    // Get the shop owned by the authenticated user
    const shop = await Shop.findOne({ owner: req.user.id });

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found for this user.' });
    }

    // Fetch products related to that shop
    const products = await Product.find({ shop: shop._id });

    res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
};


// Fetch all products with details
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: 'shop',
        select: 'name'
      })
      .populate({
        path: 'seller',
        select: 'firstName lastName'
      });

    res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
};

 const resolvePath = (filePath) => {
  if (!filePath) return null;
  
  // Normalize separators to '/'
  const normalized = filePath.replace(/\\/g, '/');

  // If absolute path OR already includes 'public/' at start, return as is
  if (
    path.isAbsolute(filePath) ||
    normalized.startsWith('public/')
  ) {
    return filePath;
  }

  // Else join with your base public folder
  return path.join(process.cwd(), 'public', filePath);
};

 async function deleteFileIfExists(filePath) {
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    console.log(`Deleted old file: ${filePath}`);
  } catch (err) {
    console.log(`File not found or error deleting: ${filePath}`);
  }
}

// Update a product by ID
export const updateProduct = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.id;

    // Find the product and ensure it belongs to the current user
    const product = await Product.findOne({ _id: productId, seller: userId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or not authorized' });
    }

    // Update basic fields
    if (req.body.name) product.name = req.body.name;
    if (req.body.description) product.description = req.body.description;
    if (req.body.price) product.price = req.body.price;
    if (req.body.stock) product.stock = req.body.stock;
    if (req.body.category) product.category = req.body.category;

    // Handle image update
    if (req.files?.images && req.files.images.length > 0) {
      // Delete old images
      for (const oldImage of product.images) {
        const oldImagePath = resolvePath(oldImage);
        await deleteFileIfExists(oldImagePath);
      }

      // Set new images
      product.images = req.files.images.map(file => {
        const cleanedPath = file.path.replace(/\\/g, '/');
        return cleanedPath.includes('public/') ? cleanedPath.split('public/')[1] : cleanedPath;
      });
    }

    await product.save();

    res.status(200).json({ message: 'Product updated successfully', product });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during product update' });
  }
};



