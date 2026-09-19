/* Service worker: guarda a casca do app para abrir sem internet.
   Suba a versão do cache sempre que alterar arquivos estáticos. */
var CACHE = 'horta-v1';
var ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/estilo.css',
  './js/dados.js',
  './js/gerador.js',
  './js/grafico.js',
  './js/app.js',
  './icons/icone-192.png',
  './icons/icone-512.png'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(ARQUIVOS); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.filter(function (c) { return c !== CACHE; })
        .map(function (c) { return caches.delete(c); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Cache primeiro para a casca; rede primeiro para chamadas de API (/api/). */
self.addEventListener('fetch', function (evento) {
  var url = new URL(evento.request.url);
  if (evento.request.method !== 'GET') return;

  if (url.pathname.indexOf('/api/') === 0) {
    evento.respondWith(
      fetch(evento.request).catch(function () { return caches.match(evento.request); })
    );
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then(function (resposta) {
      return resposta || fetch(evento.request).then(function (rede) {
        var copia = rede.clone();
        caches.open(CACHE).then(function (cache) { cache.put(evento.request, copia); });
        return rede;
      });
    })
  );
});
