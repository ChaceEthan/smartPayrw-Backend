// @ts-nocheck
import {
  getTaxDashboardByTin,
  getTaxPaymentGuide,
} from "../services/taxDashboardService.js";

export const getTaxDashboard = async (req, res, next) => {
  try {
    const dashboard = await getTaxDashboardByTin({
      tin: req.params.tin,
      user: req.user,
    });

    return res.status(200).json(dashboard);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next(error);
  }
};

export const getTaxPaymentGuideController = async (req, res) => {
  return res.status(200).json(getTaxPaymentGuide());
};

