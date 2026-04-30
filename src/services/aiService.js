import axios from "axios";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const getAIResponse = async (message, options = {}) => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: message }],
        temperature: options.temperature ?? 0.3,
      },
      {
        timeout: Number(process.env.OPENROUTER_TIMEOUT_MS) || 30000,
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5000",
          "X-Title": process.env.APP_NAME || "SmartPayRW Backend",
        },
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenRouter returned an empty response");
    }

    return content;
  } catch (error) {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "AI Service Error";
    throw new Error(message);
  }
};
