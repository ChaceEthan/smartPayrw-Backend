// @ts-nocheck
import express from 'express';
import { generateTaxReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/tax', protect, generateTaxReport);

export default router;