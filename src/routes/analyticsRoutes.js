import express from "express";

import { dashboardAnalytics } from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", protect, dashboardAnalytics);

export default router;
