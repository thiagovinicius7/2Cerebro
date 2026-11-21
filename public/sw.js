// Service worker do 2Cerebro: só recebe e mostra as notificações (12h e 18h).
// Não guarda cache do app.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  // Mensagem do Firebase Cloud Messaging só com "data"
  const data = payload.data || payload;
  const title = data.title || 'Segundo Cérebro';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: data.tag || '2cerebro',
      data: { url: data.url || './#hoje' },
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './#hoje', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
