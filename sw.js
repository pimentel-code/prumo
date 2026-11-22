/* sw.js — guarda o app no aparelho para funcionar sem internet. */

const VERSAO = 'prumo-v4';
const ARQUIVOS = [
  './', './index.html', './estilo.css',
  './interpretador.js', './dados.js', './calendario.js', './avisos.js', './tutorial.js', './atualizacao.js', './app.js',
  './manifest.webmanifest',
  './icones/icone-192.png', './icones/icone-512.png', './icones/icone-180.png'
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Primeiro o que está guardado (abre instantâneo e funciona sem rede);
   em paralelo busca a versão nova para a próxima abertura. */
self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    caches.match(evento.request).then(guardado => {
      const rede = fetch(evento.request).then(resposta => {
        if (resposta && resposta.ok && resposta.type === 'basic') {
          const copia = resposta.clone();
          caches.open(VERSAO).then(c => c.put(evento.request, copia));
        }
        return resposta;
      }).catch(() => guardado);
      return guardado || rede;
    })
  );
});
