import express from "express";

import {
  getTaxDashboard,
  getTaxPaymentGuideController,
} from "../controllers/taxController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/dashboard/:tin", getTaxDashboard);
router.get("/payment-guide", getTaxPaymentGuideController);

export default router;

