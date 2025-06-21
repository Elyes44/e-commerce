import { registerLocalUser } from '../controllers/userController.js';
import express from 'express';

const router = express.Router();


router.post('/register', registerLocalUser); 


export default router;  // Changed this line
