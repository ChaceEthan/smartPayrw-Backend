// @ts-nocheck
import mongoose from "mongoose";

import BusinessTransaction from "../models/BusinessTransaction.js";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import { getTaxContextData } from "./complianceService.js";
import { buildPensionSummaryFromEmployees } from "./pensionService.js";
import { getTaxDashboardByTin } from "./taxDashboardService.js";
import { calculatePAYE } from "../utils/calculatePAYE.js";
import { calculateRSSB } from "../utils/calculateRSSB.js";

const MAX_CONTEXT_RECORDS = 20;

const toPlainObject = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value.toObject === "function") {
    return value.toObject();
  }

  return value;
};

const summarizeEmployees = (employees = []) => {
  if (!Array.isArray(employees) || employees.length === 0) {
    return null;
  }

  const safeEmployees = employees.slice(0, MAX_CONTEXT_RECORDS).map((employee) => {
    const record = toPlainObject(employee) || {};
    const salary = Number(record.salary) || 0;

    return {
      id: record._id?.toString?.() || record.id,
      name: record.name || [record.firstName, record.lastName].filter(Boolean).join(" ").trim(),
      firstName: record.firstName,
      lastName: record.lastName,
      salary,
      companyId: record.companyId?.toString?.() || record.companyId,
      hasRSSBNumber: Boolean(record.rssbNumber),
    };
  });

  const totalMonthlyGrossSalary = safeEmployees.reduce(
    (total, employee) => total + (Number(employee.salary) || 0),
    0
  );

  return {
    count: employees.length,
    includedCount: safeEmployees.length,
    totalMonthlyGrossSalary,
    averageSalary: safeEmployees.length
      ? Math.round(totalMonthlyGrossSalary / safeEmployees.length)
      : 0,
    employees: safeEmployees,
  };
};

const summarizeCompanies = (companies = []) => {
  if (!Array.isArray(companies) || companies.length === 0) {
    return null;
  }

  const safeCompanies = companies.slice(0, MAX_CONTEXT_RECORDS).map((company) => {
    const record = toPlainObject(company) || {};

    return {
      id: record._id?.toString?.() || record.id,
      name: record.name,
      tin: record.tin,
      businessType: record.businessType,
    };
  });

  return {
    count: companies.length,
    includedCount: safeCompanies.length,
    companies: safeCompanies,
  };
};

const summarizeBusinessTransactions = (transactions = [], totalCount = transactions.length) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return null;
  }

  const dailySales = {};
  const stockSummary = {};
  const safeTransactions = transactions.slice(0, MAX_CONTEXT_RECORDS).map((transaction) => {
    const record = toPlainObject(transaction) || {};
    const amount = Number(record.amount) || 0;
    const quantity = Number(record.quantity) || 1;
    const productOrService = record.productOrService || "Unspecified";
    const date = record.transactionDate
      ? new Date(record.transactionDate).toISOString().slice(0, 10)
      : null;

    if (date) {
      dailySales[date] = {
        date,
        totalSales: (dailySales[date]?.totalSales || 0) + amount,
        transactionCount: (dailySales[date]?.transactionCount || 0) + 1,
        quantitySold: (dailySales[date]?.quantitySold || 0) + quantity,
      };
    }

    stockSummary[productOrService] = {
      productOrService,
      quantitySold: (stockSummary[productOrService]?.quantitySold || 0) + quantity,
      totalSales: (stockSummary[productOrService]?.totalSales || 0) + amount,
      transactionCount:
        (stockSummary[productOrService]?.transactionCount || 0) + 1,
    };

    return {
      id: record._id?.toString?.() || record.id,
      productOrService,
      amount,
      quantity,
      date,
      companyId: record.companyId?.toString?.() || record.companyId,
    };
  });

  const totalSales = safeTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  );

  return {
    count: totalCount,
    includedCount: safeTransactions.length,
    totalSales,
    averageSale: safeTransactions.length ? Math.round(totalSales / safeTransactions.length) : 0,
    transactions: safeTransactions,
    dailySales: Object.values(dailySales).sort((a, b) => b.date.localeCompare(a.date)),
    stockSummary: Object.values(stockSummary).sort((a, b) => b.totalSales - a.totalSales),
  };
};

const getEmployeesForCalculations = (employeesData) => {
  if (!employeesData) {
    return [];
  }

  if (Array.isArray(employeesData)) {
    return employeesData;
  }

  if (Array.isArray(employeesData.employees)) {
    return employeesData.employees;
  }

  return [];
};

