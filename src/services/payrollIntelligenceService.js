// @ts-nocheck
import { calculatePAYE } from "../utils/calculatePAYE.js";
import { calculateRSSB } from "../utils/calculateRSSB.js";
import { calculatePensionForSalary } from "./pensionService.js";

const SUPPORTED_LANGUAGES = {
  en: "English",
  rw: "Kinyarwanda",
  fr: "French",
  sw: "Swahili",
};

const PAYROLL_KEYWORDS = [
  "base pay",
  "cbhi",
  "calculate",
  "deduction",
  "deductions",
  "gross",
  "income",
  "maternity",
  "net",
  "occupational",
  "paye",
  "payroll",
  "rssb",
  "salary",
  "salaries",
  "tax",
  "wage",
  "impot",
  "paie",
  "retenue",
  "salaire",
  "cotisation",
  "kodi",
  "makato",
  "mshahara",
  "umushahara",
  "umusoro",
];

const PENSION_KEYWORDS = [
  "pension",
  "rssb",
  "social security",
  "contribution",
  "contributions",
  "imisanzu",
  "ubwiteganyirize",
  "nishyura",
  "yanjye",
  "angahe",
  "cotisation",
  "retraite",
  "mchango",
];

const EMPLOYEE_KEYWORDS = [
  "employee",
  "employees",
  "staff",
  "contract",
  "onboard",
  "leave",
  "worker",
  "hr",
  "employe",
  "personnel",
  "mfanyakazi",
  "abakozi",
  "umukozi",
];

const COMPLIANCE_KEYWORDS = [
  "compliance",
  "deadline",
  "declaration",
  "filing",
  "rra",
  "rssb",
  "penalty",
  "obligation",
  "audit",
  "declarer",
  "conformite",
  "kanuni",
  "amategeko",
];

const COMPANY_KEYWORDS = [
  "business",
  "company",
  "cash flow",
  "operation",
  "budget",
  "finance",
  "liability",
  "sme",
  "societe",
  "entreprise",
  "kampuni",
  "ikigo",
];

const formatRwf = (amount) => `${Math.round(amount).toLocaleString("en-US")} RWF`;

