export function buildPrompt(messages, mode = 'qa') {
  const system = `You are QA-AI Assistant. Support question answering, test case generation, and defect report generation. Keep responses clear, structured, and actionable.`;
  const modeHint =
    mode === 'test'
      ? 'Generate test cases based on the user request.'
      : mode === 'defect'
      ? 'Generate a defect report and reproduce steps for the issue described below.'
      : 'Answer the user request as a QA engineer.';

  const transcript = messages
    .map((message) => {
      const role = message.role === 'assistant' ? 'Assistant' : 'User';
      return `${role}: ${message.content}`;
    })
    .join('\n');

  return `${system}\n${modeHint}\n\n${transcript}\nAssistant:`;
}

export async function streamResponse(prompt, res, provider = 'ollama', apiKey, model) {
  if (provider === 'ollama') {
    return streamOllamaResponse(prompt, res, model);
  } else if (provider === 'openai') {
    return streamOpenAIResponse(prompt, res, apiKey, model);
  } else if (provider === 'gemini') {
    return streamGeminiResponse(prompt, res, apiKey, model);
  } else if (provider === 'groq') {
    return streamGroqResponse(prompt, res, apiKey, model);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function streamOllamaResponse(prompt, res, model = 'phi3:latest') {
  const url = 'http://localhost:11434/v1/chat/completions';
  const body = {
    model: model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1024,
    stream: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Ollama request failed: ${payload}`);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      res.write(chunk);
      res.flush?.();
    }
  }

  res.end();
}

export async function streamOpenAIResponse(prompt, res, apiKey, model = 'gpt-4') {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1024,
    stream: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`OpenAI request failed: ${payload}`);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      res.write(chunk);
      res.flush?.();
    }
  }

  res.end();
}

export async function streamGeminiResponse(prompt, res, apiKey, model = 'gemini-pro') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Gemini request failed: ${payload}`);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      res.write(chunk);
      res.flush?.();
    }
  }

  res.end();
}

export async function streamGroqResponse(prompt, res, apiKey, model = 'groq-gpt-1.5') {
  if (!apiKey) {
    throw new Error('Groq API key required');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      stream: true
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Groq request failed: ${payload}`);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      res.write(chunk);
      res.flush?.();
    }
  }

  res.end();
}
