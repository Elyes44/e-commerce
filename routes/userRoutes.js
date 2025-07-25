import express from 'express';
import { updatePersonalInfo } from '../controllers/userController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.put('/personal-infos', authenticateJWT, updatePersonalInfo);


export default router;