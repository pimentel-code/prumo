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
  async download(o) {
    if (!o.checksum) throw new Error('Checksum required');   // igual à peça de verdade
    peca.baixados.push(o); const b = { id: 'id' + o.version.replace('1.', ''), version: o.version, status: 'pending' }; peca.pacotes.push(b); return b; },
  async next(o) { peca.proximo = o.id; return {}; }
};
window.Capacitor.Plugins.CapacitorUpdater = peca;

const rel = (tag, nativo, extra) => Object.assign({ tag_name: tag, draft: false, prerelease: false,
  body: 'mudou algo' + (nativo ? ' [nativo:' + nativo + ']' : ''),
  assets: [{ name: 'Prumo.apk', browser_download_url: 'https://x/' + tag + '/Prumo.apk' },
           { name: 'miolo.zip', browser_download_url: 'https://x/' + tag + '/miolo.zip' }] }, extra || {});
let lista = [];
globalThis.fetch = async url => {
  if (/canais\.json/.test(url)) {
    // canais.json montado a partir da lista de releases (como o canais.py faz)
    const v = j => ({ codigo: Miolo.codigoDe(j.tag_name), nativo: Miolo.nativoDe(j), sha256: 'sha' + j.tag_name,
      apk: 'https://x/' + j.tag_name + '/Prumo.apk', miolo: 'https://x/' + j.tag_name + '/miolo.zip', notas: '' });
    const maior = l => l.map(v).sort((a, b) => b.codigo - a.codigo)[0];
    const c = globalThis.canaisSim || (lista.length && !globalThis.semCanais
      ? { estavel: maior(lista.filter(j => !j.prerelease)), teste: maior(lista) } : null);
    return c ? { ok: true, status: 200, async json() { return c; } } : { ok: false, status: 404, async json() { return {}; } };
  }
  if (/releases\?/.test(url)) return { ok: true, status: 200, async json() { return lista; } };
  return { ok: true, status: 200, async json() { return lista.find(r => !r.prerelease) || {}; } };
};
const limpar = () => { peca.baixados = []; peca.proximo = null; peca.pacotes = []; localStorage.removeItem(Miolo.CHAVE_VISTO); localStorage.removeItem(Miolo.CHAVE_FALHOU); };

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
  await prova('versão que mexe na parte nativa não vem pelo miolo (precisa do APK)', async () =>
    (await Miolo.conferir(true)) === null && peca.baixados.length === 0);
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
  peca.download = async () => { throw new Error('rede caiu'); };
  await prova('download que falha fica anotado no diário', async () =>
    (await Miolo.conferir(true)) === null && Miolo.diario()[0].texto.includes('rede caiu'));
  await prova('…e não tenta de novo no mesmo dia sozinho', async () => {
    localStorage.removeItem(Miolo.CHAVE_VISTO);
    return (await Miolo.conferir(false)) === null && Miolo.diario()[0].texto.includes('amanhã'); });
  peca.download = async (o) => { if (!o.checksum) throw new Error('Checksum required'); peca.baixados.push(o); const b = { id: 'id' + o.version.replace('1.', ''), version: o.version, status: 'pending' }; peca.pacotes.push(b); return b; };
  await prova('…mas tenta na hora se a pessoa tocar em Procurar atualização', async () =>
    (await Miolo.conferir(true)) === '1.10');

  limpar();
  peca.pacotes = [{ id: 'jaTinha', version: '1.10', status: 'pending' }];
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
  await prova('o nome da versão vai no formato 1.N', () => peca.baixados.length === 0 || /^1\.\d+$/.test(peca.baixados[0].version));
  // canais.json (sem o limite de 60/h da API): é o caminho principal desde a 1.16
  limpar(); Miolo.versao = 9;
  const canal = (n, nat) => ({ codigo: n, nativo: nat, sha256: 'x' + n, apk: 'https://x/c' + n + '/Prumo.apk', miolo: 'https://x/c' + n + '/miolo.zip', notas: '' });
  globalThis.canaisSim = { estavel: canal(13, 9), teste: canal(15, 9) };
  let usouApi = false; const f0 = globalThis.fetch;
  globalThis.fetch = async u => { if (/api\.github/.test(u)) usouApi = true; return f0(u); };
  Miolo.ligarTeste(false);
  await prova('canais.json: o estável chega sem usar a API do GitHub', async () =>
    (await Miolo.conferir(true)) === '1.13' && peca.baixados[0].url === 'https://x/c13/miolo.zip' && !usouApi);
  limpar(); Miolo.ligarTeste(true);
  await prova('canais.json: quem testa recebe o de teste', async () => (await Miolo.conferir(true)) === '1.15');
  Miolo.ligarTeste(false);
  globalThis.canaisSim = { estavel: canal(16, 16), teste: canal(16, 16) };
  globalThis.versaoInstalada = 9;
  await prova('canais.json: parte nativa nova mostra a faixa "Versão nova"', async () => {
    const n = await Atualizacao.conferir(true); return !!n && n.versao === '1.16' && n.url === 'https://x/c16/Prumo.apk'; });
  globalThis.fetch = f0; globalThis.canaisSim = null;
  limpar(); lista = [rel('v1.10', 9)]; globalThis.semCanais = true;
  await prova('sem canais.json (só a API de reserva, sem SHA-256): não tenta baixar miolo', async () =>
    (await Miolo.conferir(true)) === null && peca.baixados.length === 0);
  globalThis.semCanais = false;
  await prova('o download vai com o SHA-256 (a peça recusa sem ele)', async () => {
    limpar(); return (await Miolo.conferir(true)) === '1.10' && peca.baixados[0].checksum === 'shav1.10'; });
  limpar();
  localStorage.setItem(Miolo.CHAVE_VISTO, String(Date.now()));
  await prova('não pergunta ao GitHub de novo antes de 30 minutos', async () =>
    (await Miolo.conferir(false)) === null && peca.baixados.length === 0);

  print('');
  print(falhas ? falhas + ' PROBLEMA(S)' : 'tudo passou');
})();
