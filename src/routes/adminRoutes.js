import express from "express";

import {
  getAdminCompanies,
  getAdminOverview,
} from "../controllers/adminController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/overview", protect, authorizeRoles("admin"), getAdminOverview);
router.get("/companies", protect, authorizeRoles("admin"), getAdminCompanies);

export default router;
