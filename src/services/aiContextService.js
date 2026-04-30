// @ts-nocheck
import mongoose from "mongoose";

import Company from "../models/Company.js";
import Employee from "../models/Employee.js";

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

  return {
    message,
    language,
    payrollContext: payrollContext || null,
    employeesData:
      summarizeEmployees(employeesData) || employeesData || databaseContext.employeesData,
    companyData:
      summarizeCompanies(companyData) || companyData || databaseContext.companyData,
  };
};
