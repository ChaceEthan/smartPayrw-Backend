// @ts-nocheck
import axios from 'axios';

/**
 * Contacts OpenRouter API to get a response from Mistral-7b
 */
export const getAIResponse = async (message) => {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || 'AI Service Error');
  }
};