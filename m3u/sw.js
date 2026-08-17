// Service Worker - Links M3U
// Versão do cache: mude este valor sempre que atualizar os arquivos
// para forçar o navegador a buscar as versões novas.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `links-m3u-${CACHE_VERSION}`;

const APP_SHELL = [
  '/m3u/',
  '/m3u/index.html',
  '/m3u/manifest.json',
  '/m3u/favicon.svg',
  '/m3u/icon-192.png',
  '/m3u/icon-512.png',
  '/m3u/icon-512-maskable.png'
];

// Instala o SW e faz o cache inicial do "app shell"
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigos quando uma nova versão é ativada
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome.startsWith('links-m3u-') && nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    ).then(() => self.clients.claim())
  );
});

// Estratégia de cache:
// - Navegação (HTML): network-first, cai pro cache se estiver offline.
// - Demais recursos do próprio app (mesma origem): cache-first, atualiza em segundo plano.
// - Recursos externos (fonts, cdn): stale-while-revalidate simples.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isNavegacao = request.mode === 'navigate';
  const mesmaOrigem = url.origin === self.location.origin;

  if (isNavegacao) {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/m3u/index.html', copia));
          return resposta;
        })
        .catch(() => caches.match('/m3u/index.html'))
    );
    return;
  }

  if (mesmaOrigem) {
    event.respondWith(
      caches.match(request).then((cacheado) => {
        const buscaRede = fetch(request)
          .then((resposta) => {
            const copia = resposta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
            return resposta;
          })
          .catch(() => cacheado);
        return cacheado || buscaRede;
      })
    );
    return;
  }

  // Recursos externos (Google Fonts, Font Awesome via CDN)
  event.respondWith(
    caches.match(request).then((cacheado) => {
      const buscaRede = fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          return resposta;
        })
        .catch(() => cacheado);
      return cacheado || buscaRede;
    })
  );
});
