import express from 'express';
import { createShop , getMyShop , updateShop} from '../controllers/shopController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { uploadShopFilesMiddleware } from '../middleware/uploadShopFiles.js'; 
import { uploadAvatarMiddleware } from '../middleware/uploadAvatarMiddleware.js';
import {uploadUserAvatar , deleteAvatar } from '../controllers/userController.js';
const router = express.Router();

// 🆕 Unified shop creation with images
router.post('/', authenticateJWT, authorizeRoles('seller'), uploadShopFilesMiddleware,createShop);
router.get('/my-shop', authenticateJWT, authorizeRoles('seller'), getMyShop);
router.put('/update-shop', authenticateJWT, authorizeRoles('seller'), uploadShopFilesMiddleware,updateShop);
router.put('/avatar', authenticateJWT, uploadAvatarMiddleware, uploadUserAvatar);
router.delete("/delete-avatar", authenticateJWT, deleteAvatar);



export default router;

