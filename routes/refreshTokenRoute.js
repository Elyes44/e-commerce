import { refreshAccessToken  } from '../controllers/userController.js';
import express from 'express';

const router = express.Router();


router.post('/refresh-token', refreshAccessToken); 


export default router;  
