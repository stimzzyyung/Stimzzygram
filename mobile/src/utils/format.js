export const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
export const compact = (n = 0) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
/** Returns a smaller version of a Cloudinary image (no-op for other URLs). thumb(url, 400) */
export const thumb = (url, width = 400) =>
  url && url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/video/')
    ? url.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`)
    : url;
export const initials = (name = '?') => name.trim().slice(0, 1).toUpperCase();
export const FILTERS = {
  none: null,
  burgundy: 'rgba(125, 17, 40, 0.30)',
  royal_gold: 'rgba(212, 175, 106, 0.26)',
  noir: 'rgba(15, 10, 15, 0.52)',
  neon_wine: 'rgba(194, 45, 82, 0.32)',
  rose_velvet: 'rgba(195, 157, 122, 0.28)',
  sunset: 'rgba(255, 120, 50, 0.24)',
  cyber: 'rgba(6, 182, 212, 0.24)',
  vintage: 'rgba(181, 137, 92, 0.26)',
  warm: 'rgba(255, 140, 0, 0.18)',
  cool: 'rgba(6, 182, 212, 0.22)',
  violet: 'rgba(124, 58, 237, 0.25)',
  fade: 'rgba(255, 255, 255, 0.25)',
};

export const FILTER_LIST = [
  { id: 'none', label: 'Original', icon: '✨' },
  { id: 'burgundy', label: 'Stimzzy Velvet', icon: '🍷' },
  { id: 'royal_gold', label: 'Royal Gold', icon: '👑' },
  { id: 'neon_wine', label: 'Neon Wine', icon: '⚡' },
  { id: 'rose_velvet', label: 'Rose Velvet', icon: '🌹' },
  { id: 'noir', label: 'Vibe Noir', icon: '🕶️' },
  { id: 'sunset', label: 'Golden Hour', icon: '🌅' },
  { id: 'cyber', label: 'Cyber Frost', icon: '💎' },
  { id: 'vintage', label: 'Retro Film', icon: '🎞️' },
];

