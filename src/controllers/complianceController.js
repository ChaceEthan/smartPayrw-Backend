// @ts-nocheck
import { getComplianceData } from "../services/complianceService.js";

export const getCompliance = async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: getComplianceData(),
  });
};
