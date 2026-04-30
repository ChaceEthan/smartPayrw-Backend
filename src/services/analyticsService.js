import Employee from "../models/Employee.js";
import Transaction from "../models/Transaction.js";
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
      const netPay = salary - paye - rssb.employeeRSSB;

      totals.totalSalaries += salary;
      totals.totalPAYE += paye;
      totals.totalEmployeeRSSB += rssb.employeeRSSB;
      totals.totalEmployerRSSB += rssb.employerRSSB;
      totals.totalRSSB += rssb.totalRSSB;
      totals.netPayouts += netPay;

      return totals;
    },
    {
      totalSalaries: 0,
      totalPAYE: 0,
      totalEmployeeRSSB: 0,
      totalEmployerRSSB: 0,
      totalRSSB: 0,
      netPayouts: 0,
    }
  );
};

const buildPaymentStats = async () => {
  const stats = await Transaction.aggregate([
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

export const getDashboardAnalytics = async ({ limit = 10 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  const [employees, recentTransactions, paymentStats] = await Promise.all([
    Employee.find({}).select("salary").lean(),
    Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .select("provider amount currency phoneNumber reference status simulated createdAt")
      .lean(),
    buildPaymentStats(),
  ]);

  const payrollAnalytics = buildPayrollAnalytics(employees);

  return {
    totalEmployees: employees.length,
    totalPayroll: payrollAnalytics.totalSalaries,
    totalTaxes: payrollAnalytics.totalPAYE + payrollAnalytics.totalEmployeeRSSB,
    recentTransactions: recentTransactions.map(serializeTransaction),
    paymentStats,
    payrollAnalytics,
  };
};
