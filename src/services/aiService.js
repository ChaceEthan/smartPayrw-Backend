// @ts-nocheck
import axios from "axios";
import {
  getLanguageName,
  getLocalIntelligentResponse,
  normalizeLanguage,
} from "./payrollIntelligenceService.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MASTER_SYSTEM_PROMPT = `You are SmartPayRW AI, a professional payroll and tax assistant for businesses in Rwanda.

You help users with:
- employee management
- payroll calculations
- tax obligations (PAYE, RSSB, CBHI, maternity, occupational hazards)
- compliance with RRA and RSSB
- TIN-based tax dashboard interpretation
- EBM-lite business sales and stock summaries
- company financial responsibilities

If a user provides a TIN number, automatically analyze the company and return:
- company profile
- tax obligations
- compliance status
- payroll insights

Always give clear, practical, and actionable answers.`;

const toNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const buildAIContextPayload = (message, language, context = {}) => {
  return {
    message,
    language,
    payrollContext: context.payrollContext || null,
    employeesData: context.employeesData || null,
    companyData: context.companyData || null,
    pensionData: context.pensionData || null,
    taxData: context.taxData || null,
    taxDashboardData: context.taxDashboardData || null,
    businessData: context.businessData || null,
    complianceData: context.complianceData || null,
  };
};

export const getAIResponse = async (message, options = {}) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const language = normalizeLanguage(options.language);
  const contextPayload = buildAIContextPayload(message, language, options.context);

  if (!apiKey) {
    return getLocalIntelligentResponse(message, language, contextPayload);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-Title": process.env.APP_NAME || "SmartPayRW Backend",
  };

  if (process.env.APP_URL) {
    headers["HTTP-Referer"] = process.env.APP_URL;
  }

  try {
    const messages = [
      {
        role: "system",
        content: [
          MASTER_SYSTEM_PROMPT,
          `Respond only in ${getLanguageName(language)}.`,
          "Answer any SmartPayRW business, payroll, employee, tax, compliance, salary, or company operations question with explanation, steps, and practical advice.",
          "Use pensionData, taxData, taxDashboardData, complianceData, businessData, and employeesData to answer RSSB, pension, tax due, and business performance questions.",
          "Use the supplied JSON context when available. If data is missing, say what should be verified instead of inventing private records.",
        ].join("\n"),
      },
    ];

    messages.push({
      role: "user",
      content: JSON.stringify(contextPayload, null, 2),
    });

    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages,
        temperature: toNumber(options.temperature, 0.3),
        max_tokens: toNumber(process.env.OPENROUTER_MAX_TOKENS, 700),
      },
      {
        timeout: toNumber(process.env.OPENROUTER_TIMEOUT_MS, 30000),
        headers,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenRouter returned an empty response");
    }

    return content;
  } catch (error) {
    console.error(`OpenRouter request failed: ${error.message}`);
    return getLocalIntelligentResponse(message, language, contextPayload);
  }
};
