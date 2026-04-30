export const calculateTotalGross = (baseSalary, benefits = {}) => {
  const {
    housing = 0,
    transport = 0,
    bonus = 0,
    otherAllowances = 0,
  } = benefits;

  return Number(baseSalary) + Number(housing) + Number(transport) + Number(bonus) + Number(otherAllowances);
};
