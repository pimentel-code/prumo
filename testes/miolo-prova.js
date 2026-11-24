/* Provas da atualização silenciosa do miolo (miolo.js) e do aviso de APK. */
let falhas = 0;
async function prova(nome, fn) {
  try {
    const r = await fn();
    if (r === false) { print('FALHOU  ' + nome); falhas++; } else print('ok      ' + nome);
  } catch (e) { print('ERRO    ' + nome + ' → ' + e.message); falhas++; }
}

/* A peça de atualização, de mentira: anota o que baixou e o que marcou. */
const peca = { baixados: [], proximo: null, pacotes: [],
  async notifyAppReady() { peca.avisou = true; return {}; },
  async list() { return { bundles: peca.pacotes }; },
  async download(o) { peca.baixados.push(o); const b = { id: 'id' + o.version, version: o.version, status: 'pending' }; peca.pacotes.push(b); return b; },
  async next(o) { peca.proximo = o.id; return {}; }
};
window.Capacitor.Plugins.CapacitorUpdater = peca;

const rel = (tag, nativo, extra) => Object.assign({ tag_name: tag, draft: false, prerelease: false,
  body: 'mudou algo' + (nativo ? ' [nativo:' + nativo + ']' : ''),
  assets: [{ name: 'Prumo.apk', browser_download_url: 'https://x/' + tag + '/Prumo.apk' },
           { name: 'miolo.zip', browser_download_url: 'https://x/' + tag + '/miolo.zip' }] }, extra || {});
let lista = [];
globalThis.fetch = async url => {
  if (/releases\?/.test(url)) return { ok: true, status: 200, async json() { return lista; } };
  return { ok: true, status: 200, async json() { return lista.find(r => !r.prerelease) || {}; } };
};
const limpar = () => { peca.baixados = []; peca.proximo = null; peca.pacotes = []; localStorage.removeItem(Miolo.CHAVE_VISTO); };

(async () => {
  Miolo.versao = 9; globalThis.versaoInstalada = 9;

  lista = [rel('v1.10', 9), rel('v1.9', 9)];
  limpar();
  await prova('miolo novo (só telas) é baixado e marcado para a próxima abertura', async () =>
    (await Miolo.conferir(true)) === '1.10' && peca.baixados[0].url.endsWith('v1.10/miolo.zip') && peca.proximo === 'id10');

  await prova('…e NÃO mostra a faixa "Versão nova" (não precisa de APK)', async () =>
    (await Atualizacao.conferir(true)) === null);

  limpar();
  lista = [rel('v1.11', 11), rel('v1.10', 9)];
  await prova('versão que mexe na parte nativa não vem pelo miolo: fica a mais nova que serve', async () =>
    (await Miolo.conferir(true)) === '1.10');
  await prova('…e essa sim mostra a faixa "Versão nova" para instalar o APK', async () => {
    const n = await Atualizacao.conferir(true); return !!n && n.versao === '1.11'; });

  limpar();
  lista = [rel('v1.12', 9, { prerelease: true }), rel('v1.10', 9)];
  Miolo.ligarTeste(false);
  await prova('versão de teste não chega a quem não testa', async () => (await Miolo.conferir(true)) === '1.10');
  limpar(); Miolo.ligarTeste(true);
  await prova('…e chega a quem ligou "Versões de teste"', async () => (await Miolo.conferir(true)) === '1.12');
  Miolo.ligarTeste(false);

  limpar();
  lista = [rel('v1.10', 9)];
  peca.pacotes = [{ id: 'velho', version: '10', status: 'error' }];
  await prova('versão que já falhou ao abrir neste celular não é baixada de novo', async () =>
    (await Miolo.conferir(true)) === null && peca.baixados.length === 0);

  limpar();
  peca.pacotes = [{ id: 'jaTinha', version: '10', status: 'pending' }];
  await prova('miolo já baixado antes é reaproveitado, sem baixar de novo', async () =>
    (await Miolo.conferir(true)) === '1.10' && peca.baixados.length === 0 && peca.proximo === 'jaTinha');

  limpar();
  lista = [rel('v1.9', 9)];
  await prova('já está na mais nova: não baixa nada', async () => (await Miolo.conferir(true)) === null && !peca.baixados.length);

  limpar();
  lista = [rel('v1.8', 0)];  // release antiga, sem marca
  await prova('release antiga sem marca [nativo] conta como exigindo a própria versão', () => Miolo.nativoDe(lista[0]) === 8);

  limpar();
  lista = [rel('v1.10', 9)];
  await Miolo.conferir(true);
  peca.baixados = [];
  await prova('não pergunta ao GitHub de novo antes de 30 minutos', async () =>
    (await Miolo.conferir(false)) === null && peca.baixados.length === 0);

  print('');
  print(falhas ? falhas + ' PROBLEMA(S)' : 'tudo passou');
})();
