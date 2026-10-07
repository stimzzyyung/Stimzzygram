// Currency and pricing service for StimzzyVibe Premium
// Base price: ₦2,000 Nigerian Naira

let basePriceNGN = 2000;

// Configurable exchange rates (1 USD = X currency, and 1 USD = 1480 NGN approx)
let exchangeRates = {
  NGN: 1, // Base in Naira
  USD: 0.000675, // ~ $1.35 USD for 2000 NGN
  GBP: 0.000525, // ~ £1.05 GBP
  EUR: 0.000625, // ~ €1.25 EUR
  CAD: 0.000925, // ~ $1.85 CAD
  GHS: 0.00925,  // ~ ₵18.50 GHS
  ZAR: 0.01225,  // ~ R 24.50 ZAR
  KES: 0.0875,   // ~ KSh 175 KES
};

const COUNTRY_CURRENCY_MAP = {
  Nigeria: 'NGN',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  France: 'EUR',
  Germany: 'EUR',
  Spain: 'EUR',
  Italy: 'EUR',
  Portugal: 'EUR',
  Netherlands: 'EUR',
  Canada: 'CAD',
  Ghana: 'GHS',
  'South Africa': 'ZAR',
  Kenya: 'KES',
  Brazil: 'USD',
  India: 'USD',
  Japan: 'USD',
  China: 'USD',
  Australia: 'USD',
};

const CURRENCY_SYMBOLS = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'CA$',
  GHS: 'GH₵',
  ZAR: 'R',
  KES: 'KSh',
};

const getCurrencyForCountry = (country) => {
  return COUNTRY_CURRENCY_MAP[country] || 'USD';
};

const getPriceForCurrency = (currency = 'NGN') => {
  const curr = currency.toUpperCase();
  const rate = exchangeRates[curr] || exchangeRates.USD;
  const raw = basePriceNGN * rate;
  let formatted;
  if (curr === 'NGN') {
    formatted = Math.round(raw);
  } else if (['KES'].includes(curr)) {
    formatted = Math.round(raw);
  } else {
    formatted = Number(raw.toFixed(2));
  }
  return {
    amount: formatted,
    currency: curr,
    symbol: CURRENCY_SYMBOLS[curr] || '$',
    formatted: `${CURRENCY_SYMBOLS[curr] || curr + ' '}${formatted.toLocaleString()}`,
  };
};

const getPricingForCountry = (country = 'Nigeria') => {
  const currency = getCurrencyForCountry(country);
  return {
    country,
    baseNGN: basePriceNGN,
    ...getPriceForCurrency(currency),
  };
};

const updateBasePrice = (newBaseNGN) => {
  if (newBaseNGN && Number(newBaseNGN) > 0) {
    basePriceNGN = Number(newBaseNGN);
  }
  return basePriceNGN;
};

const getRates = () => ({
  basePriceNGN,
  exchangeRates,
});

module.exports = {
  getCurrencyForCountry,
  getPriceForCurrency,
  getPricingForCountry,
  updateBasePrice,
  getRates,
  CURRENCY_SYMBOLS,
};
