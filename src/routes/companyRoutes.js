// @ts-nocheck
import express from 'express';
import { createCompany, getCompany } from '../controllers/companyController.js'; // Corrected path
import { protect } from '../middleware/authMiddleware.js'; // Corrected path

const router = express.Router();

router.route('/').post(protect, createCompany).get(protect, getCompany);

export default router;