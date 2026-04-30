// @ts-nocheck
import { getAIResponse } from "../services/aiService.js";
import { buildAIContextPayload } from "../services/aiContextService.js";
import {
  detectTIN,
  getLocalIntelligentResponse,
  getPayrollIntelligenceResponse,
  normalizeLanguage,
} from "../services/payrollIntelligenceService.js";

export const chatWithAI = async (req, res) => {
  const {
    message,
    prompt,
    context,
    payrollContext,
    employeesData,
    companyData,
    language,
    temperature,
  } = req.body || {};
  const userMessage = message || prompt;
  const selectedLanguage = normalizeLanguage(language);

  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const trimmedMessage = userMessage.trim();
    const tin = detectTIN(trimmedMessage);
    const aiContext = await buildAIContextPayload({
      message: trimmedMessage,
      language: selectedLanguage,
      payrollContext: payrollContext || context,
      employeesData,
      companyData,
      tin,
      userId: req.user?._id,
    });

    const payrollIntelligence = getPayrollIntelligenceResponse(
      trimmedMessage,
      selectedLanguage,
      aiContext
    );

    if (payrollIntelligence) {
      return res.status(200).json({
        message: payrollIntelligence.message,
        language: selectedLanguage,
        type: payrollIntelligence.type,
        data: payrollIntelligence.data,
      });
    }

    const response = await getAIResponse(trimmedMessage, {
      context: aiContext,
      language: selectedLanguage,
      temperature,
    });
    const safeResponse =
      response?.trim() ||
      getLocalIntelligentResponse(trimmedMessage, selectedLanguage, aiContext);

    return res.status(200).json({
      message: safeResponse,
      language: selectedLanguage,
    });
  } catch (error) {
    console.error(`AI request failed: ${error.message}`);
    return res.status(200).json({
      message: getLocalIntelligentResponse(userMessage.trim(), selectedLanguage, {
        message: userMessage.trim(),
        language: selectedLanguage,
        payrollContext: payrollContext || context || null,
        employeesData: null,
        companyData: null,
      }),
      language: selectedLanguage,
      type: "local_fallback",
    });
  }
};