const buildPayrollTaxSummary = (employeesData) => {
  const employees = getEmployeesForCalculations(employeesData);

  const totals = employees.reduce(
    (summary, employee) => {
      const salary = Number(employee?.salary) || 0;
      const paye = calculatePAYE(salary);
      const rssb = calculateRSSB(salary);

      summary.salaryBase += salary;
      summary.paye += paye;
      summary.employeeRSSB += rssb.employeeRSSB;
      summary.employerRSSB += rssb.employerRSSB;
      summary.totalRSSB += rssb.totalRSSB;
      summary.totalTaxAndRSSB += paye + rssb.totalRSSB;

      return summary;
    },
    {
      salaryBase: 0,
      paye: 0,
      employeeRSSB: 0,
      employerRSSB: 0,
      totalRSSB: 0,
      totalTaxAndRSSB: 0,
    }
  );

  return {
    ...totals,
    rules: getTaxContextData(),
  };
};

const getDatabaseContext = async (userId, tin) => {
  if (mongoose.connection.readyState !== 1) {
    return {
      employeesData: null,
      companyData: null,
      businessData: null,
      taxDashboardData: null,
    };
  }

  const query = userId ? { owner: userId } : {};
  const tinQuery = tin ? { ...query, tin } : null;
  const matchedCompany = tinQuery
    ? await Company.findOne(tinQuery).select("name tin businessType").lean()
    : null;
  const employeeQuery = matchedCompany
    ? { ...query, companyId: matchedCompany._id }
    : query;
  const [employees, companies] = await Promise.all([
    Employee.find(employeeQuery)
      .select("name firstName lastName salary companyId rssbNumber")
      .sort({ createdAt: -1 })
      .limit(MAX_CONTEXT_RECORDS)
      .lean(),
    matchedCompany
      ? Promise.resolve([matchedCompany])
      : Company.find(query)
          .select("name tin businessType")
          .sort({ createdAt: -1 })
          .limit(MAX_CONTEXT_RECORDS)
          .lean(),
  ]);
  const businessQuery = { ...query };
  const companyIds = matchedCompany
    ? [matchedCompany._id]
    : companies.map((company) => company._id).filter(Boolean);

  if (companyIds.length > 0) {
    businessQuery.companyId = { $in: companyIds };
  }

  const [businessTransactions, businessTotal] =
    companyIds.length > 0
      ? await Promise.all([
          BusinessTransaction.find(businessQuery)
            .select("productOrService amount quantity transactionDate companyId")
            .sort({ transactionDate: -1, createdAt: -1 })
            .limit(MAX_CONTEXT_RECORDS)
            .lean(),
          BusinessTransaction.countDocuments(businessQuery),
        ])
      : [[], 0];
  const dashboardTIN = tin || companies[0]?.tin || null;
  const taxDashboardData = dashboardTIN
    ? await getTaxDashboardByTin({
        tin: dashboardTIN,
        user: {
          _id: userId,
          role: "user",
        },
      })
    : null;

  return {
    employeesData: summarizeEmployees(employees),
    companyData: summarizeCompanies(companies),
    businessData: summarizeBusinessTransactions(businessTransactions, businessTotal),
    taxDashboardData,
    tinLookup: tin
      ? {
          tin,
          found: Boolean(matchedCompany),
        }
      : null,
  };
};

export const buildAIContextPayload = async ({
  message,
  language,
  payrollContext,
  employeesData,
  companyData,
  userId,
  tin,
}) => {
  const databaseContext = await getDatabaseContext(userId, tin);
  const requestEmployeesData = userId
    ? null
    : summarizeEmployees(employeesData) || employeesData;
  const requestCompanyData = userId ? null : summarizeCompanies(companyData) || companyData;
  const finalEmployeesData =
    databaseContext.employeesData || requestEmployeesData;
  const finalCompanyData = databaseContext.companyData || requestCompanyData;
  const pensionData = {
    ...buildPensionSummaryFromEmployees(getEmployeesForCalculations(finalEmployeesData)),
    description:
      "RSSB pension context for AI answers: employee contribution is 3% and employer planning contribution is 5% of salary base.",
  };

  return {
    message,
    language,
    payrollContext: payrollContext || null,
    employeesData: finalEmployeesData,
    companyData: finalCompanyData,
    tinLookup: databaseContext.tinLookup,
    pensionData,
    taxData: buildPayrollTaxSummary(finalEmployeesData),
    taxDashboardData: databaseContext.taxDashboardData,
    businessData: databaseContext.businessData,
    complianceData: getTaxContextData().compliance,
  };
};
