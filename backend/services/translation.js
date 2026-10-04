const { complete } = require('./aiProvider');

module.exports = async (text, targetLanguage) => {
  const system = `Translate the user's text into ${targetLanguage}. Preserve its meaning, tone, and formatting. Return only the translation, without quotes or explanation.`;
  const translation = (await complete({
    purpose: 'translation',
    system,
    messages: [{ role: 'user', content: text }],
    maxTokens: 1000,
  })).trim();
  if (!translation) {
    const err = new Error('The translation provider returned no translation.');
    err.status = 502;
    throw err;
  }
  return translation;
};
