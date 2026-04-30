// @ts-nocheck
import { getPensionSummary } from "../services/pensionService.js";

export const getPension = async (req, res, next) => {
  try {
    const data = await getPensionSummary({
      grossSalary: req.query.grossSalary,
      companyId: req.query.companyId,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};
