import express from "express";

import {
  getTransactions,
  paymentCallback,
  paymentWebhook,
  requestAirtelPayment,
  requestMTNPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getTransactions);
router.post("/mtn/request", requestMTNPayment);
router.post("/airtel/request", requestAirtelPayment);
router.post("/callback", paymentCallback);
router.post("/webhook", paymentWebhook);

export default router;
