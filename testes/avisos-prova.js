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
  await prova('compromisso com hora avisa 30 min antes', () =>
    Math.abs(Avisos.quando(c) - (dataHoraDe(c) - 30 * 60000)) < 1000);

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
  await prova('agenda exatamente os 3 avisos futuros', () => deItens().length === 3);
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
  await prova('marcar como feito tira o aviso', () => deItens().length === 2 && !agendados.some(n => n.extra.id === t.id));

  Dados.carregar().avisoMinutos = 60; Dados.salvar();
  await Avisos.reagendarTudo();
  await prova('mudar para 1 h antes reagenda', () => {
    const n = agendados.find(x => x.extra.id === c.id);
    return Math.abs(new Date(n.schedule.at) - (dataHoraDe(c) - 60 * 60000)) < 1000;
  });

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
    const original = abrirPainel; let html = '';
    abrirPainel = h => { html = h; };
    painelAjustes(); abrirPainel = original;
    return html.includes('data-acao="sobrepor"');
  });
  globalThis.sobreporLiberado = true;
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

  await prova('tutorial no app Android tem a tela do widget (9 telas)', () =>
    Tutorial.telas().length === 9 && Tutorial.telas().some(t => t.titulo === 'Anote sem abrir o app'));

  falado = 'gastei 30 na padaria';
  await prova('microfone devolve o texto falado', async () => (await Avisos.ouvir()) === 'gastei 30 na padaria');

  permissao = 'denied'; Avisos.permitido = false;
  await Avisos.reagendarTudo();
  await prova('sem permissão não agenda nada', () => agendados.length === 0);

  print('');
  print(falhas ? falhas + ' PROBLEMA(S)' : 'tudo passou');
})();
