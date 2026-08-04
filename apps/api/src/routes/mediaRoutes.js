import express from 'express';
import { uploadMedia } from '../controllers/mediaController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

router.post('/upload', authLimiter, upload.single('file'), uploadMedia);

export default router;
