import { getAIResponse } from "../services/aiService.js";

export const chatWithAI = async (req, res) => {
  try {
    const { message, temperature } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const response = await getAIResponse(message.trim(), { temperature });
    return res.status(200).json({ response });
  } catch (error) {
    return res.status(502).json({ message: "AI request failed", error: error.message });
  }
};
