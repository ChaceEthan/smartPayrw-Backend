// @ts-nocheck
import BusinessTransaction from "../models/BusinessTransaction.js";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

const serializeCompany = (company) => ({
  id: company._id?.toString?.() || company.id,
  name: company.name,
  tin: company.tin,
  businessType: company.businessType,
  owner: company.owner?._id
    ? {
        id: company.owner._id.toString(),
        name: company.owner.name,
        email: company.owner.email,
        role: company.owner.role,
      }
    : company.owner?.toString?.() || company.owner,
  createdAt: company.createdAt,
});

const summarizePayroll = async () => {
  const [summary] = await Payroll.aggregate([
    {
      $group: {
        _id: null,
        runs: { $sum: 1 },
        grossPayroll: { $sum: "$grossSalary" },
        netPayroll: { $sum: "$netPay" },
        paye: { $sum: "$paye" },
        rssb: { $sum: "$totalRSSB" },
      },
    },
  ]);

  return {
    runs: summary?.runs || 0,
    grossPayroll: summary?.grossPayroll || 0,
    netPayroll: summary?.netPayroll || 0,
    paye: summary?.paye || 0,
    rssb: summary?.rssb || 0,
  };
};

const getSystemActivity = async () => {
  const [
    recentUsers,
    recentCompanies,
    recentPayroll,
    recentBusinessTransactions,
    paymentTransactions,
  ] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt").lean(),
    Company.find().sort({ createdAt: -1 }).limit(5).select("name tin businessType owner createdAt").lean(),
    Payroll.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("month grossSalary netPay companyId employee owner createdAt")
      .lean(),
    BusinessTransaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("productOrService amount quantity transactionDate companyId owner createdAt")
      .lean(),
    Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("provider amount status reference requestedBy createdAt")
      .lean(),
  ]);

  return {
    recentUsers,
    recentCompanies,
    recentPayroll,
    recentBusinessTransactions,
    paymentTransactions,
  };
};

export const getAdminOverview = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCompanies,
      totalEmployees,
      totalBusinessTransactions,
      totalPaymentTransactions,
      payroll,
      systemActivity,
    ] = await Promise.all([
      User.countDocuments(),
      Company.countDocuments(),
      Employee.countDocuments(),
      BusinessTransaction.countDocuments(),
      Transaction.countDocuments(),
      summarizePayroll(),
      getSystemActivity(),
    ]);

    return res.status(200).json({
      totalUsers,
      totalCompanies,
      totalEmployees,
      totalPayrollProcessed: payroll.grossPayroll,
      payroll,
      systemActivity: {
        ...systemActivity,
        totals: {
          users: totalUsers,
          companies: totalCompanies,
          employees: totalEmployees,
          businessTransactions: totalBusinessTransactions,
          paymentTransactions: totalPaymentTransactions,
          payrollRuns: payroll.runs,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find()
      .populate("owner", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      companies: companies.map(serializeCompany),
    });
  } catch (error) {
    return next(error);
  }
};
