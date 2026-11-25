/* esfera.js — a "assistente" que recebe você ao abrir o Prumo.
   Um cartão escuro com uma esfera de partículas viva; ela pulsa com a sua voz.
   Você fala (ou escreve), ela mostra o que entendeu, e um toque guarda.
   Por dentro é o mesmo interpretador de sempre: sem internet, sem IA, sem conta.

   Desde a 1.13 a esfera mora na tela Hoje (EsferaHoje, no fim deste arquivo):
   fica viva o tempo todo e reage à voz quando você toca nela ou no 🎤.
   A janela (Esfera.abrir) só aparece se a esfera da tela Hoje estiver desligada
   em Ajustes e você tocar no 🎤. */

const Esfera = {
  CHAVE: 'prumo.esfera.aoAbrir',
  aberta: false,
  ouvindo: false,
  nivel: 0,          // volume da voz agora (0 a 1), puxa o tamanho da esfera
  nivelSuave: 0,
  quadro: null,
  inicio: 0,
  pontos: null,
  textoEntendido: '',

  ligada() {
    try { return localStorage.getItem(this.CHAVE) !== 'nao'; } catch (e) { return true; }
  },
  ligar(sim) {
    try { localStorage.setItem(this.CHAVE, sim ? 'sim' : 'nao'); } catch (e) {}
  },

  /* Há microfone? No app Android sempre; no site, só se o navegador reconhece voz. */
  temVoz() {
    if (typeof Avisos !== 'undefined' && Avisos.nativo) return true;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  abrir(opcoes) {
    opcoes = opcoes || {};
    if (this.aberta) { if (opcoes.ouvir) this.ouvir(); return; }
    if (typeof Tutorial !== 'undefined' && Tutorial.aberto) return;
    this.aberta = true;
    const MIC = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
    const X = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>';
    const SETA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>';
    const voz = this.temVoz();
    const div = document.createElement('div');
    div.id = 'esfera';
    div.className = 'esfera-fundo';
    div.innerHTML = `<div class="esfera-cartao" role="dialog" aria-label="Diga o que precisa">
        <canvas class="esfera-tela" aria-hidden="true"></canvas>
        <div class="esfera-texto" id="esferaTexto">${voz ? 'Oi! Toque no microfone e<br>me diga o que precisa' : 'Oi! Me diga o que precisa'}</div>
        <div class="esfera-ouvido" id="esferaOuvido" hidden></div>
        <div class="esfera-acoes" id="esferaAcoes" hidden>
          <button type="button" class="esfera-bt-texto" data-esfera="corrigir">Corrigir</button>
          <button type="button" class="esfera-bt-texto principal" data-esfera="guardar">Guardar</button>
        </div>
        <form class="esfera-escrever" id="esferaForm" autocomplete="off">
          <input id="esferaCampo" type="text" enterkeyhint="done" autocapitalize="sentences" placeholder="ou escreva aqui…">
          <button type="submit" aria-label="Anotar">${SETA}</button>
        </form>
        <div class="esfera-botoes">
          ${voz ? `<button type="button" class="esfera-bt mic" data-esfera="mic" aria-label="Falar">${MIC}</button>` : ''}
          <button type="button" class="esfera-bt fechar" data-esfera="fechar" aria-label="Fechar">${X}</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    document.body.classList.add('com-esfera');

    div.addEventListener('click', e => {
      const b = e.target.closest('[data-esfera]');
      if (!b) { if (e.target === div) this.fechar(); return; }
      const a = b.dataset.esfera;
      if (a === 'fechar') this.fechar();
      else if (a === 'mic') this.ouvindo ? this.pararOuvir() : this.ouvir();
      else if (a === 'guardar') this.guardar();
      else if (a === 'corrigir') this.corrigir();
    });
    div.querySelector('#esferaForm').addEventListener('submit', e => {
      e.preventDefault();
      const c = document.getElementById('esferaCampo');
      const t = c.value.trim();
      if (!t) return;
      c.value = ''; c.blur();
      this.entendeu(t);
    });

    this.prepararTela(div.querySelector('canvas'));
    if (opcoes.ouvir && voz) setTimeout(() => this.ouvir(), 250);
  },

  fechar() {
    if (!this.aberta) return;
    this.pararOuvir();
    this.aberta = false;
    if (this.quadro) cancelAnimationFrame(this.quadro);
    this.quadro = null;
    const d = document.getElementById('esfera');
    if (d) d.remove();
    document.body.classList.remove('com-esfera');
    // ✕ = desistir: o que foi entendido e não guardado é descartado.
    if (App.rascunho) {
      App.rascunho = null; renderConfirma();
      const c = document.getElementById('campoEntrada'); if (c) c.value = '';
    }
  },

  status(html) {
    const t = document.getElementById('esferaTexto');
    if (t) t.innerHTML = html;
  },

  marcarMic(sim) {
    const b = document.querySelector('#esfera [data-esfera="mic"]');
    if (b) b.classList.toggle('ligado', sim);
  },

  /* ---------- ouvir ---------- */

  async ouvir() {
    if (this.ouvindo || !this.aberta) return;
    this.ouvindo = true;
    this.marcarMic(true);
    this.esconderResultado();
    this.status('Pode falar…');
    const ouvido = document.getElementById('esferaOuvido');
    const parcial = t => { if (ouvido && t) { ouvido.hidden = false; ouvido.textContent = '“' + t + '”'; } };
    const volume = n => { this.nivel = n; };
    try {
      let texto = '';
      if (typeof Avisos !== 'undefined' && Avisos.nativo) texto = await Avisos.escutar(volume, parcial);
      else texto = await this.ouvirNavegador(volume, parcial);
      if (!this.aberta) return;
      this.ouvindo = false; this.marcarMic(false); this.nivel = 0;
      if (texto) this.entendeu(texto);
      else { if (ouvido) ouvido.hidden = true; this.status('Não ouvi nada.<br>Toque no microfone e tente de novo.'); }
    } catch (e) {
      this.ouvindo = false; this.marcarMic(false); this.nivel = 0;
      if (!this.aberta) return;
      this.status(esc((e && e.message) || 'Não consegui ouvir.') + '<br>Você pode escrever aqui embaixo.');
    }
  },

  pararOuvir() {
    if (!this.ouvindo) return;
    this.ouvindo = false; this.marcarMic(false); this.nivel = 0;
    if (typeof Avisos !== 'undefined' && Avisos.nativo) Avisos.pararEscuta();
    else if (this.rec) { try { this.rec.stop(); } catch (e) {} }
  },

  /* Site (iPhone/PC): reconhecimento de voz do próprio navegador, quando existe.
     O navegador não diz o volume, então a esfera "respira" enquanto ouve. */
  ouvirNavegador(volume, parcial) {
    return new Promise((ok, falha) => {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) return falha(new Error('Este navegador não reconhece voz.'));
      const rec = new R();
      this.rec = rec;
      rec.lang = 'pt-BR'; rec.interimResults = true; rec.maxAlternatives = 1;
      let final = '';
      const respira = setInterval(() => volume(.35 + .35 * Math.abs(Math.sin(Date.now() / 260))), 80);
      rec.onresult = ev => {
        let t = '';
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        parcial(t);
        if (ev.results[ev.results.length - 1].isFinal) final = t;
      };
      rec.onerror = ev => {
        clearInterval(respira);
        if (ev.error === 'no-speech' || ev.error === 'aborted') ok('');
        else falha(new Error(ev.error === 'not-allowed' ? 'O navegador não deixou usar o microfone.' : 'Não consegui ouvir.'));
      };
      rec.onend = () => { clearInterval(respira); this.rec = null; ok(final.trim()); };
      rec.start();
    });
  },

  /* ---------- o que foi entendido ---------- */

  entendeu(texto) {
    const campo = document.getElementById('campoEntrada');
    campo.value = texto;
    aoEnviar({ preventDefault() {} });      // monta a confirmação de sempre, por trás
    const r = App.rascunho;
    if (!r) return;
    const ouvido = document.getElementById('esferaOuvido');
    ouvido.hidden = false;
    ouvido.textContent = '“' + texto + '”';
    this.status(this.resumo(r));
    document.getElementById('esferaAcoes').hidden = false;
    document.getElementById('esferaForm').hidden = true;
  },

  esconderResultado() {
    const a = document.getElementById('esferaAcoes');
    const f = document.getElementById('esferaForm');
    if (a) a.hidden = true;
    if (f) f.hidden = false;
    if (App.rascunho) { App.rascunho = null; renderConfirma(); }
  },

  resumo(r) {
    const EMO = { gasto: '💸', receita: '💰', compromisso: '📅', tarefa: '✅', nota: '📝' };
    let s = `<span class="esfera-tipo" data-tipo="${r.tipo}">${EMO[r.tipo] || ''} ${TIPOS[r.tipo] ? TIPOS[r.tipo].nome : ''}</span><br>`;
    s += '<strong>' + esc(r.titulo || '') + '</strong>';
    const partes = [];
    if (r.valor) partes.push(fmtMoeda(r.valor) + (r.parcelas >= 2 ? ' em ' + r.parcelas + 'x' : ''));
    if (r.todoDia) partes.push('todo dia ' + r.todoDia);
    if (r.data && r.tipo !== 'nota') partes.push(fmtDataCurta(r.data));
    if (r.hora) partes.push(r.hora + (r.alarme ? ' ⏰' : ''));
    if (partes.length) s += '<br><span class="esfera-detalhe">' + esc(partes.join(' · ')) + '</span>';
    return s;
  },

  guardar() {
    salvarRascunho();
    if (App.rascunho) return this.corrigir();   // faltou algo (ex.: valor): mostra os campos
    this.fechar();
  },

  corrigir() {
    // A confirmação completa já está montada atrás: basta fechar a esfera.
    this.pararOuvir();
    this.aberta = false;
    if (this.quadro) cancelAnimationFrame(this.quadro);
    this.quadro = null;
    const d = document.getElementById('esfera');
    if (d) d.remove();
    document.body.classList.remove('com-esfera');
    window.scrollTo(0, 0);
  },

  /* ---------- a esfera de partículas ---------- */

  prepararTela(canvas, ativo) {
    if (!canvas || !canvas.getContext || canvas._rodando) return;
    ativo = ativo || (() => this.aberta);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const N = 3200;
    if (!this.pontos) {
      // Pontos espalhados por igual na superfície (espiral de Fibonacci).
      const p = [];
      const ouro = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const t = ouro * i;
        p.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, fase: Math.random() * 6.283, solto: Math.random() < .12 ? 1 + Math.random() * .35 : 1 });
      }
      this.pontos = p;
    }
    const calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Azul → roxo → rosa → laranja, como na imagem.
    const CORES = [[77, 124, 255], [139, 92, 246], [236, 72, 153], [251, 146, 60]];
    const cor = t => {
      t = Math.max(0, Math.min(.999, t)) * (CORES.length - 1);
      const i = Math.floor(t), f = t - i, a = CORES[i], b = CORES[i + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    };
    if (!this.inicio) this.inicio = performance.now();
    canvas._rodando = true;
    let conta = 0;
    // Fora da tela (rolou para baixo) não desenha: poupa bateria.
    if (window.IntersectionObserver && !canvas._olho) {
      canvas._olho = new IntersectionObserver(e => { canvas._fora = !e[0].isIntersecting; });
      canvas._olho.observe(canvas);
    }

    const desenhar = agora => {
      if (!ativo()) { canvas._rodando = false; return; }
      const id = requestAnimationFrame(desenhar);
      if (canvas === document.querySelector('#esfera canvas')) this.quadro = id;
      if (document.hidden || canvas._fora) return;
      // Parada, sem voz: 30 quadros por segundo bastam (metade da bateria).
      if (this.nivel < .02 && this.nivelSuave < .02 && (conta++ % 2)) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const L = canvas.clientWidth, A = canvas.clientHeight;
      if (canvas.width !== Math.round(L * dpr)) { canvas.width = Math.round(L * dpr); canvas.height = Math.round(A * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, L, A);
      ctx.globalCompositeOperation = 'lighter';

      const t = (agora - this.inicio) / 1000 * (calmo ? .3 : 1);
      this.nivelSuave += (this.nivel - this.nivelSuave) * .18;
      const voz = this.nivelSuave;
      const R = Math.min(L, A) * .36 * (1 + voz * .16 + Math.sin(t * 1.3) * .015);
      const cx = L / 2, cy = A / 2;
      const giroY = t * .25, giroX = Math.sin(t * .2) * .35 + .3;
      const sy = Math.sin(giroY), cyy = Math.cos(giroY), sx = Math.sin(giroX), cxx = Math.cos(giroX);
      const amp = .07 + voz * .22;

      const halo = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 1.25);
      halo.addColorStop(0, `rgba(139, 92, 246, ${(.10 + voz * .12).toFixed(3)})`);
      halo.addColorStop(.6, `rgba(236, 72, 153, ${(.05 + voz * .08).toFixed(3)})`);
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, L, A);

      for (const p of this.pontos) {
        // Onda que corre pela superfície: dá o aspecto "vivo", mais forte com a voz.
        const onda = 1 + amp * Math.sin(p.x * 3.1 + t * 1.7 + p.fase * .3) * Math.cos(p.y * 2.7 - t * 1.2)
                       + (p.solto - 1) * (1 + voz * 1.5);
        let x = p.x * onda, y = p.y * onda, z = p.z * onda;
        let x2 = x * cyy + z * sy, z2 = -x * sy + z * cyy;       // gira no eixo Y
        let y2 = y * cxx - z2 * sx, z3 = y * sx + z2 * cxx;       // inclina no eixo X
        const persp = 2.6 / (2.6 + z3);
        const px = cx + x2 * R * persp, py = cy + y2 * R * persp;
        const frente = (1 - z3) / 2;                               // 1 = de frente, 0 = atrás
        const c = cor(.5 + (p.y * .55 - p.x * .3) * .9 + Math.sin(t * .4) * .08);
        const alfa = .22 + frente * .7 + voz * .1;
        const tam = (.9 + frente * 1.3) * (p.solto > 1 ? .8 : 1);
        ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alfa.toFixed(3)})`;
        ctx.fillRect(px, py, tam, tam);
      }
      ctx.globalCompositeOperation = 'source-over';
    };
    requestAnimationFrame(desenhar);
  }
};

