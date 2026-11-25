/* miolo.js — atualização silenciosa do "miolo" do Prumo (telas, cores, regras).

   O app Android é feito de duas partes:
   · a parte NATIVA (alarme, microfone, widget, ícone): só muda instalando um APK novo;
   · o MIOLO (HTML/CSS/JS): este arquivo o troca sozinho, sem ninguém ver.

   Como funciona: ao abrir, pergunta ao GitHub qual é a última versão liberada.
   Se o miolo dela for mais novo e servir para a parte nativa deste celular, baixa
   o miolo.zip em segundo plano e deixa marcado para a próxima vez. A troca
   acontece quando o app vai para o fundo (ou fecha) — quem abre de novo já vê a
   versão nova. Se o miolo novo não abrir direito, a peça volta sozinha ao anterior.

   24/11/2026: a troca "ao ir para o fundo" se perdia quando o app era fechado
   (arrastado para fora) ou o Android o encerrava antes de terminar — baixava,
   mas abria sempre na versão velha. Agora, AO ABRIR, se já houver versão nova
   baixada esperando, a troca é feita na hora (aplicarPendente), e nos Ajustes
   há "Atualizar agora".
   Os dados (localStorage) não são tocados: continuam no mesmo lugar.

   Peça usada: @capgo/capacitor-updater em modo manual, sem a nuvem da Capgo
   (estatísticas desligadas no capacitor.config.json). */

