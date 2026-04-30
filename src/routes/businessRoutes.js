import express from "express";

import {
  createBusinessTransaction,
  getBusinessTransactions,
} from "../controllers/businessController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router
  .route("/transactions")
  .post(createBusinessTransaction)
  .get(getBusinessTransactions);

export default router;