/* ---------- a esfera fixa na tela Hoje ---------- */

const EsferaHoje = {
  visivel: false,
  ouvindo: false,
  PADRAO: 'Toque na esfera ou no microfone<br>e me diga o que precisa',
  PADRAO_SEM_VOZ: 'Toque na esfera e escreva o que precisa<br><small>ou use o 🎤 do teclado para ditar</small>',
  padrao() { return Esfera.temVoz() ? this.PADRAO : this.PADRAO_SEM_VOZ; },
  /* Sem voz (ou o navegador recusou): o teclado abre na caixa lá em cima — no iPhone
     ele tem o 🎤 de ditado. */
  escrever() {
    const campo = document.getElementById('campoEntrada');
    if (campo) { window.scrollTo({ top: 0, behavior: 'smooth' }); campo.focus(); }
  },

  el() { return typeof document !== 'undefined' && document.getElementById ? document.getElementById('esferaHoje') : null; },

  /* Chamado a cada render(): mostra na aba Hoje (sem busca) se estiver ligada. */
  atualizar() {
    const el = this.el();
    if (!el || !el.querySelector || !el.querySelector('canvas')) return;
    const sim = Esfera.ligada() && App.busca === null && App.aba === 'hoje';
    el.hidden = !sim;
    if (document.body && document.body.classList) document.body.classList.toggle('com-esfera-hoje', sim);
    if (!el.dataset.pronto) {
      el.dataset.pronto = '1';
      el.querySelector('canvas').addEventListener('click', () => this.ouvindo ? this.parar() : this.ouvir());
      this.status(this.padrao());
    }
    this.visivel = sim;
    if (sim) Esfera.prepararTela(el.querySelector('canvas'), () => this.visivel);
    else if (this.ouvindo) this.parar();
  },

  status(html) {
    const t = document.getElementById('esferaHojeTexto');
    if (t) t.innerHTML = html;
  },

  marcar(sim) {
    const el = this.el();
    if (el) el.classList.toggle('ouvindo', sim);
    const b = document.getElementById('btVoz');
    if (b) b.classList.toggle('ligado', sim);
  },

  async ouvir() {
    if (this.ouvindo) return;
    if (!Esfera.temVoz()) return this.escrever();
    if (!this.visivel) { App.aba = 'hoje'; App.busca = null; if (typeof fecharPainel === 'function') fecharPainel(); render(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (App.rascunho) { App.rascunho = null; renderConfirma(); }
    this.ouvindo = true; this.marcar(true);
    this.status('Pode falar…');
    const parcial = t => { if (t) this.status('“' + esc(t) + '”'); };
    const volume = n => { Esfera.nivel = n; };
    let texto = '';
    try {
      if (typeof Avisos !== 'undefined' && Avisos.nativo) texto = await Avisos.escutar(volume, parcial);
      else texto = await Esfera.ouvirNavegador(volume, parcial);
    } catch (e) {
      this.fim();
      this.status(esc((e && e.message) || 'Não consegui ouvir.') + '<br>Você pode escrever na caixa lá em cima.');
      this.escrever();
      return;
    }
    this.fim();
    if (!texto) { this.status('Não ouvi nada.<br>Toque na esfera e tente de novo.'); return; }
    this.status('“' + esc(texto) + '”');
    const campo = document.getElementById('campoEntrada');
    campo.value = texto;
    aoEnviar({ preventDefault() {} });     // a confirmação "Entendi assim" de sempre
    setTimeout(() => { if (!this.ouvindo) this.status(this.padrao()); }, 6000);
  },

  fim() { this.ouvindo = false; this.marcar(false); Esfera.nivel = 0; },

  parar() {
    if (!this.ouvindo) return;
    if (typeof Avisos !== 'undefined' && Avisos.nativo) Avisos.pararEscuta();
    else if (Esfera.rec) { try { Esfera.rec.stop(); } catch (e) {} }
  }
};
