import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Shop from '../models/Shop.js';
import path from 'path';
import fs from 'fs/promises';


export const addProduct = async (req, res, next) => {
  try {
    console.log('Raw Body:', req.body);
    console.log('Files:', req.files);

    // Parse attributes if they come as JSON string
    let attributes = [];
    if (req.body.attributes) {
      try {
        attributes = JSON.parse(req.body.attributes);
      } catch (err) {
        return res.status(400).json({ 
          message: 'Invalid attributes format. Must be valid JSON array',
          example: '[{"name":"size","value":"M"}]'
        });
      }
    }

    const {
      name,
      description = '',
      price,
      stock,
      category,
    } = req.body;

    // 1. Validate required fields
    if (!name || !price || !stock || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 2. Validate images
    const imageFiles = req.files?.images;
    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ message: 'At least one product image is required.' });
    }
    const imagePaths = imageFiles.map(file => file.path);

    // 3. Validate shop exists
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found for this seller.' });
    }

    // 4. Validate category and attributes
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid product category' });
    }

    // 4a. Check all required attributes are present
    const missingAttributes = categoryDoc.attributes
      .filter(attr => attr.isRequired)
      .filter(requiredAttr => !attributes.some(attr => attr.name === requiredAttr.name))
      .map(attr => attr.name);

    if (missingAttributes.length > 0) {
      return res.status(400).json({ 
        message: `Missing required attributes: ${missingAttributes.join(', ')}`,
        expectedAttributes: categoryDoc.attributes
      });
    }

    // 4b. Validate attribute values
for (const attr of attributes) {
  const categoryAttr = categoryDoc.attributes.find(a => a.name === attr.name);

  if (!categoryAttr) {
    return res.status(400).json({ 
      message: `Invalid attribute: ${attr.name}`,
      allowedAttributes: categoryDoc.attributes.map(a => a.name)
    });
  }

  if (categoryAttr.inputType === 'dropdown') {
    // Handle single or multiple values based on allowMultiple
    const values = Array.isArray(attr.value) ? attr.value : [attr.value];

    // Check if multiple values are allowed
    if (!categoryAttr.allowMultiple && values.length > 1) {
      return res.status(400).json({ 
        message: `Attribute '${attr.name}' does not support multiple values.`
      });
    }

    // Validate each value against options
    for (const value of values) {
      if (!categoryAttr.options.includes(value)) {
        return res.status(400).json({ 
          message: `Invalid value '${value}' for ${attr.name}. Allowed values: ${categoryAttr.options.join(', ')}`
        });
      }
    }
  }
}

    // 5. Create and save product
    const newProduct = new Product({
      name,
      description,
      price,
      stock,
      category: categoryDoc._id,
      attributes,
      seller: req.user.id,
      shop: shop._id,
      images: imagePaths
    });

    await newProduct.save();

    // 6. Return success response
    res.status(201).json({ 
      success: true,
      message: 'Product added successfully',
      product: {
        _id: newProduct._id,
        name: newProduct.name,
        price: newProduct.price,
        attributes: newProduct.attributes,
        images: newProduct.images
      }
    });

  } catch (err) {
    console.error('Error adding product:', err);
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
// export const updateProduct = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const productId = req.params.id;

//     // Find the product and ensure it belongs to the current user
//     const product = await Product.findOne({ _id: productId, seller: userId });

//     if (!product) {
//       return res.status(404).json({ message: 'Product not found or not authorized' });
//     }

//     // Update basic fields
//     if (req.body.name) product.name = req.body.name;
//     if (req.body.description) product.description = req.body.description;
//     if (req.body.price) product.price = req.body.price;
//     if (req.body.stock) product.stock = req.body.stock;
//     if (req.body.category) product.category = req.body.category;

//     // Handle image update
//     if (req.files?.images && req.files.images.length > 0) {
//       // Delete old images
//       for (const oldImage of product.images) {
//         const oldImagePath = resolvePath(oldImage);
//         await deleteFileIfExists(oldImagePath);
//       }

//       // Set new images
//       product.images = req.files.images.map(file => {
//         const cleanedPath = file.path.replace(/\\/g, '/');
//         return cleanedPath.includes('public/') ? cleanedPath.split('public/')[1] : cleanedPath;
//       });
//     }

//     await product.save();

//     res.status(200).json({ message: 'Product updated successfully', product });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error during product update' });
//   }
// };


export const updateProduct = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.id;

    // Find the product and ensure it belongs to the current user
    const product = await Product.findOne({ _id: productId, seller: userId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not authorized' });
    }

    // Parse attributes if provided
    let attributes = product.attributes; // Keep existing attributes by default
    if (req.body.attributes) {
      try {
        attributes = JSON.parse(req.body.attributes);
      } catch (err) {
        return res.status(400).json({ 
          message: 'Invalid attributes format. Must be valid JSON array',
          example: '[{"name":"size","value":"M"}]'
        });
      }
    }

    // Update basic fields
    if (req.body.name) product.name = req.body.name;
    if (req.body.description) product.description = req.body.description;
    if (req.body.price) product.price = req.body.price;
    if (req.body.stock) product.stock = req.body.stock;

    // Validate and update category if provided
    let categoryId = product.category; // Keep existing category by default
    if (req.body.category) {
      const categoryDoc = await Category.findById(req.body.category);
      if (!categoryDoc) {
        return res.status(400).json({ message: 'Invalid product category' });
      }
      categoryId = req.body.category;
      product.category = categoryId;
    }

    // Validate attributes against the category
    const categoryDoc = await Category.findById(categoryId);
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Category not found' });
    }

    // Check required attributes
    const missingAttributes = categoryDoc.attributes
      .filter(attr => attr.isRequired)
      .filter(requiredAttr => !attributes.some(attr => attr.name === requiredAttr.name))
      .map(attr => attr.name);

    if (missingAttributes.length > 0) {
      return res.status(400).json({ 
        message: `Missing required attributes: ${missingAttributes.join(', ')}`,
        expectedAttributes: categoryDoc.attributes
      });
    }

    // Validate attribute values
    for (const attr of attributes) {
      const categoryAttr = categoryDoc.attributes.find(a => a.name === attr.name);
      if (!categoryAttr) {
        return res.status(400).json({ 
          message: `Invalid attribute: ${attr.name}`,
          allowedAttributes: categoryDoc.attributes.map(a => a.name)
        });
      }

      if (categoryAttr.inputType === 'dropdown') {
        const values = Array.isArray(attr.value) ? attr.value : [attr.value];
        if (!categoryAttr.allowMultiple && values.length > 1) {
          return res.status(400).json({ 
            message: `Attribute '${attr.name}' does not support multiple values.`
          });
        }
        for (const value of values) {
          if (!categoryAttr.options.includes(value)) {
            return res.status(400).json({ 
              message: `Invalid value '${value}' for ${attr.name}. Allowed values: ${categoryAttr.options.join(', ')}`
            });
          }
        }
      }
    }

    // Update attributes
    product.attributes = attributes;

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

    // Update timestamp
    product.updatedAt = new Date();

    // Save the product
    await product.save();

    // Return success response
    res.status(200).json({ 
      message: 'Product updated successfully', 
      product: {
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        attributes: product.attributes,
        images: product.images,
        isActive: product.isActive
      }
    });

  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Server error during product update', error: err.message });
  }
};

