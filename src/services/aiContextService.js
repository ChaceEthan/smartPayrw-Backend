// @ts-nocheck
import mongoose from "mongoose";

import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import { getTaxContextData } from "./complianceService.js";
import { buildPensionSummaryFromEmployees } from "./pensionService.js";
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
      firstName: record.firstName,
      lastName: record.lastName,
      salary,
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
    };
  });

  return {
    count: companies.length,
    includedCount: safeCompanies.length,
    companies: safeCompanies,
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

const getDatabaseContext = async () => {
  if (mongoose.connection.readyState !== 1) {
    return {
      employeesData: null,
      companyData: null,
    };
  }

  const [employees, companies] = await Promise.all([
    Employee.find({})
      .select("firstName lastName salary rssbNumber")
      .sort({ createdAt: -1 })
      .limit(MAX_CONTEXT_RECORDS)
      .lean(),
    Company.find({})
      .select("name tin")
      .sort({ createdAt: -1 })
      .limit(MAX_CONTEXT_RECORDS)
      .lean(),
  ]);

  return {
    employeesData: summarizeEmployees(employees),
    companyData: summarizeCompanies(companies),
  };
};

export const buildAIContextPayload = async ({
  message,
  language,
  payrollContext,
  employeesData,
  companyData,
}) => {
  const databaseContext = await getDatabaseContext();
  const finalEmployeesData =
    summarizeEmployees(employeesData) || employeesData || databaseContext.employeesData;
  const finalCompanyData =
    summarizeCompanies(companyData) || companyData || databaseContext.companyData;
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
    pensionData,
    taxData: buildPayrollTaxSummary(finalEmployeesData),
    complianceData: getTaxContextData().compliance,
  };
};
