const CACHE_NAME = 'academia-v2';
const urlsToCache = ['/', '/index.html', '/favicon.png', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Recebe mensagem do app para agendar notificações
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleNotifications(event.data.refeicoes);
  }
});

// Dispara notificação push local
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hora de comer!', {
      body: data.body || 'Está na hora da sua refeição.',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: data.tag || 'refeicao',
      renotify: true,
      requireInteraction: false,
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
