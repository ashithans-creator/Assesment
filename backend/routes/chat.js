import express from 'express';
import { buildPrompt, streamResponse } from '../services/ollama.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Use POST /chat with a messages payload. GET is not supported for chat streaming.' });
});

router.post('/', async (req, res) => {
  try {
    const { messages, mode, provider = 'ollama', apiKey, model } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Request must include messages array.' });
    }

    if (provider !== 'ollama' && !apiKey) {
      return res.status(400).json({ error: 'API key required for cloud providers.' });
    }

    const prompt = buildPrompt(messages, mode);
    await streamResponse(prompt, res, provider, apiKey, model);
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

export default router;
