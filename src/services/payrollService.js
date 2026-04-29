// @ts-nocheck
import { calculatePAYE } from '../utils/calculatePAYE.js'; // Corrected path
import { calculateRSSB } from '../utils/calculateRSSB.js'; // Corrected path
import { calculateTotalGross } from '../utils/calculateFringeBenefits.js'; // Corrected path

// Encapsulates complex business logic for payroll processing (No internal imports to change)
export const processMonthlyPayroll = async (payrollData) => {
  const { baseSalary, benefits } = payrollData;

  // 0. Calculate Total Gross (Base + Benefits)
  const grossSalary = calculateTotalGross(baseSalary, benefits);

  // 1. Calculate RSSB (Social Security)
  const rssb = calculateRSSB(grossSalary);

  // 2. Calculate Taxable Income (Gross - Employee RSSB)
  // In Rwanda, pension contributions are deducted before tax calculation
  const taxableIncome = grossSalary - rssb.employeeRSSB;

  // 3. Calculate PAYE (Income Tax)
  const paye = calculatePAYE(taxableIncome);

  // 4. Calculate Net Pay
  const netPay = grossSalary - rssb.employeeRSSB - paye;

  return {
    grossSalary,
    taxableIncome,
    employeeRSSB: rssb.employeeRSSB,
    employerRSSB: rssb.employerRSSB,
    paye,
    netPay,
    status: 'processed'
  };
};