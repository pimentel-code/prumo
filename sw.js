/* sw.js — guarda o app no aparelho para funcionar sem internet. */

const VERSAO = 'prumo-v7';
const ARQUIVOS = [
  './', './index.html', './estilo.css',
  './versao-miolo.js', './miolo.js', './interpretador.js', './dados.js', './calendario.js', './avisos.js', './tutorial.js', './atualizacao.js', './esfera.js', './app.js',
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

/* "atualizar" (mandado pela página quando vê versão nova): baixa de novo todos
   os arquivos, direto da rede, e só então responde — a página recarrega já inteira
   na versão nova (iPhone: o app da Tela de Início fica dias suspenso sem reabrir). */
self.addEventListener('message', evento => {
  if (!evento.data || evento.data.tipo !== 'atualizar') return;
  const porta = evento.ports && evento.ports[0];
  evento.waitUntil(caches.open(VERSAO).then(c => Promise.all(ARQUIVOS.map(a =>
      fetch(new Request(a, { cache: 'reload' })).then(r => { if (r.ok) return c.put(a, r); throw new Error(a + ' ' + r.status); })
    )))
    .then(() => porta && porta.postMessage({ ok: true }))
    .catch(e => porta && porta.postMessage({ ok: false, erro: String(e) })));
});

/* Primeiro o que está guardado (abre instantâneo e funciona sem rede);
   em paralelo busca a versão nova para a próxima abertura. */
self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET') return;
  // "?fresco": conferir a versão no servidor, sem cache e sem guardar.
  if (new URL(evento.request.url).searchParams.has('fresco')) {
    evento.respondWith(fetch(evento.request, { cache: 'no-store' }));
    return;
  }
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
