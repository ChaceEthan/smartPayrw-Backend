// @ts-nocheck
import mongoose from "mongoose";

import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import { buildPensionSummaryFromEmployees } from "./pensionService.js";
import { getTaxContextData } from "./complianceService.js";
import { calculatePAYE } from "../utils/calculatePAYE.js";
import { calculateRSSB } from "../utils/calculateRSSB.js";

const CURRENCY = "RWF";

const roundMoney = (amount) => Math.round(Number(amount) || 0);
const normalizeTIN = (tin) => String(tin || "").replace(/\D/g, "");

const currentMonth = () => new Date().toISOString().slice(0, 7);

const formatDateKey = (date) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  return safeDate.toISOString().slice(0, 10);
};

const getNextMonthlyDeadline = (day = 15) => {
  const today = new Date();
  const deadline = new Date(today.getFullYear(), today.getMonth(), day);

  if (today.getDate() > day) {
    deadline.setMonth(deadline.getMonth() + 1);
  }

  return formatDateKey(deadline);
};

export const getTaxPaymentGuide = () => ({
  disclaimer:
    "SmartPayRW provides a payment guide only. It does not process, collect, or settle real tax payments.",
  mobileMoney: {
    provider: "MTN Mobile Money",
    steps: [
      "Log in to the official RRA e-tax portal and generate the declaration/payment reference.",
      "Open MTN MoMo on your phone or approved payment channel.",
      "Choose Pay Bill or Taxes, then select the RRA/tax payment option where available.",
      "Enter the RRA payment reference and the exact amount from the e-tax portal.",
      "Confirm the beneficiary details before approving the MoMo transaction.",
      "Keep the SMS receipt and reconcile it with the e-tax portal status.",
    ],
  },
  bankPayment: {
    steps: [
      "Generate the tax declaration and payment reference in the RRA e-tax portal.",
      "Use your bank branch, internet banking, or mobile banking tax payment menu.",
      "Enter the RRA reference number, TIN, tax type, and declared amount exactly as shown.",
      "Confirm the account debit and save the bank receipt.",
      "Return to e-tax to verify that the payment has been matched to the declaration.",
    ],
  },
  eTax: {
    portal: "RRA e-tax",
    instructions: [
      "Use the official RRA e-tax system for declarations and official payment references.",
      "Confirm the tax period, tax type, TIN, and amount before submitting.",
      "Use only approved RRA payment channels after generating the reference.",
      "Archive the declaration acknowledgement, payment receipt, and payroll support files.",
    ],
  },
});

export const getTaxDeadlines = () => [
  {
    taxType: "PAYE",
    cadence: "Monthly",
    dueDay: 15,
    nextDueDate: getNextMonthlyDeadline(15),
    description:
      "Declare and pay PAYE by the 15th day after the end of the tax period. Verify current RRA guidance before filing.",
  },
  {
    taxType: "RSSB",
    cadence: "Monthly",
    dueDay: 15,
    nextDueDate: getNextMonthlyDeadline(15),
    description:
      "Declare and pay RSSB pension and statutory payroll contributions by the 15th day of the following month. Verify current RSSB guidance before filing.",
  },
  {
    taxType: "VAT",
    cadence: "Monthly where registered/applicable",
    dueDay: 15,
    nextDueDate: getNextMonthlyDeadline(15),
    description:
      "VAT applies only where the company is VAT registered or otherwise required to file. Confirm status in RRA e-tax.",
  },
];

const serializeCompany = (company, source) => ({
  id: company?._id?.toString?.() || company?.id || null,
  name: company?.name || "SmartPayRW Simulated Company",
  tin: company?.tin,
  businessType: company?.businessType || "SME services",
  source,
});

const serializeEmployeePayroll = (employee) => {
  const salary = roundMoney(employee?.salary);
  const paye = calculatePAYE(salary);
  const rssb = calculateRSSB(salary);
  const netPay = salary - paye - rssb.employeeRSSB;

  return {
    id: employee?._id?.toString?.() || employee?.id || null,
    name:
      employee?.name ||
      [employee?.firstName, employee?.lastName].filter(Boolean).join(" ").trim() ||
      "Employee",
    grossSalary: salary,
    paye,
    employeeRSSB: rssb.employeeRSSB,
    employerRSSB: rssb.employerRSSB,
    totalRSSB: rssb.totalRSSB,
    netPay,
  };
};

