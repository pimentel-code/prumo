/* tutorial.js — a apresentação que aparece na primeira vez que o Prumo abre
   (e no botão "?" lá em cima). Telas que passam com o dedo ou com os botões.

   NOVIDADES: cada tela nova leva "nova: N" (N = número da versão em que entrou).
   Quem já tinha visto a apresentação recebe, uma vez, só as telas novas
   ("Novidades do Prumo"). Ao acrescentar uma função, ponha a tela aqui com o
   número da versão — o aviso de novidades sai sozinho. */

const Tutorial = {
  CHAVE: 'prumo.tutorial.visto',
  CHAVE_NOVIDADES: 'prumo.tutorial.novidades',   // maior "nova" que este aparelho já viu
  BASE_NOVIDADES: 19,                             // quem viu o tutorial antes disso não conhecia as telas > 19
  modoNovidades: false,
  aberto: false,
  atual: 0,
  total: 0,
  relogio: null,
  indoAte: 0,

  precisa() {
    try { return !localStorage.getItem(this.CHAVE); } catch (e) { return false; }
  },

  marcarVisto() {
    try {
      localStorage.setItem(this.CHAVE, new Date().toISOString());
      localStorage.setItem(this.CHAVE_NOVIDADES, String(this.maiorNova()));
    } catch (e) {}
  },

  maiorNova() { return Math.max(0, ...this.telasTodas().map(t => t.nova || 0)); },
  novidadesVistas() {
    try { const v = localStorage.getItem(this.CHAVE_NOVIDADES); return v === null ? this.BASE_NOVIDADES : +v || 0; }
    catch (e) { return 999; }
  },
  /* Telas que este aparelho ainda não viu (só para quem já viu a apresentação). */
  novidades() {
    if (this.precisa()) return [];
    const vistas = this.novidadesVistas();
    return this.telasTodas().filter(t => (t.nova || 0) > vistas);
  },

  telas() {
    if (!this.modoNovidades) return this.telasTodas();
    const n = this.novidades();
    return [{
      id: 'capa-novidades',
      arte: `<div class="tut-logo tut-logo-novo"><span>✨</span></div>`,
      titulo: 'Novidades do Prumo',
      texto: n.length === 1 ? 'Tem <strong>uma coisa nova</strong>. Passe para ver como funciona.'
                            : 'Tem <strong>' + n.length + ' coisas novas</strong>. Passe para ver como funcionam.'
    }].concat(n);
  },

  telasTodas() {
    const nativo = typeof Avisos !== 'undefined' && Avisos.nativo;
    const voz = typeof Esfera !== 'undefined' && Esfera.temVoz && Esfera.temVoz();
    const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 3.5h9M12 3.5v6"/><path d="M12 9.5l3.4 3.6L12 21l-3.4-7.9z" fill="#fff"/></svg>';
    const MIC = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
    const SETA = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>';

    const linha = (tipo, selo, frase, resultado, rotulo, atraso) =>
      `<div class="tut-linha" data-tipo="${tipo}" style="animation-delay:${atraso}ms">
         <div class="selo">${selo}</div>
         <div class="frase">“${frase}”<em>${resultado}</em></div>
         <span class="rotulo-tipo">${rotulo}</span>
       </div>`;

    const aba = (nome, titulo, texto) =>
      `<div class="tut-aba"><div class="aba-icone">${svg(nome)}</div><strong>${titulo}</strong><span>${texto}</span></div>`;

    return [
      {
        arte: `<div class="tut-logo">${LOGO}</div>`,
        titulo: 'Bem-vindo ao Prumo',
        texto: 'Seu caderninho de <strong>gastos, compromissos e tarefas</strong>. Você escreve do jeito que fala e o Prumo organiza tudo sozinho.'
      },
      {
        id: 'esfera', nova: 21,
        // Só a esfera e uma frase (pedido dele, 24/11/2026).
        arte: `<div class="tut-esfera"><canvas aria-hidden="true"></canvas></div>`,
        titulo: voz ? 'Toque na esfera e fale o que deseja' : 'Toque na esfera e escreva o que deseja',
        texto: ''
      },
      {
        id: 'digitar',
        arte: `<div class="tut-cartao"><div class="entrada">
                 <div class="tut-digitando" id="tutDigitando"></div>
                 ${nativo ? `<button type="button" class="voz" tabindex="-1" aria-hidden="true">${MIC}</button>` : ''}
                 <button type="button" class="enviar" tabindex="-1" aria-hidden="true">${SETA}</button>
               </div></div>`,
        titulo: 'É só escrever ou falar',
        texto: nativo
          ? 'Toque na caixa lá em cima e escreva uma frase solta. Ou toque no <strong>🎤 microfone</strong> e fale. Depois toque na <strong>seta</strong> para anotar.'
          : 'Toque na caixa lá em cima e escreva uma frase solta, ou use o <strong>microfone do teclado</strong> para ditar. Depois toque na <strong>seta</strong>.'
      },
      {
        arte: `<div class="tut-entende">
                 ${linha('gasto', '🍽️', 'paguei 45 no almoço', 'R$ 45,00 · Alimentação', 'Saiu', 100)}
                 ${linha('receita', '💰', 'recebi 300 de serviço', 'R$ 300,00 · Honorários', 'Entrou', 350)}
                 ${linha('compromisso', SELO_TIPO.compromisso, 'dentista quinta 15h', 'quinta-feira às 15:00', 'Agenda', 600)}
                 ${linha('tarefa', SELO_TIPO.tarefa, 'lembrar de pagar a luz', 'vai para a lista de tarefas', 'Tarefa', 850)}
               </div>`,
        titulo: 'Ele entende sozinho',
        texto: 'Antes de guardar, o Prumo mostra <strong>o que entendeu</strong>. Se errar, toque no tipo certo. Corrigiu a categoria? Ele aprende para a próxima vez.'
      },
      {
        arte: `<div class="tut-entende">
                 ${linha('gasto', '📺', 'comprei a TV 1.200 em 10x', '10 × R$ 120,00, uma por mês', 'Parcelas', 100)}
                 ${linha('gasto', '🏠', 'aluguel 900 todo dia 5', 'volta todo mês até você pagar', 'Todo mês', 350)}
                 <div class="tut-saldo" style="animation-delay:600ms"><span>Sobrou no mês</span><b>R$ 2.934,10</b>
                   <small>Ainda vai sair <b>R$ 1.020,00</b> · No fim do mês <b>R$ 1.914,10</b></small></div>
               </div>`,
        titulo: 'Parcelas e contas fixas',
        texto: 'Diga <strong>em quantas vezes</strong> e o Prumo lança uma parcela em cada mês. Conta que repete? Diga <strong>“todo dia 5”</strong>: ela volta todo mês até você tocar em <strong>Paguei</strong>. Assim você vê o que ainda vai sair.'
      },
      {
        arte: `<div class="tut-abas">
                 ${aba('hoje', 'Hoje', 'a esfera: toque e fale')}
                 ${aba('dinheiro', 'Dinheiro', 'quanto entrou, saiu e sobrou no mês')}
                 ${aba('agenda', 'Agenda', 'seus compromissos, dia a dia')}
                 ${aba('tarefas', 'Tarefas', 'o que falta, o que atrasou e anotações')}
               </div>`,
        titulo: 'Cada coisa no seu lugar',
        texto: 'As abas lá embaixo separam tudo. <strong>Toque em qualquer item</strong> para editar ou apagar, e na <strong>bolinha</strong> para marcar uma tarefa como feita.'
      },
      {
        arte: `<div class="tut-revisao">
                 <div class="revisao-banner"><span class="revisao-banner-icone">🧹</span>
                   <span class="revisao-banner-texto"><strong>2 coisas ficaram para trás</strong><span>Arrume em 20 segundos</span></span>
                   <span class="revisao-banner-seta">›</span></div>
                 <div class="tut-rev-botoes">
                   <span class="rev rev-feito"><b>✓</b>Já fiz</span><span class="rev"><b>→</b>Amanhã</span>
                   <span class="rev"><b>📅</b>Semana que vem</span><span class="rev rev-apagar"><b>🗑</b>Apagar</span>
                 </div>
               </div>`,
        titulo: 'Nada fica acumulado',
        texto: 'Se algo passou da data, aparece uma faixa no alto da aba <strong>Tarefas</strong>. Toque nela e resolva <strong>uma coisa de cada vez</strong>: já fiz, amanhã, semana que vem ou apagar.' +
               (nativo ? ' Aos <strong>domingos à noite</strong> o Prumo lembra você.' : '')
      },
      nativo ? {
        arte: `<div class="tut-aviso" data-tipo="compromisso"><div class="selo"><span class="tut-sino">🔔</span></div>
                 <div><strong>Dentista</strong><span>Hoje às 15:00</span></div><small>agora</small></div>
               <div class="tut-aviso" data-tipo="tarefa"><div class="selo">⏰</div>
                 <div><strong>Alarme · 06:00</strong><span>Toca até você parar</span></div><small>amanhã</small></div>`,
        titulo: 'Avisos na hora certa',
        texto: 'O Prumo <strong>avisa sozinho</strong>, mesmo com o celular bloqueado, e dá para responder no próprio aviso: <strong>Feito</strong>, <strong>Amanhã</strong> ou <strong>Paguei</strong>. Para despertar, escreva <strong>“me acorda às 6h”</strong> — ou, para todo dia útil, <strong>“alarme 4h45 de segunda a sexta”</strong>.'
      } : {
        arte: `<div class="tut-aviso" data-tipo="compromisso"><div class="selo"><span class="tut-sino">🔔</span></div>
                 <div><strong>Dentista</strong><span>Hoje às 15:00 · Calendário</span></div><small>agora</small></div>
               <button type="button" class="mini" tabindex="-1">Pôr no calendário</button>`,
        titulo: 'Avisos na hora certa',
        texto: 'Depois de anotar um compromisso, toque em <strong>“Pôr no calendário”</strong>: o calendário do celular avisa você na hora.'
      },
      {
        id: 'repete', nova: 20,
        arte: `<div class="tut-repete">
                 <div class="tut-repete-frase">“me lembre de beber água <b>a cada 20 minutos</b>”</div>
                 <div class="tut-repete-lista" id="tutRepete"></div>
               </div>`,
        titulo: 'Lembretes que repetem',
        texto: 'Diga <strong>“a cada 20 minutos”</strong>, <strong>“de meia em meia hora”</strong> ou <strong>“de hora em hora”</strong> e o Prumo ' +
               (nativo ? 'manda uma notificação a cada vez. Toque em <strong>Parar</strong> ou <strong>Feito</strong> no próprio aviso.'
                       : 'põe um aviso para cada vez no calendário do celular.') +
               ' Vale por <strong>3 horas</strong>, ou diga até quando: <strong>“até as 18h”</strong>, <strong>“por 2 horas”</strong>, <strong>“o dia todo”</strong>.' +
               (nativo ? ' Quer som de despertador? Diga <strong>“alarme a cada 30 minutos”</strong>.' : '')
      },
      {
        id: 'natural', nova: 27,
        arte: `<div class="tut-repete">
                 <div class="tut-repete-frase">“preciso estar <b>às duas da tarde</b> no médico”</div>
                 <div class="tut-aviso" data-tipo="compromisso"><div class="selo"><span class="tut-sino">🔔</span></div>
                   <div><strong>Médico</strong><span>Hoje às 14:00</span></div><small>13:00 · 13:30</small></div>
               </div>`,
        titulo: 'Fale do seu jeito',
        texto: 'Não precisa falar como robô. <strong>“Amanhã tenho dentista às 10 e meia”</strong>, <strong>“hoje à noite ligar pro João”</strong>, <strong>“fui no mercado e deu 230”</strong>: o Prumo entende. ' +
               (nativo ? 'Compromisso com hora avisa <strong>1 hora antes e de novo 30 minutos antes</strong> (dá para mudar em ⚙ Ajustes). Quer outro tempo só naquele? Diga <strong>“me avisa 15 minutos antes”</strong>.'
                       : 'No calendário do celular, o compromisso já vai com aviso <strong>1 hora antes e 30 minutos antes</strong>.')
      },
      nativo ? {
        arte: `<div class="tut-widget">
                 <div class="tut-widget-textos"><strong>Gasto hoje: R$ 45,00</strong><span>📅 Dentista · hoje 15:00</span></div>
                 <span class="tut-widget-bt claro"><b>🎤</b>Falar</span><span class="tut-widget-bt"><b>✍️</b>Anotar</span>
               </div>
               <div class="tut-atalhos"><span>🎤 Falar</span><span>✍️ Anotar</span></div>`,
        titulo: 'Anote sem abrir o app',
        texto: 'Ponha o <strong>widget</strong>: segure o dedo num espaço vazio da tela do celular → <strong>Widgets</strong> → Prumo. Ou segure o dedo no <strong>ícone do Prumo</strong> para Falar ou Anotar direto.'
      } : null,
      {
        id: 'atualiza', nova: 22,
        arte: `<div class="tut-atualiza">
                 <div class="tut-atualiza-versoes"><span class="velha">1.21</span><span class="seta">→</span><span class="nova">1.22</span></div>
                 <div class="tut-atualiza-barra"><i></i></div>
                 <small>baixando em segundo plano… pronto ✓</small>
               </div>`,
        titulo: 'Sempre atualizado',
        texto: nativo
          ? 'O Prumo <strong>se atualiza sozinho</strong>: baixa a versão nova sem você perceber e, na próxima vez que abrir, já entra nela. Seus dados ficam. Com pressa? <strong>⚙ Ajustes → Atualizar agora</strong>.'
          : 'O Prumo <strong>se atualiza sozinho</strong> quando o celular tem internet: ao abrir (ou voltar para ele), já entra na versão nova. Seus dados ficam.'
      },
      {
        arte: `<div class="tut-cofre">🔒</div>`,
        titulo: 'Seus dados ficam com você',
        texto: 'Nada vai para a internet: tudo fica <strong>só neste celular</strong>. Faça backup de vez em quando em <strong>⚙ Ajustes</strong>. Para rever esta apresentação, toque no <strong>?</strong> lá em cima.'
      }
    ].filter(Boolean);
  },

  abrir(opcoes) {
    if (this.aberto) return;
    this.modoNovidades = !!(opcoes && opcoes.novidades) && this.novidades().length > 0;
    const telas = this.telas();
    this.ids = telas.map(t => t.id || '');
    // Selo "Novo" nas telas recentes, para quem revê a apresentação pelo "?".
    const mostrarNovo = !this.modoNovidades && !this.precisa(), vistas = this.novidadesVistas();
    this.total = telas.length;
    this.atual = 0;
    this.aberto = true;

    const el = document.createElement('div');
    el.className = 'tutorial';
    el.id = 'tutorial';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', this.modoNovidades ? 'Novidades do Prumo' : 'Como usar o Prumo');
    el.innerHTML = `
      <div class="tut-topo"><span class="tut-passo" id="tutPasso"></span>
        <button type="button" class="tut-pular" data-tut="pular">Pular</button></div>
      <div class="tut-trilho" id="tutTrilho">
        ${telas.map((t, n) => `<section class="tut-slide" data-n="${n}" data-id="${t.id || ''}">${t.nova && mostrarNovo && t.nova > vistas ? '<span class="tut-selo-novo">Novo</span>' : ''}
            <div class="tut-arte">${t.arte}</div>
            <h2>${t.titulo}</h2>${t.texto ? `<p>${t.texto}</p>` : ''}
          </section>`).join('')}
      </div>
      <div class="tut-rodape">
        <div class="tut-pontos">${telas.map((_, n) => `<button type="button" class="tut-ponto" data-tut="ponto" data-n="${n}" aria-label="Tela ${n + 1}"></button>`).join('')}</div>
        <div class="tut-botoes">
          <button type="button" data-tut="voltar" id="tutVoltar">Voltar</button>
          <button type="button" class="principal" data-tut="proximo" id="tutProximo">Próximo</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    el.addEventListener('click', e => {
      const b = e.target.closest('[data-tut]');
      if (!b) return;
      const o = b.dataset.tut;
      if (o === 'pular') return this.fechar();
      if (o === 'voltar') return this.voltar();
      if (o === 'ponto') return this.ir(Number(b.dataset.n));
      if (o === 'proximo') return this.atual >= this.total - 1 ? this.fechar() : this.ir(this.atual + 1);
    });

    // Passar com o dedo: o trilho rola sozinho (scroll-snap) e daqui só se lê onde parou.
    const trilho = el.querySelector('#tutTrilho');
    let pedido = null;
    trilho.addEventListener('scroll', () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = null;
        const n = Math.round(trilho.scrollLeft / Math.max(1, trilho.clientWidth));
        // Enquanto um botão está levando a outra tela, as posições do meio do
        // caminho não contam — senão dois toques rápidos voltam uma tela.
        if (Date.now() < this.indoAte && n !== this.atual) return;
        if (n !== this.atual) { this.atual = n; this.atualizar(); }
      });
    }, { passive: true });

    this.atualizar();
  },

  ir(n) {
    n = Math.max(0, Math.min(this.total - 1, n));
    const trilho = document.getElementById('tutTrilho');
    if (!trilho) return;
    this.atual = n;
    this.indoAte = Date.now() + 700;
    trilho.scrollTo({ left: n * trilho.clientWidth, behavior: 'smooth' });
    this.atualizar();
  },

  voltar() {
    if (this.atual > 0) this.ir(this.atual - 1);
    else this.fechar();
  },

  atualizar() {
    const n = this.atual, ultimo = n === this.total - 1;
    document.getElementById('tutPasso').textContent = (n + 1) + ' de ' + this.total;
    document.querySelectorAll('.tut-ponto').forEach((p, i) => p.classList.toggle('ativo', i === n));
    document.getElementById('tutVoltar').style.visibility = n === 0 ? 'hidden' : 'visible';
    document.getElementById('tutProximo').textContent = ultimo ? (this.modoNovidades ? 'Entendi' : 'Começar a usar') : (n === 0 ? 'Vamos lá' : 'Próximo');
    document.querySelector('.tut-pular').style.visibility = ultimo ? 'hidden' : 'visible';

    // As linhas da tela "Ele entende" entram uma a uma sempre que se chega nela.
    document.querySelectorAll('.tut-slide').forEach((s, i) => {
      if (i !== n) return;
      s.querySelectorAll('.tut-linha').forEach(l => { l.style.animationName = 'none'; void l.offsetWidth; l.style.animationName = ''; });
    });
    const id = this.ids[n];
    this.digitar(id === 'digitar');
    this.animarRepete(id === 'repete');
    if (id === 'esfera') this.ligarEsfera(n);
  },

  /* A esfera de verdade (a mesma da tela Hoje) desenhada na tela do tutorial,
     com frases de exemplo aparecendo embaixo como se alguém falasse. */
  ligarEsfera(n) {
    const slide = document.querySelector('.tut-slide[data-n="' + n + '"]');
    const canvas = slide && slide.querySelector('canvas');
    if (canvas && typeof Esfera !== 'undefined' && Esfera.prepararTela) {
      try { Esfera.prepararTela(canvas, () => this.aberto && this.atual === n); } catch (e) {}
    }
    const fala = document.getElementById('tutFala');
    if (!fala) return;
    const frases = ['“dentista quinta às 15h”', '“paguei 32 no almoço”', '“me lembre de ligar pro João a cada hora”'];
    let i = 0;
    const trocar = () => {
      if (!this.aberto || this.atual !== n) return;
      fala.classList.remove('entra'); void fala.offsetWidth;
      fala.textContent = frases[i++ % frases.length];
      fala.classList.add('entra');
      this.relogioFala = setTimeout(trocar, 2600);
    };
    clearTimeout(this.relogioFala);
    trocar();
  },

  /* Tela "Lembretes que repetem": notificações chegando de 20 em 20 min (acelerado). */
  animarRepete(ligar) {
    clearTimeout(this.relogioRepete);
    const lista = document.getElementById('tutRepete');
    if (!ligar || !lista) return;
    const nativo = typeof Avisos !== 'undefined' && Avisos.nativo;
    const horas = ['14:20', '14:40', '15:00', '15:20'];
    let k = 0;
    lista.innerHTML = '';
    const passo = () => {
      if (k >= horas.length) {                       // recomeça depois de uma pausa
        this.relogioRepete = setTimeout(() => { lista.innerHTML = ''; k = 0; passo(); }, 2200);
        return;
      }
      const ultimo = k === horas.length - 1;
      const div = document.createElement('div');
      div.className = 'tut-aviso tut-aviso-repete' + (ultimo ? ' parou' : '');
      div.dataset.tipo = 'compromisso';
      div.innerHTML = `<div class="selo"><span class="tut-sino">🔁</span></div>
        <div><strong>Beber água</strong><span>${ultimo ? 'Você tocou em Feito ✓' : 'Lembrete a cada 20 min'}</span>
        ${nativo && !ultimo ? '<span class="tut-aviso-bts"><b>Parar</b><b>Feito</b></span>' : ''}</div>
        <small>${horas[k]}</small>`;
      lista.prepend(div);
      while (lista.children.length > 3) lista.lastChild.remove();
      k++;
      this.relogioRepete = setTimeout(passo, 1500);
    };
    this.relogioRepete = setTimeout(passo, 500);
  },

  /* Máquina de escrever da tela 2: frases de exemplo aparecendo letra a letra. */
  digitar(ligar) {
    clearTimeout(this.relogio);
    const alvo = document.getElementById('tutDigitando');
    if (!ligar || !alvo) return;
    const frases = ['paguei 45 no almoço', 'dentista quinta 15h', 'lembrar de pagar a luz', 'recebi 300 de serviço'];
    let f = 0, c = 0, apagando = false;
    const passo = () => {
      const frase = frases[f];
      if (!apagando) {
        c++;
        alvo.textContent = frase.slice(0, c);
        if (c >= frase.length) { apagando = true; this.relogio = setTimeout(passo, 1300); return; }
        this.relogio = setTimeout(passo, 70);
      } else {
        c -= 2;
        alvo.textContent = frase.slice(0, Math.max(0, c));
        if (c <= 0) { apagando = false; c = 0; f = (f + 1) % frases.length; this.relogio = setTimeout(passo, 350); return; }
        this.relogio = setTimeout(passo, 25);
      }
    };
    alvo.textContent = '';
    this.relogio = setTimeout(passo, 400);
  },

  fechar() {
    const el = document.getElementById('tutorial');
    clearTimeout(this.relogio); clearTimeout(this.relogioRepete); clearTimeout(this.relogioFala);
    this.marcarVisto();
    this.aberto = false;
    document.body.style.overflow = '';
    if (!el) return;
    el.classList.add('saindo');
    setTimeout(() => el.remove(), 260);
  }
};
