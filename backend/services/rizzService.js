/**
 * Rizz Bot AI service for StimzzyVibe.
 * Generates fun, confident, romantic, funny, flirty or clever replies.
 */
const { complete } = require('./aiProvider');

const STYLES = {
  chill: 'relaxed, easygoing and low-pressure',
  cute: 'sweet, wholesome and cute',
  smooth: 'smooth, charming and effortless',
  savage: 'bold, witty, playfully savage teasing (never mean or insulting)',
  funny: 'funny, hilarious, witty and joke-driven',
  romantic: 'warm, sincere, deeply romantic and heartfelt',
  confident: 'bold, confident and self-assured without arrogance',
  flirty: 'playfully flirty, charming and alluring',
  casual: 'casual and natural, like texting a close friend',
  shorter: 'ultra-concise, punchy, 3 to 7 words maximum',
};

const CATEGORY_TASKS = {
  romantic: 'Craft romantic, heartfelt and charming responses.',
  funny: 'Craft hilarious, clever and humorous replies.',
  flirty: 'Craft teasing, playfully flirty and romantic replies with subtle emojis.',
  confident: 'Craft bold, high-status, charismatic and self-assured replies.',
  cute: 'Craft adorable, sweet and warm replies.',
  savage: 'Craft playful, witty banter and savage (yet friendly) teasing.',
  conversation_starter: 'Write magnetic conversation starters based on the provided topic or person.',
  first_message: 'Write catchy opening messages to send to someone you just followed or matched with.',
  dating_reply: 'Write charming dating app and direct message replies.',
  reply: 'Write charming replies to the message the other person sent.',
  screenshot: 'Analyze the screenshot conversation and suggest replies to the last message received.',
  chat: 'Help the user with dating and texting advice, giving ready-to-send reply options.',
};

const SYSTEM = `You are Rizz Bot, the ultimate dating and texting AI assistant inside the mobile social app StimzzyVibe.
You help users write charming, funny, flirty, confident, romantic, and memorable replies.
Guidelines:
- Never generate explicit, abusive, deceptive, manipulative, or harassing content.
- Keep each reply short (1-2 lines), natural, modern, and ready to paste into chat. Emojis welcome.
- Always provide variety (different angles/tones).
Return ONLY a valid JSON array of 3 to 4 string options. No markdown ticks, no preamble.`;

function parseResponses(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start < 0 || end <= start) {
    throw Object.assign(new Error('AI provider returned an invalid response.'), { status: 502 });
  }

  let parsed;
  try {
    parsed = JSON.parse(clean.slice(start, end + 1));
  } catch {
    throw Object.assign(new Error('AI provider returned an invalid response.'), { status: 502 });
  }
  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error('AI provider returned an invalid response.'), { status: 502 });
  }

  const responses = parsed
    .filter((response) => typeof response === 'string')
    .map((response) => response.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (!responses.length) {
    throw Object.assign(new Error('AI provider returned an invalid response.'), { status: 502 });
  }
  return responses;
}

exports.generate = async ({
  message = '',
  style = 'smooth',
  context = '',
  category = 'reply',
  image,
  history = [],
  modifier = '',
}) => {
  let effectiveStyle = style;
  if (modifier === 'more_flirty') effectiveStyle = 'flirty';
  if (modifier === 'more_funny') effectiveStyle = 'funny';
  if (modifier === 'more_confident') effectiveStyle = 'confident';
  if (modifier === 'make_shorter') effectiveStyle = 'shorter';

  const task = `${CATEGORY_TASKS[category] || CATEGORY_TASKS.reply}\nTone & Style: ${STYLES[effectiveStyle] || STYLES.smooth}.`;
  const userText = `${task}\n${context ? `Context/Details: ${context}\n` : ''}${message ? `The other person sent or user wants reply to: "${message}"` : ''}`;

  const messages = [
    ...history.slice(-6).map((entry) => ({
      role: entry.role === 'bot' ? 'assistant' : 'user',
      content: entry.content,
    })),
    { role: 'user', content: userText },
  ];

  const raw = await complete({ purpose: 'rizz', system: SYSTEM, messages, image, maxTokens: 500, json: true });
  return parseResponses(raw);
};
