/* miolo.js — atualização silenciosa do "miolo" do Prumo (telas, cores, regras).

   O app Android é feito de duas partes:
   · a parte NATIVA (alarme, microfone, widget, ícone): só muda instalando um APK novo;
   · o MIOLO (HTML/CSS/JS): este arquivo o troca sozinho, sem ninguém ver.

   Como funciona: ao abrir, pergunta ao GitHub qual é a última versão liberada.
   Se o miolo dela for mais novo e servir para a parte nativa deste celular, baixa
   o miolo.zip em segundo plano e deixa marcado para a próxima vez. A troca
   acontece quando o app vai para o fundo (ou fecha) — quem abre de novo já vê a
   versão nova. Se o miolo novo não abrir direito, a peça volta sozinha ao anterior.
   Os dados (localStorage) não são tocados: continuam no mesmo lugar.

   Peça usada: @capgo/capacitor-updater em modo manual, sem a nuvem da Capgo
   (estatísticas desligadas no capacitor.config.json). */

const Miolo = {
  API: 'https://api.github.com/repos/pimentel-code/prumo/releases?per_page=15',
  CHAVE_TESTE: 'prumo.miolo.teste',     // "sim": recebe também as versões de teste
  CHAVE_VISTO: 'prumo.miolo.conferido',
  INTERVALO: 30 * 60 * 1000,            // pergunta ao GitHub no máximo a cada 30 min
  versao: typeof PRUMO_MIOLO !== 'undefined' ? PRUMO_MIOLO : 0,
  pronto: null,                         // versão já baixada esperando a troca

  plugin() {
    const P = window.Capacitor && window.Capacitor.Plugins;
    return P && P.CapacitorUpdater ? P.CapacitorUpdater : null;
  },

  recebeTeste() {
    try { return localStorage.getItem(this.CHAVE_TESTE) === 'sim'; } catch (e) { return false; }
  },
  ligarTeste(sim) {
    try { localStorage.setItem(this.CHAVE_TESTE, sim ? 'sim' : 'nao'); localStorage.removeItem(this.CHAVE_VISTO); } catch (e) {}
  },

  /* "v1.12" → 12 */
  codigoDe(tag) {
    const m = /^v?1\.(\d+)$/.exec(String(tag || '').trim());
    return m ? +m[1] : 0;
  },

  /* A release diz a menor parte nativa que o miolo dela exige: "[nativo:9]".
     Release antiga, sem a marca: exige a própria versão (só serve via APK). */
  nativoDe(rel) {
    const m = /\[nativo:(\d+)\]/.exec(String(rel.body || ''));
    return m ? +m[1] : this.codigoDe(rel.tag_name);
  },

  /* Chamado logo que o app abre: avisa que este miolo abriu bem (senão a peça
     volta ao anterior em 10 s) e, alguns segundos depois, procura versão nova. */
  async iniciar() {
    const P = this.plugin();
    if (!P) return;
    try { await P.notifyAppReady(); } catch (e) {}
    setTimeout(() => this.conferir(false), 4000);
    if (window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('resume', () => this.conferir(false));
    }
  },

  async conferir(forcar) {
    const P = this.plugin();
    if (!P) return null;
    let visto = 0;
    try { visto = +localStorage.getItem(this.CHAVE_VISTO) || 0; } catch (e) {}
    if (!forcar && Date.now() - visto < this.INTERVALO) return null;

    let lista;
    try {
      const r = await fetch(this.API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) return null;
      lista = await r.json();
      localStorage.setItem(this.CHAVE_VISTO, String(Date.now()));
    } catch (e) { return null; }   // sem internet: tenta na próxima abertura

    const teste = this.recebeTeste();
    let nativo = 0;
    try { nativo = +(await window.Capacitor.Plugins.App.getInfo()).build || 0; } catch (e) {}

    // A mais nova que serve: liberada (ou de teste, se ligado), com miolo.zip,
    // e cuja parte nativa exigida este celular já tem.
    const rel = (lista || [])
      .filter(j => !j.draft && (teste || !j.prerelease))
      .map(j => ({ j, codigo: this.codigoDe(j.tag_name), zip: (j.assets || []).find(a => a.name === 'miolo.zip') }))
      .filter(x => x.zip && x.codigo > this.versao && this.nativoDe(x.j) <= nativo)
      .sort((a, b) => b.codigo - a.codigo)[0];
    if (!rel) return null;

    const nome = String(rel.codigo);
    try {
      // Já baixado antes (app fechado no meio)? Reaproveita.
      let pacote = null;
      try {
        const l = await P.list();
        const mesmo = (l.bundles || []).filter(b => b.version === nome);
        // Essa versão já falhou ao abrir neste celular: não insiste (espera a próxima).
        if (mesmo.some(b => b.status === 'error')) return null;
        pacote = mesmo.find(b => b.status === 'success' || b.status === 'pending') || null;
      } catch (e) {}
      if (!pacote) pacote = await P.download({ version: nome, url: rel.zip.browser_download_url });
      await P.next({ id: pacote.id });   // troca quando o app for para o fundo
      this.pronto = '1.' + nome;
      return this.pronto;
    } catch (e) {
      return null;                       // falhou o download: tenta de novo mais tarde
    }
  }
};
