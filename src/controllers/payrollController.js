// @ts-nocheck
import { calculatePAYE } from "../utils/calculatePAYE.js";
import { calculateRSSB } from "../utils/calculateRSSB.js";

// Calculate payroll for one employee
export const calculatePayroll = async (req, res) => {
  try {
    const { employeeName, grossSalary } = req.body;

    if (!grossSalary) {
      return res.status(400).json({
        success: false,
        message: "Gross salary is required",
      });
    }

    // Calculate taxes
    const paye = calculatePAYE(grossSalary);
    const rssb = calculateRSSB(grossSalary);

    // Net salary
    const netSalary = grossSalary - paye - rssb.employeeRSSB;

    return res.status(200).json({
      success: true,
      data: {
        employeeName,
        grossSalary,
        paye,
        employeeRSSB: rssb.employeeRSSB,
        employerRSSB: rssb.employerRSSB,
        netSalary,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};