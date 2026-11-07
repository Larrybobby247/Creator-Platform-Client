// Phone / desktop notifications. A message push is shown in the notification bar unless the app is already open and in front
// (then the in-app toast and badge are enough, and a second banner would just be noise).
self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (d.type === 'MESSAGE' && wins.some((w) => w.visibilityState === 'visible' && w.focused)) return;
    await self.registration.showNotification(d.title || 'Privy', { body: d.body, data: { link: d.link || '/' }, icon: '/favicon.svg', badge: '/favicon.svg', tag: d.tag || undefined, renotify: !!d.tag });
  })());
});
// Tapping it opens the app on the right screen: reuses an open tab when there is one.
self.addEventListener('notificationclick', (e) => {
  e.notification.close(); const link = e.notification.data?.link || '/';
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins.find((x) => 'focus' in x);
    if (w) { await w.focus(); if ('navigate' in w) { try { await w.navigate(link); } catch { /* cross-origin or blocked: fall through */ } } return; }
    await clients.openWindow(link);
  })());
});
// Lets the browser treat the site as installable. Requests go straight to the network (no offline cache).
self.addEventListener('fetch', () => {});
