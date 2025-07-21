// shopController.js
import Shop from '../models/Shop.js'; 
import slugify from 'slugify';
import path from 'path';
import fs from 'fs/promises';

export const createShop = async (req, res, next) => {
  try {
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const { name } = req.body;
    const description = req.body.description || '';
    const slug = slugify(name, { lower: true });

    const logoPath = req.files?.logo?.[0]?.path || '';
    const bannerPath = req.files?.banner?.[0]?.path || '';

    const newShop = new Shop({
      name,
      description,
      slug,
      owner: req.user.id,
      logo: logoPath,
      banner: bannerPath,
    });

    await newShop.save();
    res.status(201).json({ message: 'Shop created', shop: newShop });

  } catch (err) {
    next(err);
  }
};

export const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.status(200).json(shop);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
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

export const updateShop = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await Shop.findOne({ owner: userId });

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const oldLogoPath = resolvePath(shop.logo);
    const oldBannerPath = resolvePath(shop.banner);

    if (req.body.name) shop.name = req.body.name;
    if (req.body.description) shop.description = req.body.description;

    if (req.files?.logo && req.files.logo[0]) {
      let newLogo = req.files.logo[0].path.replace(/\\/g, '/');
      if (newLogo.includes('public/')) {
        newLogo = newLogo.split('public/')[1];
      }
      if (oldLogoPath) await deleteFileIfExists(oldLogoPath);
      shop.logo = newLogo;
    }

    if (req.files?.banner && req.files.banner[0]) {
      let newBanner = req.files.banner[0].path.replace(/\\/g, '/');
      if (newBanner.includes('public/')) {
        newBanner = newBanner.split('public/')[1];
      }
      if (oldBannerPath) await deleteFileIfExists(oldBannerPath);
      shop.banner = newBanner;
    }

    if (req.body.name) {
      shop.slug = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    await shop.save();

    res.status(200).json({ message: 'Shop updated successfully', shop });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during shop update' });
  }
};