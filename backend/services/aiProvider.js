const DEFAULT_MODELS = {
  gemini: 'gemini-3.8-flash',
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  'openai-compatible': 'gpt-4o-mini',
};

function providerError(provider, status, code) {
  const err = new Error('The AI provider could not complete this request.');
  err.status = 502;
  console.error(`[AI] ${provider} request failed (HTTP ${status}${code ? `, ${code}` : ''}).`);
  return err;
}

async function readResponse(response, provider) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw providerError(provider, response.status, 'invalid_json');
  }
  if (!response.ok) {
    const code = data.error?.code || data.error?.type || data.candidates?.[0]?.finishReason;
    throw providerError(provider, response.status, code);
  }
  return data;
}

exports.complete = async ({ purpose, system, messages, image, maxTokens = 1000, json = false }) => {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_key_here') {
    const err = new Error('AI_API_KEY is not configured.');
    err.status = 503;
    throw err;
  }

  const provider = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  if (!Object.hasOwn(DEFAULT_MODELS, provider)) {
    const err = new Error('AI_PROVIDER must be gemini, anthropic, or openai.');
    err.status = 503;
    throw err;
  }
  const model = process.env[`AI_${purpose.toUpperCase()}_MODEL`]?.trim()
    || process.env.AI_MODEL?.trim()
    || DEFAULT_MODELS[provider];
  const requestMessages = messages.map((message) => ({ role: message.role, content: message.content }));
  const lastUser = requestMessages.findLastIndex((message) => message.role === 'user');
  if (image && lastUser >= 0 && provider !== 'gemini') {
    const text = requestMessages[lastUser].content;
    requestMessages[lastUser].content = provider === 'anthropic'
      ? [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType || 'image/jpeg', data: image.data } },
        { type: 'text', text },
      ]
      : [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: `data:${image.mediaType || 'image/jpeg'};base64,${image.data}` } },
      ];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  let response;
  try {
    if (provider === 'gemini') {
      const contents = requestMessages.map((message) => {
        const parts = [{ text: message.content }];
        if (image && message.role === 'user' && message === requestMessages[lastUser]) {
          parts.push({ inlineData: { mimeType: image.mediaType || 'image/jpeg', data: image.data } });
        }
        return { role: message.role === 'assistant' ? 'model' : 'user', parts };
      });
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            ...(model.startsWith('gemini-2.5-') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            ...(json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
        signal: controller.signal,
      });
    } else if (provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model, max_tokens: maxTokens, system,
          messages: requestMessages,
        }),
        signal: controller.signal,
      });
    } else {
      const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + apiKey },
        body: JSON.stringify({
          model, max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, ...requestMessages],
        }),
        signal: controller.signal,
      });
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The AI provider request timed out.');
      timeoutError.status = 504;
      throw timeoutError;
    }
    if (error.status) throw error;
    const networkError = new Error('Could not connect to the AI provider.');
    networkError.status = 502;
    throw networkError;
  } finally {
    clearTimeout(timeout);
  }

  const data = await readResponse(response, provider);
  const text = provider === 'gemini'
    ? data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
    : provider === 'anthropic'
      ? data.content?.map((part) => part.text || '').join('').trim()
      : data.choices?.[0]?.message?.content?.trim();
  if (!text) throw providerError(provider, response.status, 'empty_response');
  return text;
};
