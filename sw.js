const CACHE_NAME = 'academia-v3';
const urlsToCache = ['./', './index.html', './favicon.png', './manifest.json'];

const scheduledTimers = [];

function clearScheduledTimers() {
  scheduledTimers.forEach(id => clearTimeout(id));
  scheduledTimers.length = 0;
}

function nomeLimpo(nome) {
  return nome.replace(/^\d+\.\s*/, '');
}

function agrupar(lista) {
  const grupos = [];
  const usados = new Set();
  lista.forEach((ref, i) => {
    if (usados.has(i)) return;
    const [h1, m1] = ref.horario.split(':').map(Number);
    const grupo = [ref];
    usados.add(i);
    lista.forEach((ref2, j) => {
      if (usados.has(j)) return;
      const [h2, m2] = ref2.horario.split(':').map(Number);
      const diff = Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
      if (diff <= 15) { grupo.push(ref2); usados.add(j); }
    });
    grupos.push(grupo);
  });
  return grupos;
}

function scheduleNotifications(refeicoes) {
  clearScheduledTimers();
  if (!refeicoes || !refeicoes.length) return;

  const pendentes = refeicoes.filter(r => !r.concluido);
  const grupos = agrupar(pendentes);

  grupos.forEach(grupo => {
    const primeiro = grupo[0];
    const [h, m] = primeiro.horario.split(':').map(Number);

    const titulo = grupo.length > 1
      ? grupo.map(r => nomeLimpo(r.nome)).join(' + ')
      : nomeLimpo(primeiro.nome);

    const corpo = grupo.map(r => r.itens).join(' | ');
    const horarios = grupo.map(r => r.horario);

    const aviso15 = new Date();
    aviso15.setHours(h, m - 15, 0, 0);
    const ms15 = aviso15 - Date.now();
    if (ms15 > 0) {
      const id15 = setTimeout(() => {
        self.registration.showNotification(titulo + ' às ' + primeiro.horario, {
          body: corpo,
          icon: './favicon.png',
          badge: './favicon.png',
          tag: 'aviso-' + primeiro.horario,
          renotify: true
        });
      }, ms15);
      scheduledTimers.push(id15);
    }

    const avisoExato = new Date();
    avisoExato.setHours(h, m, 0, 0);
    const msExato = avisoExato - Date.now();
    if (msExato > 0) {
      const idExato = setTimeout(() => {
        self.registration.showNotification('Hora de comer — ' + titulo, {
          body: corpo,
          icon: './favicon.png',
          badge: './favicon.png',
          tag: 'hora-' + primeiro.horario,
          renotify: true,
          requireInteraction: true,
          data: { horarios }
        });
      }, msExato);
      scheduledTimers.push(idExato);
    }
  });
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleNotifications(event.data.refeicoes);
  }
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hora de comer!', {
      body: data.body || 'Está na hora da sua refeição.',
      icon: './favicon.png',
      badge: './favicon.png',
      tag: data.tag || 'refeicao',
      renotify: true,
      requireInteraction: false,
      data: { url: './' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('./');
    })
  );
});
