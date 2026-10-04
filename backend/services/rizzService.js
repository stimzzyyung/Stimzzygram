/**
 * Rizz Bot AI service. The provider is configurable via environment variables;
 * the API key is only used by the backend.
 */
const { complete } = require('./aiProvider');

const STYLES = {
  chill: 'relaxed, easygoing and low-pressure',
  cute: 'sweet, wholesome and a little shy',
  smooth: 'smooth, charming and effortless',
  savage: 'bold, witty and playfully teasing (never mean or insulting)',
  funny: 'funny, light-hearted and joke-driven',
  romantic: 'warm, sincere and romantic',
  confident: 'confident and self-assured without arrogance',
  flirty: 'playfully flirty but respectful',
  casual: 'casual and natural, like texting a friend',
};

const CATEGORY_TASKS = {
  first_message: 'Write opening messages the user can send to someone they like or just followed.',
  reply: 'Write replies to the message the other person sent.',
  compliment: 'Write genuine, respectful compliments.',
  starter: 'Write conversation starters based on the interests/topics given.',
  screenshot: 'Read the conversation in the screenshot and suggest replies to the latest message. Give one each: funny, smooth, confident, casual.',
  chat: 'Help the user with what they are asking, giving ready-to-send message options.',
};

const SYSTEM = `You are Rizz Bot, the fun dating/chatting coach inside the social app StimzzyVibe.
You help users write charming, respectful messages. Rules:
- Never produce sexually explicit, abusive, manipulative, deceptive, harassing or pressuring content.
- Respect consent: if the other person seems uninterested, suggest a graceful, respectful way to step back.
- Keep each option short (1-2 sentences), natural, and ready to send, emojis welcome.
- The user always sends messages themselves. You never send anything.
Return ONLY a JSON array of 3 to 4 strings (the message options). No markdown, no commentary.`;

function parseResponses(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    const parsed = start >= 0 && end > start ? JSON.parse(clean.slice(start, end + 1)) : null;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean).slice(0, 5);
  } catch {}
  return clean.split('\n').map((line) => line.replace(/^[-*\d."\s]+|["\s]+$/g, '')).filter(Boolean).slice(0, 4);
}

exports.generate = async ({ message = '', style = 'smooth', context = '', category = 'chat', image, history = [] }) => {
  const task = `${CATEGORY_TASKS[category] || CATEGORY_TASKS.chat}\nStyle: ${STYLES[style] || STYLES.smooth}.`;
  const userText = `${task}\n${context ? `Context: ${context}\n` : ''}${message ? `User says: ${message}` : ''}`;
  const messages = [
    ...history.slice(-6).map((entry) => ({ role: entry.role === 'bot' ? 'assistant' : 'user', content: entry.content })),
    { role: 'user', content: userText },
  ];
  const raw = await complete({ purpose: 'rizz', system: SYSTEM, messages, image, maxTokens: 600, json: true });
  const responses = parseResponses(raw);
  if (!responses.length) {
    const err = new Error('The AI provider returned no suggestions.');
    err.status = 502;
    throw err;
  }
  return responses;
};
