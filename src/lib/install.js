import { useEffect, useState } from 'react';
// "Install the app" support. The browser only offers its install prompt once, early, so it is captured here (imported from main.jsx) and used later by the UI.
let deferred = null; const subs = new Set(); const notify = () => subs.forEach((f) => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
const standalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
export function useInstall() {
  const [, tick] = useState(0); useEffect(() => { const f = () => tick((x) => x + 1); subs.add(f); return () => subs.delete(f); }, []);
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  return { installed: standalone(), canPrompt: !!deferred, ios, android: /android/i.test(ua),
    prompt: async () => { if (!deferred) return false; deferred.prompt(); const r = await deferred.userChoice; deferred = null; notify(); return r.outcome === 'accepted'; } };
}
