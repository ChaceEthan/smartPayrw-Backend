// @ts-nocheck
import express from 'express';
import { createCompany, getCompany, registerCompany } from '../controllers/companyController.js'; // Corrected path
import { protect } from '../middleware/authMiddleware.js'; // Corrected path

const router = express.Router();

router.post('/register', protect, registerCompany);
router.route('/').post(protect, createCompany).get(protect, getCompany);

export default router;
