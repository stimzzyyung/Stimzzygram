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
  none: null, warm: 'rgba(255,140,0,0.18)', cool: 'rgba(6,182,212,0.22)', violet: 'rgba(124,58,237,0.25)', noir: 'rgba(0,0,0,0.4)', fade: 'rgba(255,255,255,0.25)',
};
