// @ts-nocheck
const normalizeTIN = (tin) => String(tin || "").replace(/\D/g, "");

export const lookupTaxpayer = async (tin) => {
  const normalizedTin = normalizeTIN(tin);

  if (!/^\d{9}$/.test(normalizedTin)) {
    const error = new Error("TIN must be a 9-digit number");
    error.statusCode = 400;
    throw error;
  }

  return {
    tin: normalizedTin,
    companyName: "Sample Ltd",
    registrationStatus: "Active",
    taxCenter: "RRA Kigali",
    obligations: ["PAYE", "VAT", "RSSB", "CBHI"],
    source: "simulated_rra_lookup",
  };
};

export const checkCompliance = async (tin) => {
  const taxpayer = await lookupTaxpayer(tin);

  return {
    taxpayer,
    complianceStatus: "Good standing",
    openIssues: [],
    filingReadiness: {
      paye: "Ready for payroll declaration review",
      rssb: "Ready for contribution reconciliation",
      cbhi: "Confirm coverage where applicable",
      vat: "Confirm VAT registration and period activity",
    },
    nextSteps: [
      "Reconcile payroll totals before filing PAYE.",
      "Compare RSSB employee and employer contributions against payroll.",
      "Keep payment proof and declaration receipts in company records.",
    ],
  };
};