const buildPayrollSummary = (employees, source) => {
  const employeePayroll = employees.map(serializeEmployeePayroll);
  const totals = employeePayroll.reduce(
    (summary, employee) => {
      summary.totalGross += employee.grossSalary;
      summary.totalNet += employee.netPay;
      summary.totalPAYE += employee.paye;
      summary.employeeRSSB += employee.employeeRSSB;
      summary.employerRSSB += employee.employerRSSB;
      summary.totalRSSB += employee.totalRSSB;
      summary.employerPayrollCost += employee.grossSalary + employee.employerRSSB;
      return summary;
    },
    {
      totalGross: 0,
      totalNet: 0,
      totalPAYE: 0,
      employeeRSSB: 0,
      employerRSSB: 0,
      totalRSSB: 0,
      employerPayrollCost: 0,
    }
  );

  return {
    period: currentMonth(),
    currency: CURRENCY,
    source,
    employeeCount: employeePayroll.length,
    ...totals,
    employees: employeePayroll,
  };
};

const buildSimulatedEmployees = () => [
  { name: "Operations Lead", salary: 350000 },
  { name: "Sales Associate", salary: 220000 },
  { name: "Account Assistant", salary: 180000 },
];

const buildDashboard = ({ company, employees, source }) => {
  const payroll = buildPayrollSummary(employees, source);
  const pension = buildPensionSummaryFromEmployees(employees);
  const compliance = getTaxContextData();

  return {
    company: serializeCompany(company, source),
    payroll,
    paye: {
      amount: payroll.totalPAYE,
      currency: CURRENCY,
      period: payroll.period,
      basis: "Estimated from stored employee gross salaries",
      bands: compliance.payeBands,
    },
    rssb: {
      employeeContribution: payroll.employeeRSSB,
      employerContribution: payroll.employerRSSB,
      total: payroll.totalRSSB,
      currency: CURRENCY,
      rates: compliance.rssb,
      basis: "Estimated payroll statutory contribution summary",
    },
    pension: {
      ...pension,
      currency: CURRENCY,
      rates: {
        employee: 0.03,
        employer: 0.05,
      },
      basis: "RSSB pension planning summary from employee salary records",
    },
    deadlines: getTaxDeadlines(),
    paymentOptions: {
      guideEndpoint: "/api/tax/payment-guide",
      disclaimer: getTaxPaymentGuide().disclaimer,
      options: ["MTN Mobile Money guide", "Bank payment guide", "RRA e-tax guide"],
    },
  };
};

const buildFallbackDashboard = (tin) =>
  buildDashboard({
    source: "simulation",
    company: {
      name: "SmartPayRW Simulated Company",
      tin,
      businessType: "SME services",
    },
    employees: buildSimulatedEmployees(),
  });

export const getTaxDashboardByTin = async ({ tin, user }) => {
  const normalizedTIN = normalizeTIN(tin);

  if (!/^\d{9}$/.test(normalizedTIN)) {
    const error = new Error("TIN must be a 9-digit number");
    error.statusCode = 400;
    throw error;
  }

  if (mongoose.connection.readyState !== 1) {
    return buildFallbackDashboard(normalizedTIN);
  }

  const companyQuery = { tin: normalizedTIN };

  if (user?.role !== "admin") {
    companyQuery.owner = user?._id;
  }

  const company = await Company.findOne(companyQuery)
    .select("name tin businessType owner")
    .lean();

  if (!company) {
    return buildFallbackDashboard(normalizedTIN);
  }

  const employees = await Employee.find({
    companyId: company._id,
    ...(user?.role === "admin" ? {} : { owner: user?._id }),
  })
    .select("name firstName lastName salary companyId rssbNumber")
    .sort({ createdAt: -1 })
    .lean();

  return buildDashboard({
    company,
    employees,
    source: "database",
  });
};

