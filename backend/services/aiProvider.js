const DEFAULT_MODELS = {
  gemini: 'gemini-3.8-flash',
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  'openai-compatible': 'gpt-4o-mini',
};

function providerError(provider, status, code) {
  const err = new Error('The AI provider could not complete this request.');
  err.status = 502;
  err.providerStatus = status;
  console.error(`[AI] ${provider} request failed (HTTP ${status}${code ? `, ${code}` : ''}).`);
  return err;
}

const RETRYABLE_GEMINI_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

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

async function requestGemini({ apiKey, model, contents, system, maxTokens, json, signal }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
    signal,
  });
  const data = await readResponse(response, 'gemini');
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw providerError('gemini', response.status, 'empty_response');
  return text;
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
      const fallbackModel = process.env.AI_GEMINI_FALLBACK_MODEL?.trim() || 'gemini-2.5-flash';
      const models = [...new Set([model, fallbackModel])];
      let lastError;
      for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
        const attempts = modelIndex === 0 ? 2 : 1;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** (attempt - 1))));
          try {
            return await requestGemini({
              apiKey, model: models[modelIndex], contents, system, maxTokens, json, signal: controller.signal,
            });
          } catch (error) {
            lastError = error;
            if (!RETRYABLE_GEMINI_STATUSES.has(error.providerStatus)) throw error;
            if (attempt < attempts - 1) continue;
          }
        }
      }
      throw lastError;
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
  const text = provider === 'anthropic'
    ? data.content?.map((part) => part.text || '').join('').trim()
    : data.choices?.[0]?.message?.content?.trim();
  if (!text) throw providerError(provider, response.status, 'empty_response');
  return text;
};
