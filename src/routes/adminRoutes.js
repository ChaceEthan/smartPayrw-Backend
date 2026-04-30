import express from "express";

import { getAdminOverview } from "../controllers/adminController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/overview", protect, authorizeRoles("admin"), getAdminOverview);

export default router;

