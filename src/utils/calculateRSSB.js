/**
 * Calculates RSSB (Rwanda Social Security Board) contributions.
 * 
 * Standard Rates for Rwanda:
 * - Pension: 3% Employee, 3% Employer
 * - Occupational Hazards: 2% Employer
 * - Maternity Leave: 0.3% Employee, 0.3% Employer
 * 
 * @param {number} grossSalary - Employee's gross monthly salary.
 * @returns {object} Object containing employee, employer, and total contributions.
 */
export const calculateRSSB = (grossSalary) => {
  const employeeContribution = grossSalary * 0.033; // 3.3% total (Pension + Maternity)
  const employerContribution = grossSalary * 0.053; // 5.3% total (Pension + Hazard + Maternity)

  return {
    employeeRSSB: Math.round(employeeContribution),
    employerRSSB: Math.round(employerContribution),
    totalRSSB: Math.round(employeeContribution + employerContribution),
  };
};