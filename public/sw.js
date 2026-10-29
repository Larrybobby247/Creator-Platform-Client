self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title || 'Privy', { body: d.body, data: { link: d.link || '/' }, icon: '/favicon.svg' }));
});
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data.link || '/')); });
// Lets the browser treat the site as installable. Requests go straight to the network (no offline cache).
self.addEventListener('fetch', () => {});
