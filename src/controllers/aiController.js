// @ts-nocheck
import { getAIResponse } from '../services/aiService.js';

/**
 * Controller to handle AI chat requests
 */
export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await getAIResponse(message);
    res.status(200).json({ response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};