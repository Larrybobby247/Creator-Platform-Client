// Colour themes. Each one is a set of CSS variables in index.css, switched with <html data-theme="...">. Saved on this device.
export const THEMES = [
  { id: 'midnight', name: 'Midnight', note: 'Deep violet (default)', bg: '#101016', a: '#8B5CF6', b: '#EC4899', card: '#191923' },
  { id: 'ocean', name: 'Ocean', note: 'Calm blue and teal', bg: '#0A1220', a: '#0EA5E9', b: '#14B8A6', card: '#111C2F' },
  { id: 'emerald', name: 'Emerald', note: 'Fresh green', bg: '#0A1410', a: '#10B981', b: '#84CC16', card: '#111F19' },
  { id: 'sunset', name: 'Sunset', note: 'Warm orange and pink', bg: '#171110', a: '#F97316', b: '#EC4899', card: '#221815' },
  { id: 'daylight', name: 'Daylight', note: 'Light mode', bg: '#F5F5FA', a: '#7C3AED', b: '#DB2777', card: '#FFFFFF' },
];
const KEY = 'theme';
export const getTheme = () => { try { const t = localStorage.getItem(KEY); return THEMES.some((x) => x.id === t) ? t : 'midnight'; } catch { return 'midnight'; } };
export function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  document.documentElement.dataset.theme = t.id; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  try { localStorage.setItem(KEY, t.id); } catch { /* private mode: the theme still applies for this visit */ }
}
