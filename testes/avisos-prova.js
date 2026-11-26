/* Provas dos avisos do app Android. */
const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const hhmm = d => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
const daqui = min => new Date(Date.now() + min * 60000);
const amanha = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); };

let falhas = 0;
async function prova(nome, fn) {
  try {
    const r = await fn();
    if (r === false) { print('FALHOU  ' + nome); falhas++; } else print('ok      ' + nome);
  } catch (e) { print('ERRO    ' + nome + ' → ' + e.message); falhas++; }
}
const deItens = () => agendados.filter(n => n.extra && n.extra.id);   // fora o lembrete de domingo
const novo = (o) => Dados.adicionar(Object.assign({ texto: '', valor: null, categoria: null, hora: null, feito: false }, o));

(async () => {
  await prova('reconhece que está no app Android', () => Avisos.nativo === true);

  const em3h = daqui(180);
  const c = novo({ tipo: 'compromisso', titulo: 'Dentista', data: iso(em3h), hora: hhmm(em3h) });
  await prova('compromisso com hora avisa 1 h antes e de novo 30 min antes (padrão)', () => {
    const h = Avisos.horarios(c);
    return h.length === 2 && Math.abs(h[0] - (dataHoraDe(c) - 60 * 60000)) < 1000 &&
           Math.abs(h[1] - (dataHoraDe(c) - 30 * 60000)) < 1000;
  });

  const t = novo({ tipo: 'tarefa', titulo: 'Pagar a luz', data: amanha() });
  await prova('tarefa sem hora avisa às 9h do dia', () => {
    const q = Avisos.quando(t); return q.getHours() === 9 && iso(q) === amanha();
  });

  const em10 = daqui(10);
  const perto = novo({ tipo: 'compromisso', titulo: 'Reunião', data: iso(em10), hora: hhmm(em10) });
  await prova('anotado em cima da hora: avisa na hora do compromisso', () => {
    const q = Avisos.quando(perto); return q && Math.abs(q - dataHoraDe(perto)) < 1000;
  });

  const g = novo({ tipo: 'gasto', titulo: 'Mercado', valor: 50, data: amanha() });
  await prova('gasto não gera aviso', () => Avisos.quando(g) === null);

  const velho = novo({ tipo: 'tarefa', titulo: 'Coisa velha', data: '2020-01-01' });
  await prova('data passada não gera aviso', () => Avisos.quando(velho) === null);

  await Avisos.reagendarTudo();
  await prova('agenda exatamente os 4 avisos futuros (2 do dentista)', () => deItens().length === 4);
  await prova('os dois avisos do dentista têm ids diferentes', () => {
    const d = agendados.filter(x => x.extra.id === c.id); return d.length === 2 && d[0].id !== d[1].id;
  });
  await prova('aviso leva título, canal e o id do Prumo', () => {
    const n = agendados.find(x => x.extra.id === c.id);
    return n && n.title === 'Dentista' && n.channelId === 'avisos' && n.schedule.allowWhileIdle === true;
  });
  await prova('ids numéricos de 32 bits e sem repetir', () => {
    const ids = agendados.map(n => n.id);
    return ids.every(i => Number.isInteger(i) && i > 0 && i <= 0x7fffffff) && new Set(ids).size === ids.length;
  });

  Dados.atualizar(t.id, { feito: true });
  await Avisos.reagendarTudo();
  await prova('marcar como feito tira o aviso', () => deItens().length === 3 && !agendados.some(n => n.extra.id === t.id));

  Dados.carregar().avisosAntes = [120]; Dados.salvar();
  await Avisos.reagendarTudo();
  await prova('escolher só 2 h antes reagenda (um aviso só)', () => {
    const n = agendados.filter(x => x.extra.id === c.id);
    return n.length === 1 && Math.abs(new Date(n[0].schedule.at) - (dataHoraDe(c) - 120 * 60000)) < 1000;
  });
  delete Dados.carregar().avisosAntes; Dados.carregar().avisoMinutos = 10; Dados.salvar();
  await prova('quem tinha escolhido outro tempo antes (10 min) continua com ele', () =>
    Avisos.antecedencias().join() === '10');
  Dados.carregar().avisoMinutos = 30;
  await prova('quem estava no antigo padrão (30 min) passa para 1 h + 30 min', () =>
    Avisos.antecedencias().join() === '60,30');
  Dados.carregar().avisosAntes = [60]; Dados.salvar();

  Avisos.aoTocar({ actionId: 'adiar', notification: { extra: { id: perto.id } } });
  await Avisos.reagendarTudo();
  await prova('botão "Adiar 10 min" remarca para daqui a 10 min', () => {
    const n = agendados.find(x => x.extra.id === perto.id);
    return Math.abs(new Date(n.schedule.at) - daqui(10)) < 5000;
  });

  Avisos.aoTocar({ actionId: 'feito', notification: { extra: { id: perto.id } } });
  await prova('botão "Feito" da notificação marca a tarefa', () => Dados.itens().find(i => i.id === perto.id).feito === true);

  await prova('tela Agenda mostra o sininho e não o botão do calendário', () => {
    const h = telaAgenda(); return h.includes('🔔') && !h.includes('Pôr no calendário');
  });
  App.recado = c.id;
  await prova('recado diz quando vai avisar', () => recadoHTML().includes('Aviso '));
  await prova('Ajustes tem a seção Avisos', () => { painelAjustes(); return true; });

  // ---- alarme de verdade ----
  const a1 = Avisos.ajustarAlarme(interpretar('alarme 23h59'));
  await prova('"alarme 23h59" vira alarme', () => a1.alarme === true && a1.tipo === 'compromisso' && a1.hora === '23:59');
  const ontemHora = new Date(Date.now() - 5 * 60000);
  const a2 = Avisos.ajustarAlarme(interpretar('alarme para ' + ontemHora.getHours() + 'h' + String(ontemHora.getMinutes()).padStart(2,'0')));
  await prova('alarme com hora que já passou hoje vai para amanhã', () => a2.data === amanha());
  const a3 = Avisos.ajustarAlarme(interpretar('me acorda amanhã às 6h'));
  await prova('"me acorda amanhã às 6h" vira alarme', () => a3.alarme === true && a3.data === amanha() && a3.hora === '06:00');
  const a4 = Avisos.ajustarAlarme(interpretar('dentista amanhã 15h'));
  await prova('compromisso comum NÃO vira alarme', () => !a4.alarme);

  // ---- versão nova do app ----
  globalThis.versaoInstalada = 5;
  globalThis.ultimaRelease = { tag_name: 'v1.6', body: 'Novidades', assets: [{ name: 'Prumo.apk',
    browser_download_url: 'https://github.com/pimentel-code/prumo/releases/download/v1.6/Prumo.apk' }] };
  await Atualizacao.conferir(true);
  await prova('versão liberada mais nova aparece como atualização', () => Atualizacao.nova && Atualizacao.nova.versao === '1.6');
  await prova('faixa "Versão nova do Prumo" com botão Atualizar', () => Atualizacao.bannerHTML().includes('Versão nova do Prumo (1.6)') && Atualizacao.bannerHTML().includes('atualizar-app'));
  await Atualizacao.instalar();
  await prova('Atualizar baixa o APK da versão nova', () => globalThis.instalou === globalThis.ultimaRelease.assets[0].browser_download_url);
  const antesPergunta = globalThis.perguntouGithub;
  await Atualizacao.conferir();
  await prova('não pergunta ao GitHub de novo em menos de 6 horas', () => globalThis.perguntouGithub === antesPergunta);
  globalThis.versaoInstalada = 6;
  await Atualizacao.conferir(true);
  await prova('mesma versão instalada: nada aparece', () => !Atualizacao.nova && Atualizacao.bannerHTML() === '');
  globalThis.ultimaRelease = null;
  await Atualizacao.conferir(true);
  await prova('sem versão liberada ainda: nada aparece', () => !Atualizacao.nova);
  await prova('versão de teste mais velha nunca "atualiza" para trás', () => { globalThis.versaoInstalada = 9; return Atualizacao.codigoDe('v1.6') < 9; });

  // ---- "daqui a 40 minutos" e o jeito de falar do dia a dia ----
  const antes = Date.now();
  const a5 = Avisos.ajustarAlarme(interpretar('alarma para daqui a 40 minutos'));
  const alvo5 = dataHoraDe(a5).getTime();
  await prova('"alarma para daqui a 40 minutos" vira alarme daqui a 40 min', () =>
    a5.alarme === true && a5.titulo === 'Alarme' && alvo5 > antes + 38 * 60000 && alvo5 <= antes + 41 * 60000);
  const a6 = Avisos.ajustarAlarme(interpretar('me acorda daqui a uma hora e meia'));
  const alvo6 = dataHoraDe(a6).getTime();
  await prova('"daqui a uma hora e meia" soma 90 min', () => a6.alarme && alvo6 > antes + 88 * 60000 && alvo6 <= antes + 91 * 60000);
  const a7 = Avisos.ajustarAlarme(interpretar('bota o despertador daqui 2 horas'));
  await prova('"bota o despertador daqui 2 horas" vira alarme "Alarme"', () => a7.alarme && a7.titulo === 'Alarme');
  const l1 = Dados.adicionar(Avisos.ajustarAlarme(interpretar('tirar o bolo do forno daqui a 20 minutos')));
  await prova('lembrete "daqui a 20 minutos" avisa na hora, sem antecedência', () =>
    !l1.alarme && l1.titulo === 'Tirar o bolo do forno' && Avisos.quando(l1).getTime() === dataHoraDe(l1).getTime());
  Dados.remover(l1.id);
  globalThis.sobreporLiberado = false;
  await Avisos.lerEstadoAlarme();
  await prova('Ajustes oferece "por cima de outros apps" quando o Android não liberou', () => {
    return ajustesHTML().includes('data-acao="sobrepor"');
  });
  globalThis.sobreporLiberado = true;
  await Avisos.lerEstadoAlarme();
  await prova('…e some dos Ajustes depois de liberado', () => !ajustesHTML().includes('data-acao="sobrepor"'));
  await prova('Ajustes no padrão: chaves liga/desliga e subpágina de avisos', () =>
    ajustesHTML().includes('role="switch"') && subAjustesHTML('avisar-antes').includes('role="checkbox"'));
  await Avisos.lerEstadoAlarme();

  const salvo = Dados.adicionar(a3);
  await Avisos.reagendarTudo();
  await prova('alarme vai para o despertador nativo, na hora exata', () =>
    alarmes.length === 1 && alarmes[0].at === dataHoraDe(salvo).getTime() && alarmes[0].titulo === salvo.titulo);
  await prova('alarme não vira notificação comum também', () => !agendados.some(n => n.extra.id === salvo.id));
  await prova('agenda mostra ⏰ no alarme', () => telaAgenda().includes('⏰'));
  Dados.atualizar(salvo.id, { feito: true });
  await Avisos.reagendarTudo();
  await prova('alarme marcado como feito é cancelado', () => alarmes.length === 0);

  // ---- lembrete de domingo ----
  const rev = agendados.find(n => n.id === 2);
  await prova('domingo 19h: lembrete do que ficou para trás', () =>
    rev && new Date(rev.schedule.at).getDay() === 0 && new Date(rev.schedule.at).getHours() === 19 &&
    /ficou|ficaram/.test(rev.title) && rev.extra.acao === 'revisao');
  await prova('o lembrete conta quantas coisas estão atrasadas', () => rev.title.includes(String(Avisos.atrasadasEm(new Date(rev.schedule.at)))));
  Dados.carregar().revisaoSemanal = false; Dados.salvar();
  await Avisos.reagendarTudo();
  await prova('lembrete de domingo desliga nos Ajustes', () => !agendados.some(n => n.id === 2));
  Dados.carregar().revisaoSemanal = true; Dados.salvar();
  let abriuRevisao = false; const revOriginal = abrirRevisao; abrirRevisao = () => { abriuRevisao = true; };
  Avisos.aoTocar({ actionId: 'tap', notification: { extra: { acao: 'revisao' } } });
  abrirRevisao = revOriginal;
  await prova('tocar no lembrete abre a revisão', () => abriuRevisao);
  await prova('próximo domingo nunca é no passado', () => {
    const domingo21h = new Date(2026, 10, 22, 21, 0), domingo10h = new Date(2026, 10, 22, 10, 0), quarta = new Date(2026, 10, 25, 8, 0);
    return Avisos.proximaRevisao(domingo21h).getDate() === 29 && Avisos.proximaRevisao(domingo10h).getDate() === 22 &&
           Avisos.proximaRevisao(quarta).getDate() === 29;
  });

  // ---- botão "Amanhã" ----
  const t2 = novo({ tipo: 'tarefa', titulo: 'Ligar pro banco', data: iso(new Date()) });
  Avisos.aoTocar({ actionId: 'amanha', notification: { extra: { id: t2.id } } });
  await prova('botão "Amanhã" passa a tarefa para amanhã', () => Dados.itens().find(i => i.id === t2.id).data === amanha());

  // ---- contas fixas ----
  const hoje = new Date();
  const diaFixa = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5);       // dia 5 do mês que vem: sempre futuro
  const conta = Dados.adicionarFixa({ tipo: 'gasto', titulo: 'Aluguel', valor: 900, categoria: 'Casa', dia: 5,
                                      desde: iso(hoje).slice(0, 7) });
  await Avisos.reagendarTudo();
  const ymFut = iso(diaFixa).slice(0, 7);
  const avisoConta = agendados.find(n => n.extra.id === 'fixa:' + conta.id + ':' + ymFut);
  await prova('conta fixa avisa às 9h do vencimento', () => avisoConta &&
    new Date(avisoConta.schedule.at).getDate() === 5 && new Date(avisoConta.schedule.at).getHours() === 9 &&
    avisoConta.actionTypeId === 'prumo-conta' && avisoConta.body.includes('900'));
  Avisos.aoTocar({ actionId: 'paguei', notification: { extra: { id: avisoConta.extra.id } } });
  await Avisos.reagendarTudo();
  await prova('"Paguei" na notificação lança o pagamento e tira o aviso', () =>
    Dados.itens().some(i => i.fixaId === conta.id && i.data.startsWith(ymFut) && i.valor === 900) &&
    !agendados.some(n => n.extra.id === avisoConta.extra.id));

  // ---- widget ----
  novo({ tipo: 'gasto', titulo: 'Café', valor: 7.5, data: iso(new Date()) });
  await Avisos.reagendarTudo();
  await prova('widget recebe o gasto de hoje e os próximos compromissos', () =>
    widget && widget.dia === iso(new Date()) && widget.gastoHoje >= 7.5 &&
    Array.isArray(widget.proximos) && widget.proximos.some(p => p.titulo === 'Dentista'));
  await prova('widget conta o que está atrasado', () => widget.atrasados >= 1);

  await prova('tutorial no app Android tem widget, lembrete repetido, fale do seu jeito e atualização (13 telas)', () =>
    Tutorial.telas().length === 13 && ['Anote sem abrir o app', 'Lembretes que repetem', 'Fale do seu jeito', 'Sempre atualizado', 'Toque na esfera e fale o que deseja']
      .every(t => Tutorial.telas().some(x => x.titulo === t)));
  await prova('novidades: quem viu antes recebe as 4 telas novas; depois de ver, nenhuma', () => {
    localStorage.setItem(Tutorial.CHAVE, '1'); localStorage.removeItem(Tutorial.CHAVE_NOVIDADES);
    const antes = Tutorial.novidades().map(t => t.id).join(',');
    Tutorial.marcarVisto();
    return antes === 'esfera,repete,natural,atualiza' && Tutorial.novidades().length === 0;
  });

  falado = 'gastei 30 na padaria';
  await prova('microfone devolve o texto falado', async () => (await Avisos.ouvir()) === 'gastei 30 na padaria');

  // ---- "a cada 20 minutos": série de notificações ----
  const agora0 = new Date();
  const fr = interpretar('preciso fazer a tarefa x, me lembre disso a cada 20 minutos', { agora: agora0, hoje: agora0 });
  await prova('"a cada 20 minutos" vira série de 20 em 20 min, por 3 horas', () =>
    fr.repetir && fr.repetir.cada === 20 && fr.titulo === 'Fazer a tarefa x' && fr.tipo === 'compromisso' &&
    Math.abs(new Date(fr.repetir.ate) - (agora0.getTime() + 180 * 60000)) < 60000 &&
    Math.abs(dataHoraDe(fr) - (agora0.getTime() + 20 * 60000)) < 60000);
  const fr2 = interpretar('ligar pro cliente de meia em meia hora até as 23h59', { agora: agora0, hoje: agora0 });
  await prova('"de meia em meia hora até as ..." entende o intervalo e o fim', () =>
    fr2.repetir && fr2.repetir.cada === 30 && fr2.repetir.ate.slice(11) === '23:59' && fr2.titulo === 'Ligar pro cliente');
  const fr3 = interpretar('alongar a cada hora por 2 horas', { agora: agora0, hoje: agora0 });
  await prova('"por 2 horas" limita a série', () => fr3.repetir && fr3.repetir.cada === 60 &&
    Math.abs(new Date(fr3.repetir.ate) - (agora0.getTime() + 120 * 60000)) < 60000);
  await prova('frase comum continua sem repetição ("pegar certidão até sexta")', () =>
    !interpretar('pegar certidão até sexta').repetir && !interpretar('daqui a 40 minutos tirar o bolo').repetir);
  await prova('"a cada 2 minutos" não vira série (mínimo de 5 min)', () => !interpretar('beber água a cada 2 minutos').repetir);

  permissao = 'granted'; Avisos.permitido = true;
  const serieItem = Dados.adicionar(Avisos.ajustarAlarme(fr));
  await Avisos.reagendarTudo();
  const daSerie = () => agendados.filter(n => n.extra && n.extra.id === serieItem.id);
  await prova('agenda 9 notificações (14:20 … 17:00), uma a cada 20 min, com ids diferentes', () => {
    const l = daSerie().map(n => +n.schedule.at).sort((a, b) => a - b);
    return l.length === 9 && l.every((t, k) => k === 0 || t - l[k - 1] === 20 * 60000) &&
           new Set(daSerie().map(n => n.id)).size === 9;
  });
  await prova('é notificação comum, não alarme (alarme só se pedir)', () =>
    !(globalThis.alarmes || []).some(a => a.titulo === serieItem.titulo) && daSerie().every(n => n.channelId === 'avisos'));
  await prova('notificação da série: só o título + botões Parar e Feito', () =>
    daSerie().every(n => n.actionTypeId === 'prumo-repete' && n.title === serieItem.titulo && n.body === ''));
  await prova('aviso que já passou sai da série; o próximo é o seguinte', () => {
    const depois = new Date(agora0.getTime() + 50 * 60000);
    const s = Avisos.serie(serieItem, depois);
    return s.length === 7 && Math.abs(s[0] - (agora0.getTime() + 60 * 60000)) < 60000;
  });
  Avisos.aoTocar({ actionId: 'parar', notification: { extra: { id: serieItem.id } } });
  await Avisos.reagendarTudo();
  await prova('"Parar" tira todos os avisos e o compromisso continua na lista', () =>
    daSerie().length === 0 && Dados.itens().some(i => i.id === serieItem.id && !i.feito));
  const serie2 = Dados.adicionar(interpretar('olhar o forno a cada 10 minutos por 1 hora', { agora: agora0, hoje: agora0 }));
  await Avisos.reagendarTudo();
  const nSerie2 = agendados.filter(n => n.extra && n.extra.id === serie2.id).length;
  Avisos.aoTocar({ actionId: 'feito', notification: { extra: { id: serie2.id } } });
  await Avisos.reagendarTudo();
  await prova('"Feito" encerra a série (6 avisos antes, 0 depois)', () =>
    nSerie2 === 6 && !agendados.some(n => n.extra && n.extra.id === serie2.id));
  const serie3 = Dados.adicionar(Avisos.ajustarAlarme(interpretar('alarme a cada 30 minutos para virar o paciente por 1 hora', { agora: agora0, hoje: agora0 })));
  await Avisos.reagendarTudo();
  await prova('pedindo "alarme", a série toca como alarme', () =>
    serie3.alarme && (globalThis.alarmes || []).filter(a => a.titulo === serie3.titulo).length === 2);
  Dados.atualizar(serie3.id, { feito: true });
  await Avisos.reagendarTudo();
  await prova('ICS do iPhone: um compromisso com aviso para cada passo da série (iPhone guarda só 2 avisos por evento)', () => {
    const ics = montarICS(Object.assign({ id: 'x' }, fr));
    return (ics.match(/BEGIN:VEVENT/g) || []).length === 9 && (ics.match(/BEGIN:VALARM/g) || []).length === 9 &&
           !ics.includes('PT160M') && ics.trim().endsWith('END:VCALENDAR');
  });

  // ---- 25/11/2026: dois avisos por padrão, "me avisa X antes" e "à noite" ----
  delete Dados.carregar().avisosAntes; delete Dados.carregar().avisoMinutos; Dados.salvar();
  const em5h = daqui(300);
  const med = novo({ tipo: 'compromisso', titulo: 'Médico', data: iso(em5h), hora: hhmm(em5h) });
  await Avisos.reagendarTudo();
  await prova('padrão novo: o médico tem 2 notificações, 1 h e 30 min antes', () => {
    const n = agendados.filter(x => x.extra.id === med.id).map(x => Math.round((dataHoraDe(med) - new Date(x.schedule.at)) / 60000)).sort((a, b) => b - a);
    return n.join() === '60,30';
  });
  await prova('a frase do Ajustes diz "1 h e 30 min antes"', () => rotuloAntes(Avisos.antecedencias()) === '1 h e 30 min antes');
  await prova('recado ao guardar cita os dois horários', () => /^Guardado\. Avisos .+ e às \d/.test(avisosGuardado(Avisos.horarios(med))));
  Avisos.aoTocar({ actionId: 'adiar', notification: { extra: { id: med.id } } });
  await prova('"Adiar 10 min" no 1º aviso não apaga o de 30 min antes', () => {
    const h = Avisos.horarios(med);
    return Math.abs(h[0] - daqui(10)) < 5000 && h.some(t => Math.abs(t - (dataHoraDe(med) - 30 * 60000)) < 1000);
  });
  const fala = Object.assign(interpretar('me avisa meia hora antes da consulta às ' + hhmm(em5h)), {});
  const cons = novo(Object.assign({}, fala, { data: iso(em5h) }));
  await prova('"me avisa meia hora antes": só esse aviso, no lugar do padrão', () => {
    const h = Avisos.horarios(cons); return h.length === 1 && Math.abs(h[0] - (dataHoraDe(cons) - 30 * 60000)) < 1000;
  });
  const noite = novo(Object.assign(interpretar('amanhã à noite ligar pro João'), {}));
  await prova('"amanhã à noite": avisa às 19h, na hora (não 1 h antes de um palpite)', () => {
    const q = Avisos.quando(noite); return noite.hora === '19:00' && q.getHours() === 19 && q.getMinutes() === 0;
  });
  await prova('ICS do iPhone: compromisso com hora leva os 2 avisos (1 h e 30 min antes)', () => {
    const ics = montarICS(med, Avisos.antecedencias(med));
    return (ics.match(/BEGIN:VALARM/g) || []).length === 2 && ics.includes('TRIGGER;RELATED=START:-PT60M') && ics.includes('TRIGGER;RELATED=START:-PT30M');
  });

  // ---- alarme de segunda a sexta (25/11/2026) ----
  const sem = Avisos.ajustarAlarme(Object.assign(interpretar('alarme às 4h45 de segunda a sexta'), {}));
  const al = novo(sem);
  await Avisos.reagendarTudo();
  const doAlarme = () => (globalThis.alarmes || []).filter(a => a.titulo === al.titulo && a.texto && a.texto.includes('4:45'));
  await prova('"alarme às 4h45 de segunda a sexta" vira alarme que repete', () => al.alarme === true && al.semana.join() === '1,2,3,4,5');
  await prova('agenda as próximas 6 semanas de alarmes, só de segunda a sexta, às 4:45', () => {
    const l = doAlarme(); const dias = l.map(a => new Date(a.at));
    return l.length >= 28 && l.length <= 31 && dias.every(d => d.getDay() >= 1 && d.getDay() <= 5 && d.getHours() === 4 && d.getMinutes() === 45) &&
           new Set(l.map(a => a.id)).size === l.length;
  });
  await prova('nenhum alarme no sábado nem no domingo', () => doAlarme().every(a => ![0, 6].includes(new Date(a.at).getDay())));
  Dados.atualizar(al.id, { data: '2026-01-05' });    // como se a última vez tivesse sido no passado
  Avisos.rolarSemanais();
  await prova('depois que toca, a data vai sozinha para o próximo dia útil (não fica "para trás")', () => {
    const it = Dados.itens().find(i => i.id === al.id), d = dataHoraDe(it);
    return d > new Date() && d.getDay() >= 1 && d.getDay() <= 5 && !it.feito;
  });
  await prova('não entra na conta do que ficou para trás', () => !Dados.itens().some(i => i.id === al.id && i.data < iso(new Date())));
  const antesFeito = Dados.itens().find(i => i.id === al.id).data;
  Avisos.aoTocar({ actionId: 'feito', notification: { extra: { id: al.id } } });
  await prova('"Feito" num que repete pula para a próxima vez, sem encerrar', () => {
    const it = Dados.itens().find(i => i.id === al.id); return !it.feito && it.data > antesFeito;
  });
  await prova('ICS do iPhone: repete toda semana de segunda a sexta (RRULE)', () =>
    montarICS(Object.assign({}, al, { alarme: false }), [60, 30]).includes('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'));
  const aca = novo(Object.assign(interpretar('toda segunda e quarta academia às 19h'), {}));
  await prova('compromisso semanal (não alarme) avisa 1 h e 30 min antes em cada dia', () => {
    const h = Avisos.horarios(aca).slice(0, 4);
    return h.length === 4 && h.every(t => [1, 3].includes(t.getDay()) && ((t.getHours() === 18 && [0, 30].includes(t.getMinutes()))));
  });
  Dados.remover(al.id); Dados.remover(aca.id);

  permissao = 'denied'; Avisos.permitido = false;
  await Avisos.reagendarTudo();
  await prova('sem permissão não agenda nada', () => agendados.length === 0);

  print('');
  print(falhas ? falhas + ' PROBLEMA(S)' : 'tudo passou');
})();
