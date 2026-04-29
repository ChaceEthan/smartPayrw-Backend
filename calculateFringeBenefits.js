// @ts-nocheck (No internal imports to change)
/**
 * Utility to handle Rwandan fringe benefits and bonuses.
 * In Rwanda, allowances like housing and transport are often part of the total taxable gross.
 * 
 * @param {number} baseSalary - The base contract salary.
 * @param {object} benefits - Optional benefits (housing, transport, performance bonuses).
 * @returns {number} The total gross salary.
 */
export const calculateTotalGross = (baseSalary, benefits = {}) => {
  const { 
    housing = 0, 
    transport = 0, 
    bonus = 0, 
    otherAllowances = 0 
  } = benefits;

  return baseSalary + housing + transport + bonus + otherAllowances;
};