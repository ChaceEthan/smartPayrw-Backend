export const getComplianceData = () => ({
  payeRules:
    "PAYE is withheld from employment income. Monthly PAYE bands are 0% up to 60,000 RWF, 10% from 60,001 to 100,000 RWF, 20% from 100,001 to 200,000 RWF, and 30% above 200,000 RWF.",
  rssbRules:
    "RSSB pension is compulsory for salaried workers. In this SmartPayRW summary, the employee pension contribution is 3% and the employer planning contribution is 5%, which includes the employer pension share and occupational hazards cover. Maternity contributions are handled separately at 0.3% for the employee and 0.3% for the employer where applicable.",
  deadlines:
    "PAYE is normally declared and paid by the 15th day after the end of the tax period. RSSB pension contributions are declared and paid monthly, not later than the 15th day of the following month.",
  notes:
    "These rules are simplified for payroll planning. Before filing, verify employee taxable benefits, exemptions, declaration period, and current RRA/RSSB guidance.",
});

export const getTaxContextData = () => ({
  payeBands: [
    { from: 0, to: 60000, rate: 0 },
    { from: 60001, to: 100000, rate: 0.1 },
    { from: 100001, to: 200000, rate: 0.2 },
    { from: 200001, to: null, rate: 0.3 },
  ],
  rssb: {
    employeePensionRate: 0.03,
    employerPlanningRate: 0.05,
    occupationalHazardsEmployerRate: 0.02,
    maternityEmployeeRate: 0.003,
    maternityEmployerRate: 0.003,
  },
  compliance: getComplianceData(),
});
