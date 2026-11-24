/* avisos.js — no app Android, o próprio Prumo agenda e toca o aviso.
   Usa o despertador do sistema (via Capacitor): toca com o app fechado,
   com a tela bloqueada e sem internet. Nada sai do aparelho.

   No navegador (iPhone, site publicado) este arquivo não faz nada e o
   caminho continua sendo o calendário do celular (calendario.js). */

/* Jeitos de pedir alarme, inclusive os do dia a dia: "alarma daqui a 40 minutos",
   "bota o despertador pras 6", "me acorda às 5", "me chama às 7". */
const PALAVRAS_ALARME = /\b(alarm\w*|despert\w*|acord\w*|me\s+cham[ae])\b/;
const SO_ALARME = /^((bota|bote|botar|coloca|coloque|colocar|poe|ponha|por|liga|ligar|programa|programar|marca|marcar|cria|criar|um|uma|o|a|me|pra|pro|para|de|alarm\w*|despert\w*|acord\w*|cham[ae])\s*)+$/;
const MAX_AVISOS = 60;          // o Android limita alarmes por app; os 60 mais próximos bastam
const HORA_SEM_HORARIO = 9;     // tarefa/compromisso sem hora: avisa às 9 da manhã do dia
const CANAL = 'avisos';
const ID_REVISAO = 2;           // o lembrete de domingo ("3 coisas ficaram para trás")
const HORA_REVISAO = 19;

