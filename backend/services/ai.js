export async function generateTestCases(prompt, model, config) {
  const qaPrompt = `Act as QA Engineer. Keep answer clear and short.\n\n${prompt}`;

  switch (model) {
    case 'openai':
      return await callOpenAI(qaPrompt, config.openaiKey, config.openaiModel || 'gpt-4');
    case 'gemini':
      return await callGemini(qaPrompt, config.geminiKey);
    case 'groq':
      return await callGroq(qaPrompt, config.groqKey, config.groqModel || 'groq-gpt-1.5');
    case 'ollama':
      return await callOllama(qaPrompt, config.ollamaModel || 'phi3:latest');
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

async function callOpenAI(prompt, apiKey, model) {
  if (!apiKey) throw new Error('OpenAI API key required');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI API error:', response.status, errorBody);
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt, apiKey) {
  if (!apiKey) throw new Error('Gemini API key required');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini API error:', response.status, errorBody);
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callGroq(prompt, apiKey, modelName = 'groq-gpt-1.5') {
  if (!apiKey) throw new Error('Groq API key required');

  const normalizedModel = normalizeGroqModel(modelName);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: normalizedModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Groq API error:', response.status, errorBody);
    throw new Error(`Groq API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function normalizeGroqModel(modelName) {
  const legacyMap = {
    'mixtral-8x7b-32768': 'groq-gpt-1.5',
    'mixtral-8x7b': 'groq-gpt-1.5',
    'mixtral': 'groq-gpt-1.5'
  };

  if (!modelName) {
    return 'groq-gpt-1.5';
  }

  return legacyMap[modelName] || modelName;
}

async function callOllama(prompt, model) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false
    })
  });

  if (!response.ok) throw new Error('Ollama API error');

  const data = await response.json();
  return data.response;
}