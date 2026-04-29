// @ts-nocheck
import express from 'express';
import { addEmployee, getEmployees } from '../controllers/employeeController.js'; // Corrected path
import { protect } from '../middleware/authMiddleware.js'; // Corrected path
import { validateEmployee } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.route('/').post(protect, validateEmployee, addEmployee).get(protect, getEmployees);

export default router;