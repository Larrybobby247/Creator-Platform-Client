import { api } from './api';
// Phone / desktop notification-bar alerts (web push). Used by the "Turn on" prompt in Messages; Settings has the same switch.
const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export async function enablePush() {
  if (!pushSupported()) throw new Error('Notifications are not supported in this browser. On iPhone, add Privy to your Home Screen first.');
  const { key } = await api('/push/key'); if (!key) throw new Error('Push is not configured on the server yet');
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notification permission was denied. You can allow it in your browser settings.');
  const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
  await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
}
