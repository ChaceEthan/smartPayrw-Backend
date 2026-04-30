import { calculatePAYE } from "../utils/calculatePAYE.js";
import { calculateRSSB } from "../utils/calculateRSSB.js";

export const calculatePayroll = async (req, res, next) => {
  try {
    const { employeeName, grossSalary } = req.body;
    const numericGrossSalary = Number(grossSalary);

    if (!Number.isFinite(numericGrossSalary) || numericGrossSalary <= 0) {
      return res.status(400).json({
        success: false,
        message: "Gross salary must be a positive number",
      });
    }

    const paye = calculatePAYE(numericGrossSalary);
    const rssb = calculateRSSB(numericGrossSalary);
    const netSalary = numericGrossSalary - paye - rssb.employeeRSSB;

    return res.status(200).json({
      success: true,
      data: {
        employeeName,
        grossSalary: numericGrossSalary,
        paye,
        employeeRSSB: rssb.employeeRSSB,
        employerRSSB: rssb.employerRSSB,
        netSalary,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollHistory = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: [],
  });
};