const Miolo = {
  // Desde a 1.16: arquivo fixo no GitHub (raw), SEM o limite de 60 consultas/hora
  // da API — o limite estourado (erro 403) era o que travava a atualização.
  CANAIS: 'https://raw.githubusercontent.com/pimentel-code/prumo/main/canais.json',
  API: 'https://api.github.com/repos/pimentel-code/prumo/releases?per_page=15',   // reserva
  canais: null,
  CHAVE_TESTE: 'prumo.miolo.teste',     // "sim": recebe também as versões de teste
  CHAVE_VISTO: 'prumo.miolo.conferido',
  INTERVALO: 30 * 60 * 1000,            // pergunta ao GitHub no máximo a cada 30 min
  versao: typeof PRUMO_MIOLO !== 'undefined' ? PRUMO_MIOLO : 0,
  pronto: null,                         // versão já baixada esperando a troca
  CHAVE_DIARIO: 'prumo.miolo.diario',   // últimas etapas, para o Diagnóstico nos Ajustes
  CHAVE_FALHOU: 'prumo.miolo.falhou',   // { "1.13": quando falhou } — tenta de novo 1x por dia
  CHAVE_TROCA: 'prumo.miolo.troca',     // { nome, em } da última troca na hora — evita abrir e recarregar sem parar

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

  /* Lê { estavel, teste } do canais.json. Cada um: { codigo, nativo, apk, miolo, notas }.
     Se o arquivo falhar, monta o mesmo a partir da API (que tem limite). */
  async lerCanais() {
    try {
      const r = await fetch(this.CANAIS + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { const c = await r.json(); if (c && c.estavel) { this.canais = c; return c; } }
      this.anotar('canais.json respondeu ' + r.status + '; tentando a API do GitHub');
    } catch (e) { this.anotar('Sem conseguir ler o canais.json: ' + this.erroDe(e)); }
    try {
      const r = await fetch(this.API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) { this.anotar('GitHub respondeu ' + r.status + (r.status === 403 ? ' (limite de consultas da hora estourou)' : '')); return null; }
      const lista = await r.json();
      const virar = j => {
        const z = (j.assets || []).find(a => a.name === 'miolo.zip');
        const k = (j.assets || []).find(a => /\.apk$/i.test(a.name));
        return { codigo: this.codigoDe(j.tag_name), nativo: this.nativoDe(j), miolo: z && z.browser_download_url,
                 apk: k && k.browser_download_url, notas: String(j.body || '').replace(/\[nativo:\d+\]/g, '').trim().slice(0, 400) };
      };
      const ok = (lista || []).filter(j => !j.draft);
      const est = ok.filter(j => !j.prerelease).map(virar).sort((a, b) => b.codigo - a.codigo)[0];
      const tes = ok.map(virar).sort((a, b) => b.codigo - a.codigo)[0];
      this.canais = est ? { estavel: est, teste: tes } : null;
      return this.canais;
    } catch (e) { this.anotar('Sem conseguir falar com o GitHub: ' + this.erroDe(e)); return null; }
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
    if (await this.aplicarPendente()) return;      // trocou: o app recarrega na versão nova
    setTimeout(() => this.conferir(false), 4000);
    if (window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('resume', () => this.conferir(false));
    }
  },

  /* Versão mais nova que esta já baixada e esperando? Troca agora (o app recarrega).
     Devolve true se mandou trocar. */
  async aplicarPendente() {
    const P = this.plugin();
    if (!P || !P.set) return false;
    let pacote = null;
    try {
      const l = await P.list();
      pacote = (l.bundles || [])
        .filter(b => (b.status === 'success' || b.status === 'pending') && this.codigoDe(b.version) > this.versao)
        .sort((a, b) => this.codigoDe(b.version) - this.codigoDe(a.version))[0] || null;
    } catch (e) { return false; }
    if (!pacote) return false;
    // Trava: se já mandou trocar para esta mesma versão há menos de 5 min e continua
    // na velha, o pacote não está abrindo — não insiste (senão recarrega sem parar).
    let ultima = {};
    try { ultima = JSON.parse(localStorage.getItem(this.CHAVE_TROCA) || '{}'); } catch (e) {}
    if (ultima.nome === pacote.version && Date.now() - ultima.em < 5 * 60000) {
      this.anotar('A ' + pacote.version + ' já foi tentada agora há pouco e não entrou; espera a próxima abertura');
      return false;
    }
    try {
      localStorage.setItem(this.CHAVE_TROCA, JSON.stringify({ nome: pacote.version, em: Date.now() }));
      this.anotar('Trocando agora para a ' + pacote.version + ' (já estava baixada)');
      await P.set({ id: pacote.id });             // recarrega o app na versão nova
      return true;
    } catch (e) {
      this.anotar('Não conseguiu trocar para a ' + pacote.version + ': ' + this.erroDe(e));
      return false;
    }
  },

  /* ---------- site (iPhone e PC): sem a peça do Android ----------
     Ao abrir e ao voltar para o app, pergunta ao site qual é a versão publicada.
     Se for mais nova, pede ao sw.js para baixar tudo e recarrega na hora em que
     ninguém estiver no meio de uma anotação. Os dados (localStorage) não mudam. */
  _siteVisto: 0,
  _recarregarQuandoPuder: false,
  iniciarSite() {
    if (!('serviceWorker' in navigator)) return;
    // Pede ao navegador para não apagar os dados sozinho (o Safari apaga site parado há 7 dias).
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
    setTimeout(() => this.conferirSite(), 3000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (this._recarregarQuandoPuder && this.podeRecarregar()) return location.reload();
      this.conferirSite();
    });
  },
  podeRecarregar() {
    const campo = document.getElementById('campoEntrada');
    const painel = document.getElementById('painel');
    return !(typeof App !== 'undefined' && App.rascunho) && !(campo && campo.value.trim()) &&
           !(painel && painel.innerHTML.trim()) && !(typeof Tutorial !== 'undefined' && Tutorial.aberto) &&
           !(typeof EsferaHoje !== 'undefined' && EsferaHoje.ouvindo);
  },
  async conferirSite(forcar) {
    if (!forcar && Date.now() - this._siteVisto < 10 * 60000) return null;
    this._siteVisto = Date.now();
    let nova = 0;
    try {
      const r = await fetch('versao-miolo.js?fresco=' + Date.now(), { cache: 'no-store' });
      const m = /PRUMO_MIOLO\s*=\s*(\d+)/.exec(await r.text());
      nova = m ? +m[1] : 0;
    } catch (e) { return null; }                  // sem internet: fica como está
    if (nova <= this.versao) return null;
    const sw = navigator.serviceWorker && (await navigator.serviceWorker.ready.catch(() => null));
    if (!sw || !sw.active) return null;
    const ok = await new Promise(fim => {
      const canal = new MessageChannel();
      canal.port1.onmessage = e => fim(!!(e.data && e.data.ok));
      sw.active.postMessage({ tipo: 'atualizar' }, [canal.port2]);
      setTimeout(() => fim(false), 30000);
    });
    if (!ok) { this.anotar('Site: não conseguiu baixar a 1.' + nova); return null; }
    this.anotar('Site: 1.' + nova + ' baixada');
    if (this.podeRecarregar()) location.reload();
    else this._recarregarQuandoPuder = true;      // recarrega quando sair e voltar ao app
    return '1.' + nova;
  },

  async conferir(forcar) {
    const P = this.plugin();
    if (!P) return null;
    let visto = 0;
    try { visto = +localStorage.getItem(this.CHAVE_VISTO) || 0; } catch (e) {}
    if (!forcar && Date.now() - visto < this.INTERVALO) return null;

    const c = await this.lerCanais();
    if (!c) return null;
    try { localStorage.setItem(this.CHAVE_VISTO, String(Date.now())); } catch (e) {}

    const teste = this.recebeTeste();
    let nativo = 0;
    try { nativo = +(await window.Capacitor.Plugins.App.getInfo()).build || 0; } catch (e) {}

    // A mais nova que serve: a estável (ou a de teste, se ligado), com miolo,
    // e cuja parte nativa exigida este celular já tem.
    const rel = [c.estavel, teste ? c.teste : null]
      .filter(x => x && x.miolo && x.sha256 && x.codigo > this.versao && x.nativo <= nativo)
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
        // checksum (SHA-256 do zip) é OBRIGATÓRIO na peça: sem ele, "Failed to download"
        pacote = await P.download({ version: nome, url: rel.miolo, checksum: rel.sha256 });
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
