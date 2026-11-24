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
  CHAVE_DIARIO: 'prumo.miolo.diario',   // últimas etapas, para o Diagnóstico nos Ajustes
  CHAVE_FALHOU: 'prumo.miolo.falhou',   // { "1.13": quando falhou } — tenta de novo 1x por dia

  /* Anota uma etapa no diário (as 15 últimas). Aparece em Ajustes → Diagnóstico. */
  anotar(texto) {
    try {
      const d = JSON.parse(localStorage.getItem(this.CHAVE_DIARIO) || '[]');
      d.unshift({ em: new Date().toISOString(), texto: String(texto).slice(0, 300) });
      localStorage.setItem(this.CHAVE_DIARIO, JSON.stringify(d.slice(0, 15)));
    } catch (e) {}
  },
  diario() { try { return JSON.parse(localStorage.getItem(this.CHAVE_DIARIO) || '[]'); } catch (e) { return []; } },
  erroDe(e) { return (e && (e.message || e.errorMessage || e.code)) || String(e); },

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
    if (!P) { this.anotar('Peça de atualização ausente neste app (APK anterior à 1.9?)'); return; }
    try {
      const r = await P.notifyAppReady();
      const b = r && r.bundle;
      this.anotar('Abriu bem: miolo 1.' + this.versao + (b ? ' (pacote ' + (b.id === 'builtin' ? 'de fábrica' : b.version) + ')' : ''));
    } catch (e) { this.anotar('Erro ao avisar que abriu: ' + this.erroDe(e)); }
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
      if (!r.ok) { this.anotar('GitHub respondeu ' + r.status + ' ao perguntar as versões'); return null; }
      lista = await r.json();
      localStorage.setItem(this.CHAVE_VISTO, String(Date.now()));
    } catch (e) { this.anotar('Sem conseguir falar com o GitHub: ' + this.erroDe(e)); return null; }

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
    if (!rel) { this.anotar('Nada mais novo que a 1.' + this.versao + ' para este celular (parte nativa ' + nativo + ', teste ' + (teste ? 'ligado' : 'desligado') + ')'); return null; }

    const nome = '1.' + rel.codigo;
    let falhas = {};
    try { falhas = JSON.parse(localStorage.getItem(this.CHAVE_FALHOU) || '{}'); } catch (e) {}
    if (!forcar && falhas[nome] && Date.now() - falhas[nome] < 24 * 3600 * 1000) {
      this.anotar('A ' + nome + ' falhou há menos de um dia; tenta de novo amanhã'); return null;
    }
    try {
      // Já baixado antes (app fechado no meio)? Reaproveita.
      let pacote = null;
      try {
        const l = await P.list();
        pacote = (l.bundles || []).find(b => b.version === nome && (b.status === 'success' || b.status === 'pending')) || null;
      } catch (e) {}
      if (!pacote) {
        this.anotar('Baixando a ' + nome + '…');
        pacote = await P.download({ version: nome, url: rel.zip.browser_download_url });
        this.anotar('Baixou a ' + nome + ' (' + (pacote && pacote.status) + ')');
      }
      await P.next({ id: pacote.id });   // troca quando o app for para o fundo
      this.anotar('A ' + nome + ' entra quando o app for para o fundo');
      this.pronto = nome;
      return this.pronto;
    } catch (e) {
      this.anotar('Falhou com a ' + nome + ': ' + this.erroDe(e));
      falhas[nome] = Date.now();
      try { localStorage.setItem(this.CHAVE_FALHOU, JSON.stringify(falhas)); } catch (er) {}
      return null;
    }
  }
};