const normalizeSearchText = (value) => {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export const normalizeLanguage = (language) => {
  const normalized = String(language || "en").toLowerCase().trim();
  return SUPPORTED_LANGUAGES[normalized] ? normalized : "en";
};

export const getLanguageName = (language) => {
  return SUPPORTED_LANGUAGES[normalizeLanguage(language)];
};

const getCompaniesFromContext = (contextData = {}) => {
  const companyData = contextData?.companyData;

  if (!companyData) {
    return [];
  }

  if (Array.isArray(companyData)) {
    return companyData;
  }

  if (Array.isArray(companyData.companies)) {
    return companyData.companies;
  }

  return [companyData];
};

const getEmployeesFromContext = (contextData = {}) => {
  const employeesData = contextData?.employeesData;

  if (!employeesData) {
    return [];
  }

  if (Array.isArray(employeesData)) {
    return employeesData;
  }

  if (Array.isArray(employeesData.employees)) {
    return employeesData.employees;
  }

  return [];
};

export const detectTIN = (message) => {
  const matches = String(message || "").matchAll(
    /(?:^|\D)(\d(?:[\s-]?\d){8})(?=\D|$)/g
  );

  for (const match of matches) {
    const tin = match[1].replace(/\D/g, "");

    if (tin.length === 9) {
      return tin;
    }
  }

  return null;
};

const extractSalaryAmount = (message) => {
  const matches = String(message || "").matchAll(
    /\b(?:rwf\s*)?(\d{1,3}(?:[,\s]\d{3})+|\d{4,9})(?:\s*rwf)?\b/gi
  );

  for (const match of matches) {
    const amount = Number(match[1].replace(/[,\s]/g, ""));

    if (Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }

  return null;
};

const includesAny = (message, keywords) => {
  const text = normalizeSearchText(message);
  return keywords.some((keyword) => text.includes(keyword));
};

const hasPayrollIntent = (message) => includesAny(message, PAYROLL_KEYWORDS);
const hasPensionIntent = (message) => includesAny(message, PENSION_KEYWORDS);

const buildTINAnalysis = (tin, contextData = {}) => {
  const companies = getCompaniesFromContext(contextData);
  const matchedCompany = companies.find(
    (company) => String(company?.tin || "").replace(/\D/g, "") === tin
  );

  if (!matchedCompany) {
    return {
      tin,
      registered: false,
      message: "Company not registered in SmartPay",
    };
  }

  const companyId = matchedCompany.id || matchedCompany._id;
  const employees = getEmployeesFromContext(contextData).filter((employee) => {
    if (!companyId) {
      return true;
    }

    return String(employee.companyId || "") === String(companyId);
  });
  const salaryTotal = employees.reduce(
    (total, employee) => total + (Number(employee.salary) || 0),
    0
  );
  const paye = employees.reduce(
    (total, employee) => total + calculatePAYE(Number(employee.salary) || 0),
    0
  );
  const rssb = employees.reduce((total, employee) => {
    const contribution = calculateRSSB(Number(employee.salary) || 0);
    return total + contribution.totalRSSB;
  }, 0);
  const companyName = matchedCompany.name || matchedCompany.company;

  return {
    tin,
    registered: true,
    company: companyName,
    businessType: matchedCompany.businessType,
    companyProfile: {
      companyName,
      tin,
      businessType: matchedCompany.businessType,
      registrationStatus: "Registered in SmartPay",
      source: "SmartPayRW company data",
    },
    taxObligations: [
      "PAYE on employee taxable income when payroll is processed",
      "RSSB pension and related statutory payroll contributions",
      "CBHI where applicable to the employee or business arrangement",
      "VAT only if the company is registered for VAT or meets the required threshold",
    ],
    complianceStatus: {
      smartPay: "Registered",
      rra: "Verify with RRA before filing",
      rssb: "Use stored employee payroll records for monthly reconciliation",
      cbhi: "Verify coverage where applicable",
      filingReadiness: "Review payroll, declarations, and payments before filing",
    },
    payrollSummary: {
      employeeCount: employees.length,
      totalSalaries: salaryTotal,
      estimatedPAYE: paye,
      estimatedRSSB: rssb,
    },
    payrollInsights: [
      `${employees.length} employee record(s) are linked to this company in SmartPay.`,
      `Stored monthly salary total is ${formatRwf(salaryTotal)}.`,
      `Estimated PAYE from stored salaries is ${formatRwf(paye)} and estimated RSSB is ${formatRwf(rssb)}.`,
    ],
  };
};

const buildTINMessage = (language, tinAnalysis) => {
  if (!tinAnalysis.registered) {
    const messages = {
      en: `Company not registered in SmartPay for TIN ${tinAnalysis.tin}. Please register the company first.`,
      rw: `Ikigo gifite TIN ${tinAnalysis.tin} ntikirandikwa muri SmartPay. Banza wandikishe ikigo.`,
      fr: `La societe avec le TIN ${tinAnalysis.tin} n'est pas enregistree dans SmartPay. Veuillez d'abord enregistrer la societe.`,
      sw: `Kampuni yenye TIN ${tinAnalysis.tin} haijasajiliwa kwenye SmartPay. Tafadhali sajili kampuni kwanza.`,
    };

    return messages[normalizeLanguage(language)];
  }

  const obligationList = tinAnalysis.taxObligations.map((item) => `- ${item}`);
  const insightList = tinAnalysis.payrollInsights.map((item) => `- ${item}`);

  const messages = {
    en: [
      "TIN analysis result:",
      `Company profile: ${tinAnalysis.companyProfile.companyName} (${tinAnalysis.tin})`,
      `Business type: ${tinAnalysis.companyProfile.businessType}`,
      `Compliance status: RRA ${tinAnalysis.complianceStatus.rra}; RSSB ${tinAnalysis.complianceStatus.rssb}; CBHI ${tinAnalysis.complianceStatus.cbhi}.`,
      "Tax obligations:",
      ...obligationList,
      "Payroll insights:",
      ...insightList,
      "This uses company and employee records stored in SmartPay.",
    ],
    rw: [
      "Ibyavuye mu isesengura rya TIN:",
      `Umwirondoro w'ikigo: ${tinAnalysis.companyProfile.companyName} (${tinAnalysis.tin})`,
      `Ubwoko bw'ubucuruzi: ${tinAnalysis.companyProfile.businessType}`,
      `Imiterere yo kubahiriza: RRA ${tinAnalysis.complianceStatus.rra}; RSSB ${tinAnalysis.complianceStatus.rssb}; CBHI ${tinAnalysis.complianceStatus.cbhi}.`,
      "Inshingano z'imisoro:",
      ...obligationList,
      "Inama kuri payroll:",
      ...insightList,
      "Ibi bikoresha amakuru y'ikigo n'abakozi ari muri SmartPay.",
    ],
    fr: [
      "Resultat de l'analyse TIN:",
      `Profil de la societe: ${tinAnalysis.companyProfile.companyName} (${tinAnalysis.tin})`,
      `Type d'activite: ${tinAnalysis.companyProfile.businessType}`,
      `Statut de conformite: RRA ${tinAnalysis.complianceStatus.rra}; RSSB ${tinAnalysis.complianceStatus.rssb}; CBHI ${tinAnalysis.complianceStatus.cbhi}.`,
      "Obligations fiscales:",
      ...obligationList,
      "Apercus payroll:",
      ...insightList,
      "Cette reponse utilise les donnees societe et employes enregistrees dans SmartPay.",
    ],
    sw: [
      "Matokeo ya uchambuzi wa TIN:",
      `Wasifu wa kampuni: ${tinAnalysis.companyProfile.companyName} (${tinAnalysis.tin})`,
      `Aina ya biashara: ${tinAnalysis.companyProfile.businessType}`,
      `Hali ya uzingatiaji: RRA ${tinAnalysis.complianceStatus.rra}; RSSB ${tinAnalysis.complianceStatus.rssb}; CBHI ${tinAnalysis.complianceStatus.cbhi}.`,
      "Majukumu ya kodi:",
      ...obligationList,
      "Maarifa ya payroll:",
      ...insightList,
      "Jibu hili linatumia rekodi za kampuni na wafanyakazi zilizohifadhiwa SmartPay.",
    ],
  };

  return messages[normalizeLanguage(language)].join("\n");
};

const buildPayrollAnalysis = (grossSalary) => {
  const paye = calculatePAYE(grossSalary);
  const rssb = calculateRSSB(grossSalary);
  const totalDeductions = paye + rssb.employeeRSSB;
  const netSalary = grossSalary - totalDeductions;

  return {
    grossSalary,
    paye,
    employeeRSSB: rssb.employeeRSSB,
    employerRSSB: rssb.employerRSSB,
    totalRSSB: rssb.totalRSSB,
    totalDeductions,
    netSalary,
    employerPayrollCost: grossSalary + rssb.employerRSSB,
    cbhiNote: "CBHI is not included in this estimate unless configured for the company or required by the applicable scheme.",
  };
};

const buildPayrollMessage = (language, payroll) => {
  const messages = {
    en: [
      `Payroll estimate for ${formatRwf(payroll.grossSalary)}:`,
      `- Gross salary: ${formatRwf(payroll.grossSalary)}`,
      `- PAYE: ${formatRwf(payroll.paye)}`,
      `- Employee RSSB: ${formatRwf(payroll.employeeRSSB)}`,
      `- Total employee deductions: ${formatRwf(payroll.totalDeductions)}`,
      `- Estimated net salary: ${formatRwf(payroll.netSalary)}`,
      `- Employer RSSB: ${formatRwf(payroll.employerRSSB)}`,
      `- Estimated employer payroll cost: ${formatRwf(payroll.employerPayrollCost)}`,
      `- CBHI: ${payroll.cbhiNote}`,
      "Next steps: confirm taxable benefits, verify employee status, reconcile deductions, then prepare RRA/RSSB declarations.",
    ],
    rw: [
      `Ikigereranyo cy'umushahara kuri ${formatRwf(payroll.grossSalary)}:`,
      `- Umushahara mbumbe: ${formatRwf(payroll.grossSalary)}`,
      `- PAYE: ${formatRwf(payroll.paye)}`,
      `- RSSB y'umukozi: ${formatRwf(payroll.employeeRSSB)}`,
      `- Ibikurwaho byose ku mukozi: ${formatRwf(payroll.totalDeductions)}`,
      `- Umushahara asigarana: ${formatRwf(payroll.netSalary)}`,
      `- RSSB y'umukoresha: ${formatRwf(payroll.employerRSSB)}`,
      `- Igiciro cyose cy'umukoresha: ${formatRwf(payroll.employerPayrollCost)}`,
      `- CBHI: ${payroll.cbhiNote}`,
      "Intambwe zikurikira: emeza benefits zisoreshwa, genzura umukozi, huza deductions, hanyuma utegure declarations za RRA/RSSB.",
    ],
    fr: [
      `Estimation de paie pour ${formatRwf(payroll.grossSalary)}:`,
      `- Salaire brut: ${formatRwf(payroll.grossSalary)}`,
      `- PAYE: ${formatRwf(payroll.paye)}`,
      `- RSSB employe: ${formatRwf(payroll.employeeRSSB)}`,
      `- Total des retenues employe: ${formatRwf(payroll.totalDeductions)}`,
      `- Salaire net estime: ${formatRwf(payroll.netSalary)}`,
      `- RSSB employeur: ${formatRwf(payroll.employerRSSB)}`,
      `- Cout total employeur estime: ${formatRwf(payroll.employerPayrollCost)}`,
      `- CBHI: ${payroll.cbhiNote}`,
      "Etapes suivantes: confirmer les avantages imposables, verifier le statut de l'employe, rapprocher les retenues, puis preparer les declarations RRA/RSSB.",
    ],
    sw: [
      `Makadirio ya mshahara kwa ${formatRwf(payroll.grossSalary)}:`,
      `- Mshahara jumla: ${formatRwf(payroll.grossSalary)}`,
      `- PAYE: ${formatRwf(payroll.paye)}`,
      `- RSSB ya mfanyakazi: ${formatRwf(payroll.employeeRSSB)}`,
      `- Jumla ya makato ya mfanyakazi: ${formatRwf(payroll.totalDeductions)}`,
      `- Mshahara halisi unaokadiriwa: ${formatRwf(payroll.netSalary)}`,
      `- RSSB ya mwajiri: ${formatRwf(payroll.employerRSSB)}`,
      `- Gharama ya jumla ya mwajiri: ${formatRwf(payroll.employerPayrollCost)}`,
      `- CBHI: ${payroll.cbhiNote}`,
      "Hatua zinazofuata: thibitisha faida zinazotozwa kodi, hakiki hali ya mfanyakazi, linganisha makato, kisha andaa taarifa za RRA/RSSB.",
    ],
  };

  return messages[normalizeLanguage(language)].join("\n");
};

const buildPensionMessage = (language, pension) => {
  const messages = {
    en: [
      `RSSB pension estimate for ${formatRwf(pension.salaryBase)}:`,
      `- Employee contribution: ${formatRwf(pension.employeeContribution)}`,
      `- Employer contribution: ${formatRwf(pension.employerContribution)}`,
      `- Total pension: ${formatRwf(pension.totalPension)}`,
      "This uses the SmartPayRW Rwanda pension summary: 3% employee contribution and 5% employer planning contribution.",
    ],
    rw: [
      `Ikigereranyo cya pension/RSSB kuri ${formatRwf(pension.salaryBase)}:`,
      `- Umusanzu w'umukozi: ${formatRwf(pension.employeeContribution)}`,
      `- Umusanzu w'umukoresha: ${formatRwf(pension.employerContribution)}`,
      `- Pension yose: ${formatRwf(pension.totalPension)}`,
      "Ibi bikoresha incamake ya SmartPayRW: umukozi atanga 3%, umukoresha agatanga 5%.",
    ],
    fr: [
      `Estimation pension/RSSB pour ${formatRwf(pension.salaryBase)}:`,
      `- Contribution employe: ${formatRwf(pension.employeeContribution)}`,
      `- Contribution employeur: ${formatRwf(pension.employerContribution)}`,
      `- Pension totale: ${formatRwf(pension.totalPension)}`,
      "Ce calcul utilise le resume SmartPayRW Rwanda: 3% employe et 5% employeur pour la planification.",
    ],
    sw: [
      `Makadirio ya pension/RSSB kwa ${formatRwf(pension.salaryBase)}:`,
      `- Mchango wa mfanyakazi: ${formatRwf(pension.employeeContribution)}`,
      `- Mchango wa mwajiri: ${formatRwf(pension.employerContribution)}`,
      `- Jumla ya pension: ${formatRwf(pension.totalPension)}`,
      "Hesabu hii inatumia muhtasari wa SmartPayRW Rwanda: 3% mfanyakazi na 5% mwajiri.",
    ],
  };

  return messages[normalizeLanguage(language)].join("\n");
};

const detectAssistantIntent = (message) => {
  if (hasPensionIntent(message)) {
    return "pension";
  }

  if (hasPayrollIntent(message)) {
    return "payroll";
  }

  if (includesAny(message, COMPLIANCE_KEYWORDS)) {
    return "compliance";
  }

  if (includesAny(message, EMPLOYEE_KEYWORDS)) {
    return "employees";
  }

  if (includesAny(message, COMPANY_KEYWORDS)) {
    return "company";
  }

  return "business";
};

const buildContextInsight = (language, contextData = {}) => {
  const employees = contextData?.employeesData;
  const companies = contextData?.companyData;
  const companyCount = companies?.count || companies?.companies?.length || 0;
  const employeeCount = employees?.count || employees?.employees?.length || 0;
  const salaryTotal = Number(employees?.totalMonthlyGrossSalary) || 0;

  if (!companyCount && !employeeCount && !salaryTotal) {
    return "";
  }

  const messages = {
    en: `Available SmartPayRW context: ${companyCount} company record(s), ${employeeCount} employee record(s), and ${formatRwf(salaryTotal)} in summarized monthly gross salaries.`,
    rw: `Context ya SmartPayRW iboneka: ibigo ${companyCount}, abakozi ${employeeCount}, n'imishahara mbumbe ya buri kwezi ${formatRwf(salaryTotal)}.`,
    fr: `Contexte SmartPayRW disponible: ${companyCount} societe(s), ${employeeCount} employe(s), et ${formatRwf(salaryTotal)} de salaires bruts mensuels resumes.`,
    sw: `Muktadha wa SmartPayRW uliopo: rekodi ${companyCount} za kampuni, rekodi ${employeeCount} za wafanyakazi, na mishahara jumla ya mwezi ${formatRwf(salaryTotal)}.`,
  };

  return messages[normalizeLanguage(language)];
};

const localGuidance = {
  pension: {
    en: [
      "RSSB pension guidance:",
      "Explanation: for payroll planning, SmartPayRW estimates pension at 3% paid by the employee and 5% paid by the employer.",
      "Steps: confirm the gross salary base, calculate the employee contribution, calculate the employer contribution, then reconcile the total before declaration.",
      "Advice: keep the employee RSSB number and payslip records ready before filing.",
    ],
    rw: [
      "Inama kuri pension/RSSB:",
      "Ibisobanuro: muri SmartPayRW, pension ibarwa ku gipimo cya 3% y'umukozi na 5% y'umukoresha.",
      "Intambwe: emeza umushahara mbumbe, bara umusanzu w'umukozi, bara umusanzu w'umukoresha, hanyuma uhuze totals mbere ya declaration.",
      "Inama: bika nimero ya RSSB y'umukozi na payslips mbere yo gutanga declaration.",
    ],
    fr: [
      "Conseil pension/RSSB:",
      "Explication: pour la planification payroll, SmartPayRW estime la pension a 3% paye par l'employe et 5% paye par l'employeur.",
      "Etapes: confirmer le salaire brut, calculer la contribution employe, calculer la contribution employeur, puis rapprocher le total avant declaration.",
      "Conseil: gardez le numero RSSB de l'employe et les bulletins avant la declaration.",
    ],
    sw: [
      "Mwongozo wa pension/RSSB:",
      "Maelezo: kwa upangaji wa payroll, SmartPayRW hukadiria pension kwa 3% ya mfanyakazi na 5% ya mwajiri.",
      "Hatua: thibitisha mshahara jumla, hesabu mchango wa mfanyakazi, hesabu mchango wa mwajiri, kisha linganisha jumla kabla ya kuwasilisha.",
      "Ushauri: hifadhi nambari ya RSSB ya mfanyakazi na payslips kabla ya kuwasilisha.",
    ],
  },
  payroll: {
    en: [
      "Payroll guidance:",
      "Explanation: start from gross salary, add taxable benefits, calculate statutory deductions, and then subtract employee deductions to estimate net pay.",
      "Steps: verify employee details, calculate PAYE, calculate employee RSSB, check CBHI applicability, confirm employer RSSB, then issue payslips and prepare declarations.",
      "Advice: keep payroll records, approvals, and payment evidence together so RRA/RSSB reconciliation is easier.",
    ],
    rw: [
      "Inama za payroll:",
      "Ibisobanuro: hera ku mushahara mbumbe, ongeraho benefits zisoreshwa, ubare deductions ziteganywa, hanyuma ukureho iby'umukozi kugira ngo ubone net pay.",
      "Intambwe: genzura amakuru y'umukozi, bara PAYE, bara RSSB y'umukozi, reba niba CBHI ireba ikigo, emeza RSSB y'umukoresha, hanyuma utegure payslips na declarations.",
      "Inama: bika payroll records, approvals, n'ibimenyetso byo kwishyura kugira ngo reconciliation ya RRA/RSSB yorohere.",
    ],
    fr: [
      "Conseil payroll:",
      "Explication: partez du salaire brut, ajoutez les avantages imposables, calculez les retenues legales, puis soustrayez les retenues employe pour estimer le net.",
      "Etapes: verifier l'employe, calculer PAYE, calculer RSSB employe, verifier CBHI, confirmer RSSB employeur, puis preparer les bulletins et declarations.",
      "Conseil: gardez les dossiers payroll, validations et preuves de paiement pour faciliter le rapprochement RRA/RSSB.",
    ],
    sw: [
      "Mwongozo wa payroll:",
      "Maelezo: anza na mshahara jumla, ongeza faida zinazotozwa kodi, hesabu makato ya kisheria, kisha toa makato ya mfanyakazi kupata makadirio ya mshahara halisi.",
      "Hatua: hakiki taarifa za mfanyakazi, hesabu PAYE, hesabu RSSB ya mfanyakazi, angalia CBHI, thibitisha RSSB ya mwajiri, kisha andaa payslips na taarifa.",
      "Ushauri: hifadhi rekodi za payroll, vibali na ushahidi wa malipo ili kurahisisha ulinganisho wa RRA/RSSB.",
    ],
  },
  employees: {
    en: [
      "Employee management guidance:",
      "Explanation: reliable payroll depends on complete employee records, valid contracts, accurate salaries, and current statutory identifiers.",
      "Steps: collect identity and contract data, record salary and benefits, verify RSSB details, track status changes, then lock payroll before processing.",
      "Advice: separate HR updates from payroll approval so salary changes are reviewed before payment.",
    ],
    rw: [
      "Inama zo gucunga abakozi:",
      "Ibisobanuro: payroll yizewe ishingira ku makuru yuzuye y'abakozi, contracts, imishahara nyayo, na identifiers zigezweho.",
      "Intambwe: kusanya amakuru n'amasezerano, andika salary na benefits, genzura RSSB, kurikirana changes, hanyuma ufunge payroll mbere yo kuyikora.",
      "Inama: tandukanya HR updates na payroll approval kugira ngo salary changes zemezwe mbere yo kwishyura.",
    ],
    fr: [
      "Conseil gestion des employes:",
      "Explication: une paie fiable depend de dossiers employes complets, contrats valides, salaires exacts et identifiants legaux a jour.",
      "Etapes: collecter les donnees, enregistrer salaire et avantages, verifier RSSB, suivre les changements, puis verrouiller la paie avant traitement.",
      "Conseil: separez les mises a jour RH de l'approbation payroll pour revoir les changements de salaire avant paiement.",
    ],
    sw: [
      "Mwongozo wa usimamizi wa wafanyakazi:",
      "Maelezo: payroll sahihi inategemea rekodi kamili za wafanyakazi, mikataba halali, mishahara sahihi na vitambulisho vya kisheria vilivyosasishwa.",
      "Hatua: kusanya taarifa, rekodi mshahara na faida, hakiki RSSB, fuatilia mabadiliko, kisha funga payroll kabla ya kuchakata.",
      "Ushauri: tenga masasisho ya HR na idhini ya payroll ili mabadiliko ya mshahara yapitiwe kabla ya malipo.",
    ],
  },
  compliance: {
    en: [
      "Compliance guidance:",
      "Explanation: Rwanda payroll compliance is mainly about accurate PAYE, RSSB, CBHI where applicable, timely declarations, and clean evidence.",
      "Steps: reconcile payroll totals, review tax obligations, prepare declarations, confirm payments, and archive payslips and reports.",
      "Advice: verify current RRA/RSSB rules before filing because rates, forms, and deadlines can change.",
    ],
    rw: [
      "Inama zo kubahiriza amategeko:",
      "Ibisobanuro: compliance ya payroll mu Rwanda ishingira kuri PAYE, RSSB, CBHI aho bikenewe, declarations ku gihe, n'ibimenyetso byuzuye.",
      "Intambwe: huza payroll totals, genzura obligations, tegura declarations, emeza payments, hanyuma ubike payslips na reports.",
      "Inama: genzura amabwiriza agezweho ya RRA/RSSB mbere yo gutanga kuko rates, forms, na deadlines bishobora guhinduka.",
    ],
    fr: [
      "Conseil conformite:",
      "Explication: la conformite payroll au Rwanda exige PAYE, RSSB, CBHI si applicable, declarations a temps et preuves claires.",
      "Etapes: rapprocher les totaux payroll, revoir les obligations, preparer les declarations, confirmer les paiements et archiver les bulletins.",
      "Conseil: verifiez les regles actuelles RRA/RSSB avant declaration car les taux, formulaires et dates peuvent changer.",
    ],
    sw: [
      "Mwongozo wa uzingatiaji:",
      "Maelezo: uzingatiaji wa payroll Rwanda unahusu PAYE, RSSB, CBHI inapohitajika, taarifa kwa wakati na ushahidi safi.",
      "Hatua: linganisha jumla za payroll, pitia majukumu ya kodi, andaa taarifa, thibitisha malipo na hifadhi payslips.",
      "Ushauri: hakiki kanuni za sasa za RRA/RSSB kabla ya kuwasilisha kwa sababu viwango, fomu na tarehe zinaweza kubadilika.",
    ],
  },
  company: {
    en: [
      "Company operations guidance:",
      "Explanation: payroll affects cash flow, tax liabilities, compliance risk, and employee trust.",
      "Steps: forecast gross payroll, add employer contributions, reserve tax payments, approve payroll changes, then review monthly reports.",
      "Advice: use payroll summaries to plan working capital and avoid late declarations or underpayments.",
    ],
    rw: [
      "Inama z'imikorere y'ikigo:",
      "Ibisobanuro: payroll igira ingaruka kuri cash flow, imyenda y'imisoro, compliance risk, n'icyizere cy'abakozi.",
      "Intambwe: teganya gross payroll, ongeraho employer contributions, shyira ku ruhande tax payments, emeza payroll changes, hanyuma usuzume reports za buri kwezi.",
      "Inama: koresha payroll summaries mu gutegura working capital no kwirinda declarations zitinze cyangwa underpayments.",
    ],
    fr: [
      "Conseil operations de societe:",
      "Explication: la paie influence la tresorerie, les dettes fiscales, le risque de conformite et la confiance des employes.",
      "Etapes: prevoir la masse salariale brute, ajouter les contributions employeur, reserver les paiements fiscaux, valider les changements, puis revoir les rapports mensuels.",
      "Conseil: utilisez les resumes payroll pour planifier le fonds de roulement et eviter les declarations tardives ou sous-paiements.",
    ],
    sw: [
      "Mwongozo wa uendeshaji wa kampuni:",
      "Maelezo: payroll huathiri mtiririko wa fedha, madeni ya kodi, hatari ya uzingatiaji na imani ya wafanyakazi.",
      "Hatua: tabiri payroll jumla, ongeza michango ya mwajiri, tenga malipo ya kodi, idhinisha mabadiliko, kisha pitia ripoti za mwezi.",
      "Ushauri: tumia muhtasari wa payroll kupanga mtaji wa uendeshaji na kuepuka kuchelewa au kulipa pungufu.",
    ],
  },
  business: {
    en: [
      "SmartPayRW business guidance:",
      "Explanation: treat every payroll or business decision as a mix of people, tax, compliance, and cash-flow impact.",
      "Steps: define the business question, check employee and company data, calculate financial impact, identify RRA/RSSB obligations, then decide the next action.",
      "Advice: when uncertain, document assumptions and verify official requirements before filing or paying.",
    ],
    rw: [
      "Inama za SmartPayRW ku bucuruzi:",
      "Ibisobanuro: buri cyemezo cya payroll cyangwa business kigomba kureba abakozi, imisoro, compliance, na cash-flow.",
      "Intambwe: sobanura ikibazo, genzura amakuru y'abakozi n'ikigo, bara financial impact, menya obligations za RRA/RSSB, hanyuma ufate next action.",
      "Inama: iyo utizeye neza, andika assumptions hanyuma wemeze requirements zemewe mbere yo gutanga cyangwa kwishyura.",
    ],
    fr: [
      "Conseil business SmartPayRW:",
      "Explication: chaque decision payroll ou business doit combiner impact humain, fiscal, conformite et tresorerie.",
      "Etapes: definir la question, verifier donnees employes et societe, calculer l'impact financier, identifier obligations RRA/RSSB, puis decider l'action suivante.",
      "Conseil: en cas de doute, documentez les hypotheses et verifiez les exigences officielles avant declaration ou paiement.",
    ],
    sw: [
      "Mwongozo wa biashara wa SmartPayRW:",
      "Maelezo: kila uamuzi wa payroll au biashara unapaswa kuzingatia watu, kodi, uzingatiaji na mtiririko wa fedha.",
      "Hatua: eleza swali la biashara, hakiki data za wafanyakazi na kampuni, hesabu athari ya fedha, tambua majukumu ya RRA/RSSB, kisha chagua hatua inayofuata.",
      "Ushauri: ukiwa na shaka, andika makadirio na hakiki mahitaji rasmi kabla ya kuwasilisha au kulipa.",
    ],
  },
};

export const getPayrollIntelligenceResponse = (
  message,
  language,
  contextData = {}
) => {
  const tin = detectTIN(message);

  if (tin) {
    const tinAnalysis = buildTINAnalysis(tin, contextData);

    return {
      type: tinAnalysis.registered ? "tin_analysis" : "tin_not_registered",
      message: buildTINMessage(language, tinAnalysis),
      data: tinAnalysis,
    };
  }

  const grossSalary = extractSalaryAmount(message);

  if (hasPensionIntent(message)) {
    const pension =
      grossSalary !== null
        ? calculatePensionForSalary(grossSalary)
        : contextData?.pensionData?.salaryBase
          ? contextData.pensionData
          : null;

    if (pension) {
      return {
        type: "pension_estimate",
        message: buildPensionMessage(language, pension),
        data: pension,
      };
    }
  }

  if (!hasPayrollIntent(message)) {
    return null;
  }

  if (!grossSalary) {
    return null;
  }

  const payroll = buildPayrollAnalysis(grossSalary);

  return {
    type: "payroll_estimate",
    message: buildPayrollMessage(language, payroll),
    data: payroll,
  };
};

export const getLocalIntelligentResponse = (
  message,
  language,
  contextData = {}
) => {
  const deterministicResponse = getPayrollIntelligenceResponse(
    message,
    language,
    contextData
  );

  if (deterministicResponse?.message) {
    return deterministicResponse.message;
  }

  const selectedLanguage = normalizeLanguage(language);
  const intent = detectAssistantIntent(message);
  const contextInsight = buildContextInsight(selectedLanguage, contextData);
  const guidance = localGuidance[intent]?.[selectedLanguage] || localGuidance.business.en;
  const response = contextInsight ? [contextInsight, ...guidance] : guidance;

  return response.join("\n");
};
