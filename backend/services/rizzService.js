/**
 * Rizz Bot AI service. The provider is configurable via env vars and the key never leaves the server.
 * AI_PROVIDER=gemini | anthropic | openai (OpenAI-compatible)   AI_API_KEY   AI_MODEL   AI_BASE_URL
 */
const STYLES = {
  chill: 'relaxed, easygoing and low-pressure', cute: 'sweet, wholesome and a little shy',
  smooth: 'smooth, charming and effortless', savage: 'bold, witty and playfully teasing (never mean or insulting)',
  funny: 'funny, light-hearted and joke-driven', romantic: 'warm, sincere and romantic',
  confident: 'confident and self-assured without arrogance', flirty: 'playfully flirty but respectful', casual: 'casual and natural, like texting a friend',
};

const CATEGORY_TASKS = {
  first_message: 'Write opening messages the user can send to someone they like or just followed.',
  reply: 'Write replies to the message the other person sent.',
  compliment: 'Write genuine, respectful compliments.',
  starter: 'Write conversation starters based on the interests/topics given.',
  screenshot: 'Read the conversation in the screenshot and suggest replies to the latest message. Give one each: funny, smooth, confident, casual.',
  chat: 'Help the user with what they are asking, giving ready-to-send message options.',
};

const SYSTEM = `You are Rizz Bot, the fun dating/chatting coach inside the social app Stimzzy'sgram.
You help users write charming, respectful messages. Rules:
- Never produce sexually explicit, abusive, manipulative, deceptive, harassing or pressuring content.
- Respect consent: if the other person seems uninterested, suggest a graceful, respectful way to step back.
- Keep each option short (1-2 sentences), natural, and ready to send, emojis welcome.
- The user always sends messages themselves. You never send anything.
Return ONLY a JSON array of 3 to 4 strings (the message options). No markdown, no commentary.`;

function parseResponses(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const arr = JSON.parse(clean.slice(clean.indexOf('['), clean.lastIndexOf(']') + 1));
    if (Array.isArray(arr) && arr.length) return arr.map(String).slice(0, 5);
  } catch {}
  return clean.split('\n').map((l) => l.replace(/^[-*\d."\s]+|["\s]+$/g, '')).filter(Boolean).slice(0, 4);
}

exports.generate = async ({ message = '', style = 'smooth', context = '', category = 'chat', image, history = [] }) => {
  if (!process.env.AI_API_KEY || process.env.AI_API_KEY === 'your_key_here') {
    const err = new Error('Rizz Bot is unavailable right now.'); err.status = 503; throw err;
  }
  const task = `${CATEGORY_TASKS[category] || CATEGORY_TASKS.chat}\nStyle: ${STYLES[style] || STYLES.smooth}.`;
  const userText = `${task}\n${context ? `Context: ${context}\n` : ''}${message ? `User says: ${message}` : ''}`;
  const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  const hist = history.slice(-6).map((h) => ({ role: h.role === 'bot' ? 'assistant' : 'user', content: h.content }));

  let raw;
  if (provider === 'gemini') {
    const contents = hist.map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] }));
    const parts = [{ text: userText }];
    if (image) parts.push({ inlineData: { mimeType: image.mediaType || 'image/jpeg', data: image.data } });
    contents.push({ role: 'user', parts });
    const model = process.env.AI_MODEL || 'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.AI_API_KEY)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { maxOutputTokens: 600, responseMimeType: 'application/json' },
      }),
    });
    const data = await r.json();
    if (!r.ok) throw Object.assign(new Error('AI provider error'), { status: 502, detail: data });
    raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  } else if (provider === 'anthropic') {
    const content = [];
    if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType || 'image/jpeg', data: image.data } });
    content.push({ type: 'text', text: userText });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.AI_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.AI_MODEL, max_tokens: 600, system: SYSTEM, messages: [...hist, { role: 'user', content }] }),
    });
    const data = await r.json();
    if (!r.ok) throw Object.assign(new Error('AI provider error'), { status: 502, detail: data });
    raw = data.content?.map((c) => c.text || '').join('') || '';
  } else {
    const content = [{ type: 'text', text: userText }];
    if (image) content.push({ type: 'image_url', image_url: { url: `data:${image.mediaType || 'image/jpeg'};base64,${image.data}` } });
    const r = await fetch(`${process.env.AI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({ model: process.env.AI_MODEL, max_tokens: 600, messages: [{ role: 'system', content: SYSTEM }, ...hist, { role: 'user', content }] }),
    });
    const data = await r.json();
    if (!r.ok) throw Object.assign(new Error('AI provider error'), { status: 502, detail: data });
    raw = data.choices?.[0]?.message?.content || '';
  }
  const responses = parseResponses(raw);
  if (!responses.length) throw Object.assign(new Error('AI returned no suggestions'), { status: 502 });
  return responses;
};
