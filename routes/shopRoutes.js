import express from 'express';
import { createShop , getMyShop , updateShop} from '../controllers/shopController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { uploadShopFilesMiddleware } from '../middleware/uploadShopFiles.js'; 

const router = express.Router();

// 🆕 Unified shop creation with images
router.post('/', authenticateJWT, authorizeRoles('seller'), uploadShopFilesMiddleware,createShop);
router.get('/my-shop', authenticateJWT, authorizeRoles('seller'), getMyShop);
router.put('/update-shop', authenticateJWT, authorizeRoles('seller'), uploadShopFilesMiddleware,updateShop);


export default router;

