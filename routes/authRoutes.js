import express from 'express';
import { registerLocalUser, loginLocalUser , logout } from '../controllers/userController.js';

const router = express.Router();

router.post('/register', registerLocalUser);
router.post('/login', loginLocalUser);
router.post('/logout', logout);

export default router;