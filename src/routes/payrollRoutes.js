// @ts-nocheck
import express from 'express';
import { calculatePayroll, getPayrollHistory } from '../controllers/payrollController.js'; // Corrected path
import { protect } from '../middleware/authMiddleware.js'; // Corrected path

const router = express.Router();

router.get('/', protect, getPayrollHistory);
router.post('/calculate', protect, calculatePayroll);
router.get('/history', protect, getPayrollHistory);

export default router;
