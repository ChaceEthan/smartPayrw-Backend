// @ts-nocheck
import Employee from "../models/Employee.js";
import Transaction from "../models/Transaction.js";
import { calculatePensionForSalary } from "./pensionService.js";
import { calculatePAYE } from "../utils/calculatePAYE.js";
import { calculateRSSB } from "../utils/calculateRSSB.js";

const serializeTransaction = (transaction) => ({
  id: transaction._id?.toString?.() || transaction.id,
  provider: transaction.provider,
  amount: transaction.amount,
  currency: transaction.currency,
  phoneNumber: transaction.phoneNumber,
  reference: transaction.reference,
  status: transaction.status,
  simulated: transaction.simulated,
  createdAt: transaction.createdAt,
});

const buildPayrollAnalytics = (employees) => {
  return employees.reduce(
    (totals, employee) => {
      const salary = Number(employee.salary) || 0;
      const paye = calculatePAYE(salary);
      const rssb = calculateRSSB(salary);
      const pension = calculatePensionForSalary(salary);
      const netPay = salary - paye - rssb.employeeRSSB;

      totals.totalSalaries += salary;
      totals.totalPAYE += paye;
      totals.totalEmployeeRSSB += rssb.employeeRSSB;
      totals.totalEmployerRSSB += rssb.employerRSSB;
      totals.totalRSSB += rssb.totalRSSB;
      totals.employeePension += pension.employeeContribution;
      totals.employerPension += pension.employerContribution;
      totals.totalPension += pension.totalPension;
      totals.netPayouts += netPay;

      return totals;
    },
    {
      totalSalaries: 0,
      totalPAYE: 0,
      totalEmployeeRSSB: 0,
      totalEmployerRSSB: 0,
      totalRSSB: 0,
      employeePension: 0,
      employerPension: 0,
      totalPension: 0,
      netPayouts: 0,
    }
  );
};

const buildPaymentStats = async (match = {}) => {
  const stats = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          provider: "$provider",
          status: "$status",
        },
        count: { $sum: 1 },
        amount: { $sum: "$amount" },
      },
    },
  ]);

  return stats.reduce(
    (result, item) => {
      const provider = item._id.provider || "unknown";
      const status = item._id.status || "unknown";

      result.totalTransactions += item.count;
      result.totalAmount += item.amount;
      result.byStatus[status] = {
        count: (result.byStatus[status]?.count || 0) + item.count,
        amount: (result.byStatus[status]?.amount || 0) + item.amount,
      };
      result.byProvider[provider] = {
        count: (result.byProvider[provider]?.count || 0) + item.count,
        amount: (result.byProvider[provider]?.amount || 0) + item.amount,
      };

      return result;
    },
    {
      totalTransactions: 0,
      totalAmount: 0,
      byStatus: {},
      byProvider: {},
    }
  );
};

export const getDashboardAnalytics = async ({ companyId, limit = 10, userId } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  const employeeQuery = {};
  const transactionQuery = {};

  if (userId) {
    employeeQuery.owner = userId;
    transactionQuery.requestedBy = userId;
  }

  if (companyId) {
    employeeQuery.companyId = companyId;
  }

  const [employees, recentTransactions, paymentStats] = await Promise.all([
    Employee.find(employeeQuery).select("salary companyId").lean(),
    Transaction.find(transactionQuery)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .select("provider amount currency phoneNumber reference status simulated createdAt")
      .lean(),
    buildPaymentStats(transactionQuery),
  ]);

  const payrollAnalytics = buildPayrollAnalytics(employees);
  const taxes = {
    paye: payrollAnalytics.totalPAYE,
    employeeRSSB: payrollAnalytics.totalEmployeeRSSB,
    employerRSSB: payrollAnalytics.totalEmployerRSSB,
    totalRSSB: payrollAnalytics.totalRSSB,
    total: payrollAnalytics.totalPAYE + payrollAnalytics.totalRSSB,
    description:
      "Total taxes combine PAYE and RSSB contributions for the current employee salary records.",
  };
  const pension = {
    employeeContribution: payrollAnalytics.employeePension,
    employerContribution: payrollAnalytics.employerPension,
    totalPension: payrollAnalytics.totalPension,
    description:
      "RSSB pension estimate uses 3% employee contribution and 5% employer planning contribution.",
  };
  const employeeSummary = {
    total: employees.length,
    salaryTotal: payrollAnalytics.totalSalaries,
    averageSalary: employees.length
      ? Math.round(payrollAnalytics.totalSalaries / employees.length)
      : 0,
  };

  return {
    totalEmployees: employees.length,
    totalPayroll: payrollAnalytics.totalSalaries,
    payrollTotal: payrollAnalytics.totalSalaries,
    totalTaxes: taxes.total,
    taxes,
    pension,
    employees: employeeSummary,
    recentTransactions: recentTransactions.map(serializeTransaction),
    paymentStats,
    payrollAnalytics: {
      ...payrollAnalytics,
      totalTaxes: taxes.total,
    },
  };
};
