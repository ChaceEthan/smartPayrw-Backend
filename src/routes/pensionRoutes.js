import express from "express";

import { getPension } from "../controllers/pensionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getPension);

export default router;
