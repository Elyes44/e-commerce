import { refreshAccessToken  } from '../controllers/userController.js';
import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();


router.post('/refresh-token', authenticateJWT, refreshAccessToken); 


export default router;  