const Avisos = {
  nativo: !!(typeof window !== 'undefined' && window.Capacitor &&
             window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
  permitido: null,              // null = ainda não perguntado; true/false depois
  _timer: null,
  _pronto: false,

  plugin() { return window.Capacitor.Plugins.LocalNotifications; },
  nativoPrumo() { return window.Capacitor.Plugins.Prumo; },   // alarme e voz (código Java do app)
  telaCheia: true,
  sobrepor: true,               // "aparecer sobre outros apps": tela do alarme com o celular desbloqueado

  /* Pergunta ao Android o que está liberado para a tela do alarme. */
  async lerEstadoAlarme() {
    try {
      const e = await this.nativoPrumo().estadoAlarme();
      this.telaCheia = e.telaCheia;
      this.sobrepor = e.sobrepor !== false;
    } catch (e) {}
  },

  /* "alarme 6h", "me acorda às 7", "despertar 5h30": vira ALARME de verdade
     (toca em volta até parar), e não só notificação. Hora que já passou hoje
     vai para amanhã, como num despertador. */
  ajustarAlarme(item) {
    if (!this.nativo || !item || !item.hora) return item;
    if (!PALAVRAS_ALARME.test(semAcento(item.texto || ''))) return item;
    item.tipo = 'compromisso';
    item.alarme = true;
    // "Alarma", "Bota um despertador", "Me acorda": título vira só "Alarme".
    if (SO_ALARME.test(semAcento(item.titulo || '').trim())) item.titulo = 'Alarme';
    if (item.data === hojeISOAvisos() && dataHoraDe(item) <= new Date()) {
      const d = dataHoraDe(item); d.setDate(d.getDate() + 1);
      item.data = hojeISOAvisos(d);
    }
    return item;
  },

  minutosAntes() {
    const m = Dados.carregar().avisoMinutos;
    return (m === 0 || m) ? m : 30;
  },

  /* Quando o aviso deste item deve tocar (Date) — ou null se não tem aviso. */
  quando(item, agora) {
    agora = agora || new Date();
    if (!item || item.feito || !item.data) return null;
    if (item.tipo !== 'compromisso' && item.tipo !== 'tarefa') return null;

    if ((item.alarme || item.naHora) && item.hora) {                 // alarme toca na hora exata, sem antecedência
      const inicio = dataHoraDe(item);
      return inicio > agora ? inicio : null;
    }

    const adiado = (Dados.carregar().adiados || {})[item.id];
    if (adiado && new Date(adiado) > agora) return new Date(adiado);

    const [a, m, d] = item.data.split('-').map(Number);
    if (item.hora) {
      const [hh, mm] = item.hora.split(':').map(Number);
      const inicio = new Date(a, m - 1, d, hh, mm);
      const aviso = new Date(inicio.getTime() - this.minutosAntes() * 60000);
      if (aviso > agora) return aviso;
      if (inicio > agora) return inicio;        // anotou em cima da hora: avisa na hora
      return null;
    }
    const aviso = new Date(a, m - 1, d, HORA_SEM_HORARIO, 0);
    return aviso > agora ? aviso : null;
  },

  /* O Android exige número inteiro de 32 bits; o id do Prumo é texto. */
  numero(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return (h & 0x7fffffff) || 1;
  },

  texto(item, hora) {
    if (item.conta) {
      const dia = hojeISOAvisos(hora) === item.venc ? 'vence hoje' : 'venceu dia ' + (+item.venc.slice(8, 10));
      return fmtMoeda(item.conta.valor) + ' — ' + dia + '. Toque em "' + (item.conta.tipo === 'receita' ? 'Recebi' : 'Paguei') + '" quando ' + (item.conta.tipo === 'receita' ? 'cair' : 'pagar') + '.';
    }
    if (item.hora) {
      const faltam = Math.round((dataHoraDe(item) - hora) / 60000);
      if (faltam <= 1) return 'Agora, às ' + item.hora;
      if (faltam < 60) return 'Às ' + item.hora + ' — em ' + faltam + ' min';
      const h = Math.floor(faltam / 60), r = faltam % 60;
      return 'Às ' + item.hora + ' — em ' + h + ' h' + (r ? ' ' + r : '');
    }
    return item.tipo === 'tarefa' ? 'Tarefa para hoje' : 'Compromisso hoje';
  },

  /* Lista do que fica agendado, do mais próximo ao mais distante. */
  plano(agora) {
    agora = agora || new Date();
    return Dados.itens()
      .map(item => ({ item, hora: this.quando(item, agora) }))
      .filter(x => x.hora)
      .concat(this.planoContas(agora))
      .sort((x, y) => x.hora - y.hora)
      .slice(0, MAX_AVISOS);
  },

  /* Contas fixas ainda não pagas deste mês e do próximo: avisa às 9h do vencimento.
     O id é "fixa:<conta>:<AAAA-MM>", para o "Paguei" da notificação saber qual mês. */
  planoContas(agora) {
    if (typeof fixasDoMes !== 'function') return [];
    const adiados = Dados.carregar().adiados || {};
    const lista = [];
    for (let k = 0; k <= 1; k++) {
      const d = new Date(agora.getFullYear(), agora.getMonth() + k, 1);
      for (const x of fixasDoMes(d.getFullYear(), d.getMonth())) {
        if (x.pago) continue;
        const id = 'fixa:' + x.fixa.id + ':' + x.ym;
        const [a, m, dia] = x.venc.split('-').map(Number);
        const hora = adiados[id] && new Date(adiados[id]) > agora ? new Date(adiados[id]) : new Date(a, m - 1, dia, HORA_SEM_HORARIO, 0);
        if (hora <= agora) continue;
        lista.push({ item: { id, titulo: (x.fixa.tipo === 'receita' ? 'Receber: ' : 'Pagar: ') + x.fixa.titulo,
                             conta: x.fixa, ym: x.ym, venc: x.venc }, hora });
      }
    }
    return lista;
  },

  /* Próximo domingo às 19h (ou hoje, se é domingo e ainda não deu 19h). */
  proximaRevisao(agora) {
    const d = new Date(agora || new Date());
    const hoje19 = new Date(d); hoje19.setHours(HORA_REVISAO, 0, 0, 0);
    let delta = (7 - d.getDay()) % 7;
    if (delta === 0 && hoje19 <= d) delta = 7;
    hoje19.setDate(hoje19.getDate() + delta);
    return hoje19;
  },

  /* Quantas coisas estarão atrasadas nesse domingo — se nenhuma, não avisa. */
  atrasadasEm(quando) {
    const dia = hojeISOAvisos(quando);
    return Dados.itens().filter(i => !i.feito && i.data && i.data < dia &&
      (i.tipo === 'tarefa' || i.tipo === 'compromisso')).length;
  },

  /* Resumo para o widget da tela principal (o Java só formata e desenha). */
  atualizarWidget() {
    if (!this.nativo) return;
    const h = hojeISOAvisos();
    const itens = Dados.itens();
    const gastoHoje = itens.filter(i => i.tipo === 'gasto' && i.data === h && !i.compra).reduce((t, i) => t + (i.valor || 0), 0);
    const proximos = itens
      .filter(i => !i.feito && i.data && i.data >= h && (i.tipo === 'compromisso' || i.tipo === 'tarefa'))
      .sort((a, b) => (a.data + (a.hora || '99:99')).localeCompare(b.data + (b.hora || '99:99')))
      .slice(0, 12)
      .map(i => ({ titulo: i.titulo, data: i.data, hora: i.hora || '', tipo: i.tipo }));
    const atrasados = itens.filter(i => !i.feito && i.data && i.data < h && (i.tipo === 'tarefa' || i.tipo === 'compromisso')).length;
    try {
      const p = this.nativoPrumo().atualizarWidget({ dados: JSON.stringify({ dia: h, gastoHoje, proximos, atrasados }) });
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  },

  /* ---- daqui para baixo só roda no app Android ---- */

  async preparar() {
    if (!this.nativo || this._pronto) return;
    this._pronto = true;
    const LN = this.plugin();
    try {
      await LN.createChannel({
        id: CANAL, name: 'Avisos do Prumo',
        description: 'Compromissos e tarefas na hora marcada',
        importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#ec4899'
      });
      await LN.registerActionTypes({ types: [{
        id: 'prumo-aviso',
        actions: [
          { id: 'adiar', title: 'Adiar 10 min' },
          { id: 'amanha', title: 'Amanhã' },
          { id: 'feito', title: 'Feito' }
        ]
      }, {
        id: 'prumo-conta',
        actions: [
          { id: 'paguei', title: 'Paguei' },
          { id: 'amanha', title: 'Lembrar amanhã' }
        ]
      }] });
      LN.addListener('localNotificationActionPerformed', ev => this.aoTocar(ev));
    } catch (e) { console.warn('Avisos: preparar falhou', e); }

    const st = await LN.checkPermissions().catch(() => ({ display: 'prompt' }));
    this.permitido = st.display === 'granted' ? true : (st.display === 'denied' ? false : null);
    if (this.permitido === null && Dados.itens().some(i => this.quando(i))) await this.pedirPermissao();
    await this.lerEstadoAlarme();
    this.programar(0);
  },

  async pedirPermissao() {
    if (!this.nativo) return false;
    const st = await this.plugin().requestPermissions().catch(() => ({ display: 'denied' }));
    this.permitido = st.display === 'granted';
    if (this.permitido) this.programar(0);
    return this.permitido;
  },

  /* Chamado a cada salvamento. Espera um instante para juntar várias mudanças. */
  programar(espera) {
    if (!this.nativo) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.reagendarTudo(), espera == null ? 400 : espera);
  },

  async reagendarTudo() {
    if (!this.nativo) return;
    this.atualizarWidget();
    const LN = this.plugin();
    try {
      // limpa adiamentos velhos
      const e = Dados.carregar();
      if (e.adiados) {
        const agora = new Date();
        for (const k of Object.keys(e.adiados)) if (new Date(e.adiados[k]) <= agora) delete e.adiados[k];
      }

      // Alarmes vão para o despertador nativo (não dependem da permissão de notificação para tocar).
      const plano = this.plano();
      await this.nativoPrumo().definirAlarmes({ alarmes: plano.filter(x => x.item.alarme).map(({ item, hora }) => ({
        id: this.numero(item.id), at: hora.getTime(), titulo: item.titulo,
        texto: 'Alarme das ' + item.hora
      })) }).catch(e => console.warn('Avisos: alarmes falharam', e));

      const pendentes = await LN.getPending();
      if (pendentes.notifications.length) {
        await LN.cancel({ notifications: pendentes.notifications.map(n => ({ id: n.id })) });
      }
      if (this.permitido === false) return;
      if (this.permitido === null) {
        if (!this.plano().length) return;
        if (!(await this.pedirPermissao())) return;
      }

      const lista = plano.filter(x => !x.item.alarme).map(({ item, hora }) => ({
        id: this.numero(item.id),
        title: item.titulo,
        body: this.texto(item, hora),
        schedule: { at: hora, allowWhileIdle: true },
        channelId: CANAL,
        actionTypeId: item.conta ? 'prumo-conta' : 'prumo-aviso',
        autoCancel: true,
        extra: { id: item.id }
      }));

      // Domingo à noite: "N coisas ficaram para trás" — abre a revisão.
      if (Dados.carregar().revisaoSemanal !== false) {
        const quando = this.proximaRevisao();
        const n = this.atrasadasEm(quando);
        if (n) lista.push({
          id: ID_REVISAO,
          title: '🧹 ' + n + (n === 1 ? ' coisa ficou' : ' coisas ficaram') + ' para trás',
          body: 'Toque para arrumar em 20 segundos: já fiz, adiar ou apagar.',
          schedule: { at: quando, allowWhileIdle: true },
          channelId: CANAL, autoCancel: true, extra: { acao: 'revisao' }
        });
      }
      if (lista.length) await LN.schedule({ notifications: lista });
    } catch (err) { console.warn('Avisos: reagendar falhou', err); }
  },

  /* Tocou na notificação ou num dos botões dela. */
  aoTocar(ev) {
    const extra = (ev && ev.notification && ev.notification.extra) || {};
    if (extra.acao === 'revisao') { if (typeof abrirRevisao === 'function') abrirRevisao(); return; }
    const id = extra.id;
    if (!id) return;

    if (id.startsWith('fixa:')) {                      // aviso de conta fixa
      const [, conta, ym] = id.split(':');
      if (ev.actionId === 'paguei') pagarFixa(conta, ym);
      else if (ev.actionId === 'amanha') {
        const e = Dados.carregar(), d = new Date();
        d.setDate(d.getDate() + 1); d.setHours(HORA_SEM_HORARIO, 0, 0, 0);
        e.adiados = e.adiados || {};
        e.adiados[id] = d.toISOString();
        Dados.salvar();
      } else if (typeof App !== 'undefined') { App.aba = 'dinheiro'; }
      if (typeof render === 'function') render();
      return;
    }

    const item = Dados.itens().find(i => i.id === id);
    if (!item) return;
    if (ev.actionId === 'amanha') {
      const d = new Date(); d.setDate(d.getDate() + 1);
      Dados.atualizar(id, { data: hojeISOAvisos(d) });
      if (typeof render === 'function') render();
    } else if (ev.actionId === 'adiar') {
      const e = Dados.carregar();
      e.adiados = e.adiados || {};
      e.adiados[id] = new Date(Date.now() + 10 * 60000).toISOString();
      Dados.salvar();
    } else if (ev.actionId === 'feito') {
      Dados.atualizar(id, { feito: true });
      if (typeof render === 'function') render();
    } else if (typeof painelEditar === 'function') {
      painelEditar(id);
    }
  },

  /* Botão 🎤: abre o reconhecimento de voz do Android e devolve o texto. */
  async ouvir() {
    if (!this.nativo) return '';
    const r = await this.nativoPrumo().ouvir();
    return (r && r.texto || '').trim();
  },

  /* Escuta direto pelo microfone (sem a janelinha do Google), avisando o volume
     e o que já entendeu enquanto você fala — é o que faz a esfera pulsar.
     Se este celular não deixar, cai na janelinha de sempre (ouvir). */
  async escutar(aoVolume, aoParcial) {
    if (!this.nativo) return '';
    const p = this.nativoPrumo();
    const ouvintes = [];
    try {
      if (p.addListener) {
        ouvintes.push(await p.addListener('vozVolume', d => {
          // O Android dá o volume em dB, mais ou menos de -2 (silêncio) a 10 (falando alto).
          const n = Math.max(0, Math.min(1, ((d && d.rms) + 2) / 12));
          if (aoVolume) aoVolume(n);
        }));
        ouvintes.push(await p.addListener('vozParcial', d => { if (aoParcial && d && d.texto) aoParcial(d.texto); }));
      }
      const r = await p.escutar();
      return (r && r.texto || '').trim();
    } catch (e) {
      if (e && e.code === 'SEM_PERMISSAO') throw new Error('O Prumo precisa da permissão do microfone.');
      return this.ouvir();
    } finally {
      ouvintes.forEach(o => { try { o.remove(); } catch (e) {} });
    }
  },

  pararEscuta() {
    if (!this.nativo) return;
    try { this.nativoPrumo().pararEscuta(); } catch (e) {}
  },

  async testarAlarme() {
    await this.nativoPrumo().testarAlarme({ segundos: 10 });
    alert('Pronto. O alarme de teste toca em 10 segundos.\n\nPode bloquear a tela ou sair do Prumo e mexer em outro app: a tela do alarme aparece por cima. Para parar, toque em "Parar".');
  },

  /* Botão "Testar aviso" nos Ajustes: toca daqui a 10 segundos. */
  async testar() {
    if (!this.nativo) return;
    if (this.permitido !== true && !(await this.pedirPermissao())) {
      alert('O Android não deixou o Prumo mostrar avisos. Libere em Ajustes do celular → Apps → Prumo → Notificações.');
      return;
    }
    await this.plugin().schedule({ notifications: [{
      id: 1, title: 'Teste do Prumo', body: 'Se você está lendo isto, os avisos funcionam.',
      schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true }, channelId: CANAL
    }] });
    alert('Pronto. Bloqueie a tela: o aviso de teste chega em 10 segundos.');
  }
};

function hojeISOAvisos(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function dataHoraDe(item) {
  const [a, m, d] = item.data.split('-').map(Number);
  const [hh, mm] = (item.hora || '00:00').split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm);
}

/* Texto curto de quando o aviso vai tocar: "hoje às 14:30", "qui, 27/11 às 9:00". */
function fmtQuandoAviso(dt) {
  const p = n => String(n).padStart(2, '0');
  const hora = dt.getHours() + ':' + p(dt.getMinutes());
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(dt); dia.setHours(0, 0, 0, 0);
  const dif = Math.round((dia - hoje) / 86400000);
  if (dif === 0) return 'hoje às ' + hora;
  if (dif === 1) return 'amanhã às ' + hora;
  const sem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][dt.getDay()];
  return sem + ', ' + p(dt.getDate()) + '/' + p(dt.getMonth() + 1) + ' às ' + hora;
}
