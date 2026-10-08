const { complete } = require('./aiProvider');

const LANGUAGE_ALIASES = {
  english: ['english', 'en'],
  french: ['french', 'fr', 'français', 'francais'],
  spanish: ['spanish', 'es', 'español', 'espanol'],
  portuguese: ['portuguese', 'pt', 'português', 'portugues'],
  german: ['german', 'de', 'deutsch'],
  arabic: ['arabic', 'ar', 'العربية'],
  chinese: ['chinese', 'zh', 'mandarin', '中文'],
  japanese: ['japanese', 'ja', '日本語'],
  korean: ['korean', 'ko', '한국어'],
  hindi: ['hindi', 'hi', 'हिन्दी', 'हिंदी'],
  yoruba: ['yoruba', 'yo', 'èdè yorùbá', 'ede yoruba'],
  igbo: ['igbo', 'ig'],
  hausa: ['hausa', 'ha'],
  swahili: ['swahili', 'sw', 'kiswahili'],
};

const FALLBACK_PHRASES = {
  french: {
    hello: 'Bonjour',
    'good morning': 'Bonjour',
    'good night': 'Bonne nuit',
    thanks: 'Merci',
    thank: 'Merci',
    thankyou: 'Merci',
    yes: 'Oui',
    no: 'Non',
    love: 'Amour',
    friend: 'Ami',
    'how are you': 'Comment ça va ?',
    'i love you': 'Je t\'aime',
  },
  spanish: {
    hello: 'Hola',
    'good morning': 'Buenos días',
    'good night': 'Buenas noches',
    thanks: 'Gracias',
    thank: 'Gracias',
    thankyou: 'Gracias',
    yes: 'Sí',
    no: 'No',
    love: 'Amor',
    friend: 'Amigo',
    'how are you': '¿Cómo estás?',
    'i love you': 'Te quiero',
  },
  portuguese: {
    hello: 'Olá',
    'good morning': 'Bom dia',
    'good night': 'Boa noite',
    thanks: 'Obrigado',
    thank: 'Obrigado',
    thankyou: 'Obrigado',
    yes: 'Sim',
    no: 'Não',
    love: 'Amor',
    friend: 'Amigo',
    'how are you': 'Como vai você?',
    'i love you': 'Eu te amo',
  },
  german: {
    hello: 'Hallo',
    'good morning': 'Guten Morgen',
    'good night': 'Gute Nacht',
    thanks: 'Danke',
    thank: 'Danke',
    thankyou: 'Danke',
    yes: 'Ja',
    no: 'Nein',
    love: 'Liebe',
    friend: 'Freund',
    'how are you': 'Wie geht es dir?',
    'i love you': 'Ich liebe dich',
  },
  arabic: {
    hello: 'مرحبا',
    'good morning': 'صباح الخير',
    'good night': 'تصبح على خير',
    thanks: 'شكرا',
    thank: 'شكرا',
    thankyou: 'شكرا',
    yes: 'نعم',
    no: 'لا',
    love: 'حب',
    friend: 'صديق',
    'how are you': 'كيف حالك؟',
    'i love you': 'أنا أحبك',
  },
  swahili: {
    hello: 'Hujambo',
    'good morning': 'Habari za asubuhi',
    'good night': 'Usiku mwema',
    thanks: 'Asante',
    thank: 'Asante',
    thankyou: 'Asante',
    yes: 'Ndiyo',
    no: 'Hapana',
    love: 'Pendo',
    friend: 'Rafiki',
    'how are you': 'Uko aje?',
    'i love you': 'Nakupenda',
  },
};

const normalizeLanguage = (targetLanguage = 'English') => {
  const normalized = String(targetLanguage).trim().toLowerCase();
  if (!normalized) return 'english';
  const hit = Object.entries(LANGUAGE_ALIASES).find(([, aliases]) => aliases.includes(normalized));
  return hit ? hit[0] : normalized.replace(/[^a-z]/g, '');
};

const fallbackTranslate = (text, targetLanguage) => {
  const input = String(text || '').trim();
  if (!input) return '';
  const language = normalizeLanguage(targetLanguage);
  const lookup = FALLBACK_PHRASES[language];
  if (!lookup) return input;
  const lower = input.toLowerCase();
  if (lookup[lower]) return lookup[lower];
  const directMatch = Object.entries(lookup).find(([key]) => lower === key || lower.includes(key));
  if (directMatch) return directMatch[1];
  const head = lower.split(/\s+/).find((word) => lookup[word]);
  if (head) return lookup[head];
  return input;
};

module.exports = async (text, targetLanguage) => {
  const system = `Translate the user's text into ${targetLanguage}. Preserve its meaning, tone, and formatting. Return only the translation, without quotes or explanation.`;
  try {
    const translation = (await complete({
      purpose: 'translation',
      system,
      messages: [{ role: 'user', content: text }],
      maxTokens: 1000,
    })).trim();
    if (translation) return translation;
  } catch (error) {
    console.warn('[Translation] AI translation failed, using built-in fallback:', error.message);
  }

  const fallback = fallbackTranslate(text, targetLanguage);
  if (fallback) return fallback;

  const err = new Error('The translation provider returned no translation.');
  err.status = 502;
  throw err;
};
