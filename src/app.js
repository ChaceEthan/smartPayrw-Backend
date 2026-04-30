// @ts-nocheck
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import aiRoutes from "./routes/aiRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import complianceRoutes from "./routes/complianceRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import pensionRoutes from "./routes/pensionRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "https://smart-payrw-frontend.vercel.app",
];

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const mongoStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
};

const healthResponse = () => ({
  status: "ok",
  environment: process.env.NODE_ENV || "development",
  mongodb: mongoStatus(),
  timestamp: new Date().toISOString(),
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "SmartPayRW Backend is running",
  });
});

app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    ...healthResponse(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/pension", pensionRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tax", taxRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
