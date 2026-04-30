// @ts-nocheck
import Employee from "../models/Employee.js";

export const PENSION_RATES = {
  employee: 0.03,
  employer: 0.05,
};

const roundMoney = (amount) => Math.round(Number(amount) || 0);

const normalizeSalary = (salary) => {
  const amount = Number(salary);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export const calculatePensionForSalary = (salary) => {
  const salaryBase = normalizeSalary(salary);

  if (salaryBase === null) {
    const error = new Error("Salary must be a positive number or zero");
    error.statusCode = 400;
    throw error;
  }

  const employeeContribution = roundMoney(salaryBase * PENSION_RATES.employee);
  const employerContribution = roundMoney(salaryBase * PENSION_RATES.employer);

  return {
    salaryBase: roundMoney(salaryBase),
    employeeContribution,
    employerContribution,
    totalPension: employeeContribution + employerContribution,
  };
};

export const buildPensionSummaryFromEmployees = (employees = []) => {
  const employeeList = Array.isArray(employees) ? employees : [];

  return employeeList.reduce(
    (summary, employee) => {
      const salary = Number(employee?.salary) || 0;
      const pension = calculatePensionForSalary(salary);

      summary.salaryBase += pension.salaryBase;
      summary.employeeContribution += pension.employeeContribution;
      summary.employerContribution += pension.employerContribution;
      summary.totalPension += pension.totalPension;
      summary.employeeCount += 1;

      return summary;
    },
    {
      salaryBase: 0,
      employeeContribution: 0,
      employerContribution: 0,
      totalPension: 0,
      employeeCount: 0,
    }
  );
};

export const getPensionSummary = async ({ grossSalary } = {}) => {
  let summary;

  if (grossSalary !== undefined && grossSalary !== null && grossSalary !== "") {
    summary = {
      ...calculatePensionForSalary(grossSalary),
      employeeCount: 1,
    };
  } else {
    const employees = await Employee.find({}).select("salary").lean();
    summary = buildPensionSummaryFromEmployees(employees);
  }

  return {
    ...summary,
    rates: {
      employee: PENSION_RATES.employee,
      employer: PENSION_RATES.employer,
    },
    description:
      "RSSB pension estimate: the employee contributes 3% and the employer contributes 5% of the salary base in this SmartPayRW summary. The employer share includes the employer pension contribution and occupational hazards cover used for dashboard planning.",
  };
};
