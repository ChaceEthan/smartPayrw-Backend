// @ts-nocheck
const normalizeTIN = (tin) => String(tin || "").replace(/\D/g, "");

export const lookupTaxpayer = async (tin, { company } = {}) => {
  const normalizedTin = normalizeTIN(tin);

  if (!/^\d{9}$/.test(normalizedTin)) {
    const error = new Error("TIN must be a 9-digit number");
    error.statusCode = 400;
    throw error;
  }

  if (!company) {
    return {
      tin: normalizedTin,
      registeredInSmartPay: false,
      message: "Company not registered in SmartPay",
      source: "smartpay_company_records",
    };
  }

  return {
    tin: normalizedTin,
    registeredInSmartPay: true,
    companyName: company.name,
    businessType: company.businessType,
    registrationStatus: "Registered in SmartPay",
    obligations: ["PAYE", "RSSB", "CBHI where applicable"],
    source: "smartpay_company_records",
  };
};

export const checkCompliance = async (tin, options = {}) => {
  const taxpayer = await lookupTaxpayer(tin, options);

  if (!taxpayer.registeredInSmartPay) {
    return {
      taxpayer,
      complianceStatus: "Company not registered in SmartPay",
      openIssues: ["Register the company in SmartPay before running payroll checks."],
      filingReadiness: null,
      nextSteps: ["Register the company, add employees, then review payroll compliance."],
    };
  }

  return {
    taxpayer,
    complianceStatus: "Ready for payroll review in SmartPay",
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
