import { calculatePAYE } from "../utils/calculatePAYE.js";
import { calculateRSSB } from "../utils/calculateRSSB.js";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const serializePayroll = (payroll) => {
  const data = payroll?.toObject ? payroll.toObject() : payroll;

  return {
    id: data._id?.toString?.() || data.id,
    employee: data.employee?._id?.toString?.() || data.employee,
    companyId: data.companyId?._id?.toString?.() || data.companyId,
    owner: data.owner?.toString?.() || data.owner,
    month: data.month,
    grossSalary: data.grossSalary,
    taxableIncome: data.taxableIncome,
    paye: data.paye,
    employeeRSSB: data.employeeRSSB,
    employerRSSB: data.employerRSSB,
    totalRSSB: data.totalRSSB,
    netPay: data.netPay,
    status: data.status,
    source: data.source,
    createdAt: data.createdAt,
  };
};

const findOwnedCompany = async ({ companyId, userId }) => {
  if (!companyId) {
    return null;
  }

  return Company.findOne({ _id: companyId, owner: userId });
};

export const calculatePayroll = async (req, res, next) => {
  try {
    const { employeeId, companyId, month } = req.body || {};
    let { employeeName, grossSalary } = req.body || {};
    let employee = null;
    let company = null;

    if (employeeId) {
      employee = await Employee.findOne({
        _id: employeeId,
        owner: req.user._id,
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found for this user",
        });
      }

      company = await findOwnedCompany({
        companyId: employee.companyId,
        userId: req.user._id,
      });
      employeeName = employeeName || employee.name;
      grossSalary = grossSalary ?? employee.salary;
    } else if (companyId) {
      company = await findOwnedCompany({ companyId, userId: req.user._id });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found for this user",
        });
      }
    }

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
    const payrollRecord = company
      ? await Payroll.create({
          employee: employee?._id,
          companyId: company._id,
          owner: req.user._id,
          month: month || currentMonth(),
          grossSalary: numericGrossSalary,
          taxableIncome: numericGrossSalary - rssb.employeeRSSB,
          paye,
          employeeRSSB: rssb.employeeRSSB,
          employerRSSB: rssb.employerRSSB,
          totalRSSB: rssb.totalRSSB,
          netPay: netSalary,
          status: "processed",
          source: "calculator",
        })
      : null;

    return res.status(200).json({
      success: true,
      data: {
        employeeName,
        grossSalary: numericGrossSalary,
        paye,
        employeeRSSB: rssb.employeeRSSB,
        employerRSSB: rssb.employerRSSB,
        netSalary,
        persisted: Boolean(payrollRecord),
        payrollRecord: payrollRecord ? serializePayroll(payrollRecord) : null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayrollHistory = async (req, res, next) => {
  try {
    const safePage = Math.max(Number(req.query.page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const query = { owner: req.user._id };

    if (req.query.companyId) {
      const company = await findOwnedCompany({
        companyId: req.query.companyId,
        userId: req.user._id,
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found for this user",
        });
      }

      query.companyId = company._id;
    }

    if (req.query.employeeId) {
      const employee = await Employee.findOne({
        _id: req.query.employeeId,
        owner: req.user._id,
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found for this user",
        });
      }

      query.employee = employee._id;
    }

    const [records, total] = await Promise.all([
      Payroll.find(query)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Payroll.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: records.map(serializePayroll),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    return next(error);
  }
};
