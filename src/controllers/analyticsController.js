// @ts-nocheck
import { getDashboardAnalytics } from "../services/analyticsService.js";

export const dashboardAnalytics = async (req, res, next) => {
  try {
    const data = await getDashboardAnalytics({
      companyId: req.query.companyId,
      limit: req.query.limit,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
