// @ts-nocheck
import { getDashboardAnalytics } from "../services/analyticsService.js";

export const dashboardAnalytics = async (req, res, next) => {
  try {
    const data = await getDashboardAnalytics({ limit: req.query.limit });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
