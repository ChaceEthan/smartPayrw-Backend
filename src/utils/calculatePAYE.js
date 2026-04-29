// @ts-nocheck
// Pure utility function to calculate Rwanda PAYE tax based on gross income (No internal imports to change)
export const calculatePAYE = (grossSalary) => {
  let tax = 0;

  if (grossSalary <= 60000) {
    tax = 0;
  } else if (grossSalary <= 100000) {
    // 10% on the amount between 60,001 and 100,000
    tax = (grossSalary - 60000) * 0.10;
  } else if (grossSalary <= 200000) {
    // 4,000 (from previous bracket) + 20% on the amount between 100,001 and 200,000
    tax = 4000 + (grossSalary - 100000) * 0.20;
  } else {
    // 4,000 + 20,000 (from previous brackets) + 30% on the amount above 200,000
    tax = 24000 + (grossSalary - 200000) * 0.30;
  }

  return Math.round(tax);
};