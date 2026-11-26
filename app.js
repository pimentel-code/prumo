/* app.js — as telas do Prumo */

const NOMES_MES = ['janeiro','fevereiro','março','abril','maio','junho','julho',
                   'agosto','setembro','outubro','novembro','dezembro'];
const MES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DIA_CURTO = ['dom','seg','ter','qua','qui','sex','sáb'];
const DIA_LONGO = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

const TIPOS = {
  gasto:       { nome: 'Saiu',        icone: '−' },
  receita:     { nome: 'Entrou',      icone: '+' },
  compromisso: { nome: 'Compromisso', icone: '◷' },
  tarefa:      { nome: 'Tarefa',      icone: '☐' },
  nota:        { nome: 'Anotação',    icone: '✎' }
};

/* Cada tipo tem cor (no CSS, por data-tipo) e um desenho próprio. */
const SELO_TIPO = {
  gasto:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  receita:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  compromisso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  tarefa:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 12.5l2.8 2.8L16.5 9.6"/></svg>',
  nota:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>'
};

const EMOJI_CATEGORIA = {
  'Alimentação': '🍽️', 'Mercado': '🛒', 'Transporte': '🚗', 'Casa': '🏠', 'Saúde': '💊',
  'Educação': '📚', 'Lazer': '🎉', 'Assinaturas': '📺', 'Vestuário': '👕', 'Trabalho': '💼',
  'Família': '👨‍👩‍👧', 'Salário': '💰', 'Honorários': '🧾', 'Vendas': '🏷️',
  'Rendimentos': '📈', 'Reembolso': '↩️'
};

/* O quadradinho colorido à esquerda do item. Compromisso mostra a hora. */
function seloHTML(item) {
  if (item.tipo === 'compromisso' && item.hora) {
    return `<div class="selo selo-hora">${esc(item.hora)}<small>${item.alarme ? 'alarme' : 'hora'}</small></div>`;
  }
  if ((item.tipo === 'gasto' || item.tipo === 'receita') && EMOJI_CATEGORIA[item.categoria]) {
    return `<div class="selo">${EMOJI_CATEGORIA[item.categoria]}</div>`;
  }
  return `<div class="selo">${SELO_TIPO[item.tipo] || SELO_TIPO.nota}</div>`;
}

/* Frases de exemplo: aparecem ao tocar na caixa vazia e um toque preenche. */
function exemplos() {
  const base = [
    ['💸', 'paguei 45 no almoço'],
    ['📅', 'preciso estar às duas da tarde no médico'],
    ['✅', 'lembrar de pagar a luz amanhã'],
    ['💰', 'recebi 300 de serviço'],
    ['📝', 'anotar: senha do wi-fi é prumo123']
  ];
  if (Avisos.nativo) base.splice(3, 0, ['⏰', 'me acorda às 6h']);
  return base;
}

function sugestoesHTML() {
  return '<div class="sugestoes">' + exemplos().map(([e, f]) =>
    `<button type="button" class="sugestao" data-acao="sugestao" data-frase="${esc(f)}">${e} ${esc(f)}</button>`).join('') + '</div>';
}

/* ---------- ajudantes ---------- */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function dataDe(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); }

function diasAte(iso) {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.round((dataDe(iso) - h) / 86400000);
}

function fmtMoeda(n) {
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* Só o número, sem o "R$ ". Usado onde o rótulo já diz que é dinheiro. */
function fmtMoedaNua(n) {
  return fmtMoeda(n).replace(/^R\$[\s\u00a0]*/, '');
}

function fmtDataCurta(iso) {
  if (!iso) return '';
  const d = diasAte(iso), dt = dataDe(iso);
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return 'ontem';
  if (d > 1 && d < 7) return DIA_CURTO[dt.getDay()];
  if (dt.getFullYear() !== new Date().getFullYear()) return dt.getDate() + ' ' + MES_CURTO[dt.getMonth()] + ' ' + dt.getFullYear();
  return dt.getDate() + ' ' + MES_CURTO[dt.getMonth()];
}

function fmtDataLonga(iso) {
  const d = diasAte(iso), dt = dataDe(iso);
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d === -1) return 'Ontem';
  const base = DIA_LONGO[dt.getDay()] + ', ' + dt.getDate() + ' de ' + NOMES_MES[dt.getMonth()];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function eAtrasado(i) {
  if (i.feito || !i.data) return false;
  if (i.tipo !== 'tarefa' && i.tipo !== 'compromisso') return false;
  return i.data < hojeISO();
}

function ordemAgenda(a, b) {
  return (a.data || '').localeCompare(b.data || '') || (a.hora || '99:99').localeCompare(b.hora || '99:99');
}

/* ---------- meses, parcelas e contas fixas ---------- */

function chaveMes(ano, mes) { return ano + '-' + String(mes + 1).padStart(2, '0'); }

/* Mesmo dia, n meses depois. Dia 31 em mês curto vira o último dia do mês. */
function somarMeses(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const alvo = new Date(a, m - 1 + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimo));
  return paraISO(alvo);
}

function mesCurtoAno(iso) {
  const [a, m] = iso.split('-').map(Number);
  return MES_CURTO[m - 1] + '/' + a;
}

function vencimentoFixa(fixa, ano, mes) {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  return paraISO(new Date(ano, mes, Math.min(fixa.dia, ultimo)));
}

/* Situação de cada conta fixa num mês: quando vence e se já foi paga. */
function fixasDoMes(ano, mes) {
  const ym = chaveMes(ano, mes);
  return Dados.fixas().filter(f => (f.desde || '') <= ym).map(f => ({
    fixa: f, ym, venc: vencimentoFixa(f, ano, mes),
    pago: Dados.itens().find(i => i.fixaId === f.id && i.data && i.data.startsWith(ym)) || null
  })).sort((a, b) => a.venc.localeCompare(b.venc));
}

/* "Paguei": vira um lançamento normal, ligado à conta fixa. */
function pagarFixa(fixaId, ym) {
  const f = Dados.fixas().find(x => x.id === fixaId);
  if (!f) return null;
  const h = hojeISO();
  const [a, m] = ym.split('-').map(Number);
  const data = h.startsWith(ym) ? h : vencimentoFixa(f, a, m - 1);
  return Dados.adicionar({ tipo: f.tipo, titulo: f.titulo, texto: f.titulo, valor: f.valor,
    categoria: f.categoria, data, hora: null, feito: false, fixaId: f.id });
}

/* "TV 1.200 em 10x": dez lançamentos, um por mês, ligados pelo mesmo grupo.
   Centavos que sobram da divisão vão para a última parcela. */
/* Compra parcelada: no mês da compra fica o registro da COMPRA, com o valor
   cheio (só para lembrar; não soma no "Saiu", senão o dinheiro contaria duas
   vezes). As parcelas começam no mês seguinte, como na fatura do cartão.
   Devolve só as parcelas; a compra fica em criados.compra. */
function criarParcelas(item) {
  const n = item.parcelas, total = item.valor;
  const base = Math.floor(total / n * 100) / 100;
  const grupo = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const inicio = item.data || hojeISO();
  const compra = Object.assign({}, item, { valor: total, data: inicio, grupo, compra: n });
  delete compra.parcelas; delete compra.todoDia;
  const salvaCompra = Dados.adicionar(compra);
  const criados = [];
  for (let k = 0; k < n; k++) {
    const valor = k === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base;
    const p = Object.assign({}, item, { valor, data: somarMeses(inicio, k + 1), grupo, parcela: (k + 1) + '/' + n });
    delete p.parcelas; delete p.todoDia;
    criados.push(Dados.adicionar(p));
  }
  criados.compra = salvaCompra;
  return criados;
}

/* Entra nas somas de dinheiro? O registro da compra parcelada não (as parcelas sim). */
function somaNoTotal(i) { return !i.compra; }

/* A linha de explicação embaixo dos campos, na confirmação. */
function dicaDinheiro(item) {
  if (item.todoDia) {
    return '🔁 Conta fixa: aparece todo mês em Dinheiro' + (Avisos.nativo ? ', com aviso' : ' e em Hoje') + ' no dia ' + item.todoDia + '.';
  }
  if (item.parcelas >= 2 && item.valor) {
    const inicio = item.data || hojeISO();
    return '➗ Compra de ' + fmtMoeda(item.valor) + ' em ' + mesCurtoAno(inicio) + '; ' + item.parcelas + ' × ' +
           fmtMoeda(item.valor / item.parcelas) + ', de ' + mesCurtoAno(somarMeses(inicio, 1)) + ' a ' +
           mesCurtoAno(somarMeses(inicio, item.parcelas)) + '.';
  }
  return '';
}

/* ---------- estado da interface ---------- */

const App = {
  aba: 'hoje',
  rascunho: null,
  recado: null,
  recadoTexto: null,
  revisao: null,
  busca: null,
  mostrarPassados: false,
  mesRef: { ano: new Date().getFullYear(), mes: new Date().getMonth() }
};

/* ---------- ícones das abas ---------- */

const ICONES = {
  hoje: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="13" rx="2.5"/><path d="M2 10.5h20"/><circle cx="17" cy="15" r="1.3"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tarefas: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 12.5l2.8 2.8L16.5 9.6"/>'
};

function svg(nome) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
         'stroke-linecap="round" stroke-linejoin="round">' + ICONES[nome] + '</svg>';
}

/* ---------- caixa de entrada e confirmação ---------- */

function aoEnviar(evento) {
  evento.preventDefault();
  const campo = document.getElementById('campoEntrada');
  const texto = campo.value.trim();
  if (!texto) return;
  App.recado = null;
  App.rascunho = Avisos.ajustarAlarme(interpretar(texto, { aprendidas: Dados.carregar().aprendidas }));
  App.rascunho.categoriaOriginal = App.rascunho.categoria;
  renderConfirma();
  campo.blur();
}

function categoriasDe(tipo) {
  const base = tipo === 'receita' ? Object.keys(CATEGORIAS_RECEITA) : Object.keys(CATEGORIAS);
  return base.concat(['Outros']);
}

function camposHTML(item, p) {
  const temValor = item.tipo === 'gasto' || item.tipo === 'receita';
  const temHora = item.tipo === 'compromisso';
  const temData = item.tipo !== 'nota';
  let h = '<div class="campos">';
  h += `<div class="campo"><label for="${p}titulo">O quê</label>
        <input id="${p}titulo" type="text" value="${esc(item.titulo)}"></div>`;
  if (temValor) {
    h += `<div class="campo"><label for="${p}valor">${item.parcelas ? 'Total' : 'Valor'}</label>
          <input id="${p}valor" type="text" inputmode="decimal" value="${item.valor == null ? '' : String(item.valor).replace('.', ',')}"></div>`;
    const cats = categoriasDe(item.tipo);
    h += `<div class="campo"><label for="${p}categoria">Categoria</label><select id="${p}categoria">` +
         cats.map(c => `<option value="${esc(c)}"${c === item.categoria ? ' selected' : ''}>${esc(c)}</option>`).join('') +
         '</select></div>';
    if (p === 'c_') {
      if (item.parcelas != null && item.tipo === 'gasto') {
        h += `<div class="campo"><label for="c_parcelas">Parcelas</label>
              <input id="c_parcelas" type="number" inputmode="numeric" min="2" max="72" value="${item.parcelas || ''}"></div>`;
      }
      if (item.todoDia != null) {
        h += `<div class="campo"><label for="c_todoDia">Todo dia</label>
              <input id="c_todoDia" type="number" inputmode="numeric" min="1" max="31" value="${item.todoDia || ''}"></div>`;
      }
      const dica = dicaDinheiro(item);
      h += `<div class="dica" id="c_dica"${dica ? '' : ' hidden'}>${esc(dica)}</div>`;
      if (item.parcelas == null && item.todoDia == null) {
        h += `<div class="extras">${item.tipo === 'gasto' ? '<button type="button" class="mini" data-acao="add-parcelas">➗ Parcelar</button>' : ''}
              <button type="button" class="mini" data-acao="add-fixa">🔁 Repete todo mês</button></div>`;
      }
    }
  }
  if (temData && !(temValor && item.todoDia != null && p === 'c_')) {
    h += `<div class="campo"><label for="${p}data">Quando</label>
          <input id="${p}data" type="date" value="${item.data || ''}"></div>`;
  }
  if (temHora) {
    h += `<div class="campo"><label for="${p}hora">Hora</label>
          <input id="${p}hora" type="time" value="${item.hora || ''}"></div>`;
    if (item.repetir || p === 'e_') h += camposRepetir(item, p);
    else if (item.hora) h += `<div class="extras"><button type="button" class="mini" data-acao="add-repetir">🔁 Lembrar várias vezes</button></div>`;
    if (Avisos.nativo) {
      h += `<label class="campo-alarme"><input id="${p}alarme" type="checkbox"${item.alarme ? ' checked' : ''}>
            <span>⏰ Tocar como <strong>alarme</strong> (som até você parar)</span></label>`;
    }
  }
  return h + '</div>';
}

/* "Lembrar a cada" + "Até": a série de avisos de um compromisso. */
const OPCOES_CADA = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180];
function camposRepetir(item, p) {
  const cada = item.repetir ? item.repetir.cada : 0;
  const opcoes = OPCOES_CADA.indexOf(cada) < 0 ? OPCOES_CADA.concat([cada]).sort((a, b) => a - b) : OPCOES_CADA;
  const ate = item.repetir ? item.repetir.ate.slice(11, 16) : '';
  return `<div class="campo"><label for="${p}cada">Lembrar a cada</label><select id="${p}cada">` +
    opcoes.map(n => `<option value="${n}"${n === cada ? ' selected' : ''}>${n ? rotuloCada(n) : 'Só uma vez'}</option>`).join('') +
    `</select></div>` +
    `<div class="campo" id="${p}ateCampo"${cada ? '' : ' hidden'}><label for="${p}ate">Até</label><input id="${p}ate" type="time" value="${ate}"></div>`;
}

/* Fim da série: no dia do primeiro aviso; se a hora do fim for antes do começo, é no dia seguinte. */
function fimDaSerie(data, hora, ate, cada) {
  const [a, m, d] = data.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  const ini = new Date(a, m - 1, d, h, mi);
  let fim;
  if (ate) {
    const [ah, am] = ate.split(':').map(Number);
    fim = new Date(a, m - 1, d, ah, am);
    if (fim <= ini) fim.setDate(fim.getDate() + 1);
  } else fim = new Date(ini.getTime() + Math.max(180, cada * 3) * 60000);
  const p = n => String(n).padStart(2, '0');
  return fim.getFullYear() + '-' + p(fim.getMonth() + 1) + '-' + p(fim.getDate()) + 'T' + p(fim.getHours()) + ':' + p(fim.getMinutes());
}

function lerCampos(item, p) {
  const pega = id => document.getElementById(p + id);
  const novo = Object.assign({}, item);
  novo.titulo = (pega('titulo') ? pega('titulo').value.trim() : item.titulo) || 'Sem título';
  if (pega('valor')) {
    const v = numeroBR(pega('valor').value.replace(/[^\d.,]/g, ''));
    novo.valor = v;
  } else novo.valor = null;
  novo.categoria = pega('categoria') ? pega('categoria').value : null;
  novo.data = pega('data') ? (pega('data').value || null) : null;
  novo.hora = pega('hora') ? (pega('hora').value || null) : null;
  if (pega('parcelas')) { const n = parseInt(pega('parcelas').value, 10); novo.parcelas = n >= 2 ? Math.min(n, 72) : 0; }
  if (pega('todoDia')) { const d = parseInt(pega('todoDia').value, 10); novo.todoDia = d >= 1 && d <= 31 ? d : 0; }
  if (pega('todoDia') && item.data) novo.data = item.data;   // conta fixa esconde a data, mas não a perde
  if (pega('cada')) {
    const cada = parseInt(pega('cada').value, 10) || 0;
    if (cada && novo.data && novo.hora) {
      novo.repetir = { cada, ate: fimDaSerie(novo.data, novo.hora, pega('ate') ? pega('ate').value : '', cada) };
      novo.naHora = true;
    } else novo.repetir = null;
  }
  if (pega('alarme')) novo.alarme = !!pega('alarme').checked;
  else if (novo.tipo !== 'compromisso') delete novo.alarme;
  return novo;
}

function renderConfirma() {
  const alvo = document.getElementById('confirma');
  // Com a confirmação aberta o topo deixa de ser fixo: em celular pequeno ela
  // é mais alta que a tela, e o "Guardar" ficava preso atrás das abas.
  if (document.body && document.body.classList) document.body.classList.toggle('confirmando', !!App.rascunho);
  if (!App.rascunho) {
    alvo.innerHTML = App.recado ? recadoHTML()
      : App.recadoTexto ? `<div class="recado"><div class="recado-texto">${esc(App.recadoTexto)}</div>
          <button class="icone-botao" data-acao="fechar-recado" aria-label="Dispensar">✕</button></div>` : '';
    return;
  }
  const r = App.rascunho;
  const chips = Object.keys(TIPOS).map(t =>
    `<button type="button" class="chip${t === r.tipo ? ' ativo' : ''}" data-acao="tipo" data-tipo="${t}">${TIPOS[t].nome}</button>`
  ).join('');
  alvo.innerHTML = `<div class="confirma">
      <div class="confirma-cabeca">${seloHTML(r).replace('class="selo', 'data-tipo="' + r.tipo + '" class="selo')}
        <div><strong>Entendi assim</strong><br><span>Confira, mude o tipo se precisar, e guarde.</span></div></div>
      <div class="confirma-tipos">${chips}</div>
      ${camposHTML(r, 'c_')}
      <div class="acoes">
        <button type="button" data-acao="cancelar">Cancelar</button>
        <button type="button" class="principal" data-acao="salvar">Guardar</button>
      </div>
    </div>`;
}

/* O Prumo não toca alarme sozinho — quem avisa é o calendário do celular.
   Por isso, ao guardar algo com data, o caminho para o aviso aparece na hora. */
/* "Guardado. Avisos hoje às 13:00 e às 13:30." — os horários do mesmo dia não repetem o dia. */
function avisosGuardado(lista) {
  if (lista.length < 2) return 'Guardado. Aviso ' + fmtQuandoAviso(lista[0]) + '.';
  const partes = lista.map(fmtQuandoAviso);
  const dia = partes[0].split(' às ')[0];
  const resto = partes.slice(1).map(p => p.startsWith(dia + ' às ') ? 'às ' + p.split(' às ')[1] : p);
  return 'Guardado. Avisos ' + partes[0] + (resto.length > 1 ? ', ' + resto.slice(0, -1).join(', ') : '') + ' e ' + resto[resto.length - 1] + '.';
}

function recadoHTML() {
  if (Avisos.nativo) {
    // App Android: o próprio Prumo avisa. Só conta quando vai tocar.
    const item = Dados.itens().find(i => i.id === App.recado);
    const quando = item && Avisos.quando(item);
    const texto = !quando ? 'Guardado. A hora do aviso já passou.'
      : (Avisos.permitido === false && !item.alarme) ? 'Guardado, mas os avisos estão bloqueados no Android.'
      : item.repetir ? 'Guardado. ' + (item.alarme ? 'Alarme' : 'Aviso') + ' a cada ' + rotuloCada(item.repetir.cada) +
          ', ' + fmtQuandoAviso(quando).replace(' às ', ' das ') + ' até as ' + item.repetir.ate.slice(11, 16) + '.'
      : item.alarme ? 'Guardado. Alarme ' + fmtQuandoAviso(quando) + '.'
      : avisosGuardado(Avisos.horarios(item));
    const botao = (Avisos.permitido === false && !(item && item.alarme))
      ? `<button class="mini" data-acao="permitir-avisos">Liberar avisos</button>`
      : (item && item.alarme && quando && !Avisos.sobrepor)
      ? `<button class="mini" data-acao="sobrepor">Liberar tela do alarme</button>` : '';
    return `<div class="recado">
      <div class="recado-texto">${esc(texto)}</div>
      ${botao}
      <button class="icone-botao" data-acao="fechar-recado" aria-label="Dispensar">✕</button>
    </div>`;
  }
  return `<div class="recado">
      <div class="recado-texto">${(() => {
        const it = Dados.itens().find(i => i.id === App.recado);
        if (!it || !it.repetir || !it.hora) return 'Guardado. Quer ser avisado na hora?';
        const n = Math.min(48, Math.floor((new Date(it.repetir.ate) - dataHoraDe(it)) / (it.repetir.cada * 60000)) + 1);
        return 'Guardado. Quer os ' + n + ' avisos (a cada ' + esc(rotuloCada(it.repetir.cada)) + ') no Calendário?';
      })()}</div>
      <button class="mini" data-acao="calendario" data-id="${App.recado}">Pôr no calendário</button>
      <button class="icone-botao" data-acao="fechar-recado" aria-label="Dispensar">✕</button>
    </div>`;
}

function trocarTipo(tipo) {
  App.rascunho = lerCampos(App.rascunho, 'c_');
  App.rascunho.tipo = tipo;
  if ((tipo === 'gasto' || tipo === 'receita')) {
    if (!App.rascunho.categoria) App.rascunho.categoria = acharCategoria(App.rascunho.texto, Dados.carregar().aprendidas, tipo === 'receita') || 'Outros';
    if (!App.rascunho.data) App.rascunho.data = hojeISO();
  }
  if (tipo === 'compromisso' && !App.rascunho.data) App.rascunho.data = hojeISO();
  renderConfirma();
}

function salvarRascunho() {
  const item = lerCampos(App.rascunho, 'c_');
  if ((item.tipo === 'gasto' || item.tipo === 'receita') && !item.valor) {
    alert('Falta o valor.'); return;
  }
  // Você corrigiu a categoria? O app guarda a palavra e acerta na próxima.
  if (item.categoria && App.rascunho.categoriaOriginal && item.categoria !== App.rascunho.categoriaOriginal) {
    Dados.aprender(item.texto, item.categoria);
  }
  delete item.categoriaOriginal;
  const dinheiro = item.tipo === 'gasto' || item.tipo === 'receita';

  // Conta fixa: não vira lançamento agora — vira uma conta que volta todo mês.
  if (dinheiro && item.todoDia) {
    const h = hojeISO();
    // O dia deste mês já passou? Começa a contar no mês que vem.
    const desde = +h.slice(8, 10) > item.todoDia ? somarMeses(h.slice(0, 8) + '01', 1).slice(0, 7) : h.slice(0, 7);
    Dados.adicionarFixa({ tipo: item.tipo, titulo: item.titulo, valor: item.valor,
      categoria: item.categoria, dia: item.todoDia, desde });
    App.recadoTexto = 'Conta fixa criada: todo dia ' + item.todoDia +
      (desde !== h.slice(0, 7) ? ', a partir de ' + NOMES_MES[+desde.slice(5, 7) - 1] : '') + '.';
    return depoisDeGuardar('dinheiro');
  }
  if (item.tipo === 'gasto' && item.parcelas >= 2) {
    const criados = criarParcelas(item);
    App.recadoTexto = 'Compra de ' + fmtMoeda(item.valor) + ' guardada. ' + criados.length + ' parcelas de ' +
      fmtMoeda(criados[0].valor) + ', de ' + mesCurtoAno(criados[0].data) + ' a ' +
      mesCurtoAno(criados[criados.length - 1].data) + '.';
    return depoisDeGuardar('dinheiro');
  }
  delete item.parcelas; delete item.todoDia;
  const salvo = Dados.adicionar(item);
  App.recado = (salvo.data && (salvo.tipo === 'tarefa' || salvo.tipo === 'compromisso'))
    ? salvo.id : null;
  App.recadoTexto = null;
  depoisDeGuardar(dinheiro ? 'dinheiro' : item.tipo === 'compromisso' ? 'agenda' : item.tipo === 'tarefa' ? 'tarefas' : App.aba);
}

function depoisDeGuardar(aba) {
  App.rascunho = null;
  document.getElementById('campoEntrada').value = '';
  App.aba = aba;
  App.mesRef = { ano: new Date().getFullYear(), mes: new Date().getMonth() };
  render();
}

/* ---------- um item na lista ---------- */

function itemHTML(item, op) {
  op = op || {};
  const atrasado = eAtrasado(item);
  const classes = ['item'];
  if (atrasado) classes.push('atrasado');
  if (item.feito) classes.push('feito');

  let marcador = '';
  if (op.marcador) {
    marcador = `<button class="marcador${item.feito ? ' marcado' : ''}" data-acao="feito" data-id="${item.id}" aria-label="Marcar como feito">
      ${item.feito ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>' : ''}
    </button>`;
  }

  const info = [];
  if (op.mostrarData && item.data) info.push(esc(fmtDataCurta(item.data)));
  if (item.hora) info.push(esc(item.hora));
  if (item.categoria && op.mostrarCategoria !== false) info.push(esc(item.categoria));
  if (item.parcela) info.push('parcela ' + esc(item.parcela));
  if (item.compra) info.push('🛍️ compra em ' + item.compra + 'x · 1ª parcela em ' + esc(NOMES_MES[+somarMeses(item.data, 1).slice(5, 7) - 1].toLowerCase()));
  if (item.fixaId) info.push('🔁 conta fixa');
  if (atrasado) info.push('<span class="destaque">atrasado</span>');

  let valor = '';
  if (item.valor != null) {
    const entrada = item.tipo === 'receita';
    valor = item.compra
      // Compra parcelada: valor cheio só de lembrete (quem soma são as parcelas).
      ? `<div class="valor compra" title="Não soma no mês: quem soma são as parcelas">${esc(fmtMoeda(item.valor).replace('R$ ', ''))}<small>em ${item.compra}x</small></div>`
      : `<div class="valor ${entrada ? 'entrou' : 'saiu'}">${entrada ? '+' : '−'} ${esc(fmtMoeda(item.valor).replace('R$ ', ''))}</div>`;
  }

  if (Avisos.nativo && op.calendario && Avisos.quando(item)) info.push((item.alarme ? '⏰ ' : '🔔 ') + esc(fmtQuandoAviso(Avisos.quando(item))));
  if (item.repetir && !item.feito && (!Avisos.nativo || Avisos.quando(item))) info.push('🔁 a cada ' + esc(rotuloCada(item.repetir.cada)) + ' até ' + esc(item.repetir.ate.slice(11, 16)));
  const calendario = (!Avisos.nativo && op.calendario && item.data && !item.feito && item.id !== App.recado)
    ? `<button class="mini" data-acao="calendario" data-id="${item.id}">Pôr no calendário</button>` : '';

  // Com marcador (tarefas, lista de hoje) a bolinha de "feito" faz o papel do selo.
  const selo = marcador ? '' : seloHTML(item);
  // A hora já está dentro do selo do compromisso: não repete embaixo do título.
  if (item.hora && !marcador && item.tipo === 'compromisso' && info.indexOf(esc(item.hora)) >= 0) info.splice(info.indexOf(esc(item.hora)), 1);

  return `<div class="${classes.join(' ')}" data-tipo="${esc(item.tipo)}">
    ${marcador}${selo}
    <div class="item-corpo" data-acao="abrir" data-id="${item.id}">
      <div class="item-titulo">${esc(item.titulo)}</div>
      ${info.length ? `<div class="item-info">${info.join('<span>·</span>')}</div>` : ''}
      ${calendario}
    </div>
    ${valor}
  </div>`;
}

function fixaHTML(x) {
  const f = x.fixa, h = hojeISO();
  const entrada = f.tipo === 'receita';
  const dia = +x.venc.slice(8, 10);
  let info;
  if (x.pago) info = '✓ ' + (entrada ? 'recebido' : 'pago') + ' dia ' + (+x.pago.data.slice(8, 10));
  else if (x.venc < h) info = '<span class="destaque">venceu dia ' + dia + '</span>';
  else if (x.venc === h) info = '<span class="destaque">vence hoje</span>';
  else info = 'vence dia ' + dia;
  return `<div class="item fixa${x.pago ? ' feito-fixa' : ''}" data-tipo="${f.tipo}">
    ${seloHTML({ tipo: f.tipo, categoria: f.categoria })}
    <div class="item-corpo" data-acao="editar-fixa" data-id="${f.id}">
      <div class="item-titulo">${esc(f.titulo)}</div>
      <div class="item-info">🔁 ${info}</div>
    </div>
    <div class="fixa-lado">
      <div class="valor ${entrada ? 'entrou' : 'saiu'}">${entrada ? '+' : '−'} ${esc(fmtMoedaNua(f.valor))}</div>
      ${x.pago ? '' : `<button class="mini" data-acao="pagar-fixa" data-id="${f.id}" data-ym="${x.ym}">${entrada ? 'Recebi' : 'Paguei'}</button>`}
    </div>
  </div>`;
}

function listaHTML(itens, op) {
  return '<div class="lista">' + itens.map(i => itemHTML(i, op)).join('') + '</div>';
}

function secao(titulo, itens, op) {
  if (!itens.length) return '';
  const alerta = titulo === 'Atrasado' ? ' alerta' : '';
  return `<div class="secao-titulo${alerta}">${esc(titulo)} <span class="conta">${itens.length}</span></div>` + listaHTML(itens, op);
}

function vazio(titulo, texto, arte, comExemplos) {
  return `<div class="vazio"><div class="vazio-arte">${arte || '🌿'}</div>
    <strong>${esc(titulo)}</strong><p>${esc(texto)}</p>${comExemplos ? sugestoesHTML() : ''}</div>`;
}

/* ---------- telas ---------- */

/* "🧹 N coisas ficaram para trás": abre a revisão (aparece no alto da aba Tarefas). */
function bannerRevisao() {
  const n = Dados.itens().filter(eAtrasado).length;
  if (!n) return '';
  return `<button class="revisao-banner" data-acao="revisao">
        <span class="revisao-banner-icone">🧹</span>
        <span class="revisao-banner-texto"><strong>${n} ${n === 1 ? 'coisa ficou' : 'coisas ficaram'} para trás</strong>
        <span>Arrume em 20 segundos: feito, adiar ou apagar</span></span>
        <span class="revisao-banner-seta">›</span></button>`;
}

function telaHoje() {
  // Com a esfera ligada, a tela Hoje é SÓ a esfera (pedido dele, 24/11/2026):
  // gastos ficam em Dinheiro, compromissos na Agenda, tarefas e atrasados em Tarefas.
  // O resumo abaixo só aparece para quem desligou a esfera nos Ajustes.
  if (Esfera.ligada()) return '';
  const itens = Dados.itens();
  const h = hojeISO();
  const atrasados = itens.filter(eAtrasado).sort(ordemAgenda);
  const deHoje = itens.filter(i => i.data === h && !i.feito && (i.tipo === 'compromisso' || i.tipo === 'tarefa')).sort(ordemAgenda);
  const semPrazo = itens.filter(i => i.tipo === 'tarefa' && !i.data && !i.feito).slice(0, 6);
  const gastosHoje = itens.filter(i => i.tipo === 'gasto' && i.data === h);
  const somaHoje = gastosHoje.filter(somaNoTotal).reduce((s, i) => s + (i.valor || 0), 0);
  const agora = new Date();
  const contas = fixasDoMes(agora.getFullYear(), agora.getMonth()).filter(x => !x.pago && x.venc <= h);

  if (!atrasados.length && !deHoje.length && !semPrazo.length && !gastosHoje.length && !contas.length) {
    // Com a esfera na tela, o dia vazio é só ela, no centro (pedido dele, 23/11/2026).
    if (Esfera.ligada()) return '';
    if (!itens.length) {
      return vazio('Tudo no prumo', 'Escreva ou fale na caixa lá em cima, do jeito que você falaria com alguém. Toque num exemplo para experimentar:', '🧭', true);
    }
    return vazio('Nada para hoje', 'Sem compromisso, sem atraso e sem gasto lançado hoje.', '☀️');
  }

  // Resumo do dia: três números grandes que levam para a aba certa.
  const compHoje = deHoje.filter(i => i.tipo === 'compromisso').length;
  const pendentes = itens.filter(i => i.tipo === 'tarefa' && !i.feito).length;
  let h2 = `<div class="dia">
      <button class="dia-caixa" data-tipo="compromisso" data-acao="ir-aba" data-aba="agenda"><span class="n">${compHoje}</span><span class="r">compromisso${compHoje === 1 ? '' : 's'} hoje</span></button>
      <button class="dia-caixa" data-tipo="tarefa" data-acao="ir-aba" data-aba="tarefas"><span class="n">${pendentes}</span><span class="r">tarefa${pendentes === 1 ? '' : 's'} a fazer</span></button>
      <button class="dia-caixa" data-tipo="gasto" data-acao="ir-aba" data-aba="dinheiro"><span class="n">${esc(fmtMoedaNua(somaHoje).replace(/,00$/, ''))}</span><span class="r">gasto hoje</span></button>
    </div>`;
  h2 += bannerRevisao();
  if (contas.length) {
    h2 += `<div class="secao-titulo alerta">Contas para pagar <span class="conta">${contas.length}</span></div>` +
          '<div class="lista">' + contas.map(fixaHTML).join('') + '</div>';
  }
  h2 += secao('Atrasado', atrasados, { marcador: true, mostrarData: true, calendario: false });
  h2 += secao('Hoje', deHoje, { marcador: true, calendario: true });
  if (somaHoje > 0) {
    h2 += `<div class="secao-titulo">Gasto de hoje <span class="conta">${esc(fmtMoeda(somaHoje))}</span></div>` +
          listaHTML(gastosHoje, {});
  }
  h2 += secao('Sem prazo', semPrazo, { marcador: true });
  return h2;
}

function telaDinheiro() {
  const { ano, mes } = App.mesRef;
  const prefixo = chaveMes(ano, mes);
  const h = hojeISO();
  const doMes = Dados.itens()
    .filter(i => (i.tipo === 'gasto' || i.tipo === 'receita') && i.data && i.data.startsWith(prefixo))
    .sort((a, b) => b.data.localeCompare(a.data));
  // Lançado com data futura (parcelas que ainda vêm) não "saiu" ainda: vai sair.
  const feitos = doMes.filter(i => i.data <= h);
  const previstos = doMes.filter(i => i.data > h).sort((a, b) => a.data.localeCompare(b.data));
  const fixas = prefixo >= h.slice(0, 7) ? fixasDoMes(ano, mes) : [];
  const abertas = fixas.filter(x => !x.pago);

  const soma = (lista, tipo) => lista.filter(i => i.tipo === tipo && somaNoTotal(i)).reduce((t, i) => t + (i.valor || 0), 0);
  const somaFixas = tipo => abertas.filter(x => x.fixa.tipo === tipo).reduce((t, x) => t + (x.fixa.valor || 0), 0);
  const saiu = soma(feitos, 'gasto'), entrou = soma(feitos, 'receita');
  const vaiSair = soma(previstos, 'gasto') + somaFixas('gasto');
  const vaiEntrar = soma(previstos, 'receita') + somaFixas('receita');
  const saldo = entrou - saiu, fimDoMes = saldo + vaiEntrar - vaiSair;

  const previsao = (vaiSair || vaiEntrar) ? `<div class="previsao">
      ${vaiSair ? `<span>Ainda vai sair <b>${esc(fmtMoeda(vaiSair))}</b></span>` : ''}
      ${vaiEntrar ? `<span>Ainda vai entrar <b>${esc(fmtMoeda(vaiEntrar))}</b></span>` : ''}
      <span>No fim do mês <b>${fimDoMes < 0 ? '−' : ''}${esc(fmtMoeda(Math.abs(fimDoMes)))}</b></span>
    </div>` : '';

  let html = `<div class="mes">
      <button class="icone-botao" data-acao="mes" data-passo="-1" aria-label="Mês anterior">‹</button>
      <div class="mes-nome">${NOMES_MES[mes]} ${ano}</div>
      <button class="icone-botao" data-acao="mes" data-passo="1" aria-label="Próximo mês">›</button>
    </div>
    <div class="resumo">
      <div class="caixa caixa-saldo${saldo < 0 ? ' negativo' : ''}"><div class="rotulo">${saldo < 0 ? 'Faltou no mês' : 'Sobrou no mês'}</div><div class="numero"><small>R$</small>${esc(fmtMoedaNua(Math.abs(saldo)))}</div>${previsao}</div>
      <div class="caixa"><div class="rotulo"><span class="seta entrou">↑</span>Entrou</div><div class="numero entrou">${esc(fmtMoedaNua(entrou))}</div></div>
      <div class="caixa"><div class="rotulo"><span class="seta saiu">↓</span>Saiu</div><div class="numero saiu">${esc(fmtMoedaNua(saiu))}</div></div>
    </div>`;

  if (!doMes.length && !fixas.length) {
    return html + vazio('Mês em branco', 'Nada lançado neste mês. Experimente escrever "paguei 30 de gasolina" ou "aluguel 900 todo dia 5".', '🪙');
  }

  if (fixas.length) {
    html += `<div class="secao-titulo">Contas fixas <span class="conta">${abertas.length ? abertas.length + ' a pagar' : 'tudo pago'}</span></div>` +
            '<div class="lista">' + fixas.map(fixaHTML).join('') + '</div>';
  }
  if (previstos.length) {
    html += `<div class="secao-titulo">Ainda vai ${previstos.every(i => i.tipo === 'receita') ? 'entrar' : 'sair'} <span class="conta">${previstos.length}</span></div>` +
            listaHTML(previstos, { mostrarData: true });
  }

  const porCategoria = {};
  feitos.filter(i => i.tipo === 'gasto' && somaNoTotal(i)).forEach(i => {
    const c = i.categoria || 'Outros';
    porCategoria[c] = (porCategoria[c] || 0) + (i.valor || 0);
  });
  const ordenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  if (ordenadas.length) {
    const maior = ordenadas[0][1];
    const cores = ['#e0565b', '#e8893a', '#d9b026', '#4fae6a', '#2f9e9a', '#3f7fd9', '#7a5cd6', '#c4569b'];
    html += '<div class="secao-titulo">Onde foi o dinheiro</div>';
    html += ordenadas.map(([c, v], n) => `<div class="barra-linha" style="--cor:${cores[n % cores.length]}">
        <div class="selo" style="background:color-mix(in srgb, ${cores[n % cores.length]} 15%, transparent)">${EMOJI_CATEGORIA[c] || '💸'}</div>
        <div class="barra-conteudo">
          <div class="barra-topo"><span>${esc(c)}</span><span>${esc(fmtMoeda(v))} · ${Math.round(v / saiu * 100)}%</span></div>
          <div class="barra-trilho"><div class="barra-cheia" style="width:${Math.max(3, Math.round(v / maior * 100))}%"></div></div>
        </div>
      </div>`).join('');
  }

  let diaAtual = null;
  feitos.forEach(i => {
    if (i.data !== diaAtual) {
      if (diaAtual !== null) html += '</div>';
      diaAtual = i.data;
      html += `<div class="secao-titulo">${esc(fmtDataLonga(i.data))}</div><div class="lista">`;
    }
    html += itemHTML(i, {});
  });
  if (diaAtual !== null) html += '</div>';
  return html;
}

function telaAgenda() {
  const h = hojeISO();
  const todos = Dados.itens().filter(i => i.tipo === 'compromisso' && i.data);
  const futuros = todos.filter(i => i.data >= h).sort(ordemAgenda);
  const passados = todos.filter(i => i.data < h).sort((a, b) => ordemAgenda(b, a));

  let saida = '';
  if (!futuros.length) saida += vazio('Agenda livre', 'Nenhum compromisso marcado daqui pra frente. Escreva, por exemplo, "reunião segunda 9h".', '📅');

  let diaAtual = null;
  futuros.forEach(i => {
    if (i.data !== diaAtual) {
      if (diaAtual !== null) saida += '</div>';
      diaAtual = i.data;
      saida += `<div class="secao-titulo">${esc(fmtDataLonga(i.data))}</div><div class="lista">`;
    }
    saida += itemHTML(i, { calendario: true });
  });
  if (diaAtual !== null) saida += '</div>';

  if (passados.length) {
    saida += `<div class="secao-titulo">Já passou</div>`;
    if (App.mostrarPassados) saida += listaHTML(passados.slice(0, 40), { mostrarData: true });
    else saida += `<button class="mini" data-acao="passados">Mostrar ${passados.length} anterior${passados.length > 1 ? 'es' : ''}</button>`;
  }
  return saida;
}

function telaTarefas() {
  const itens = Dados.itens().filter(i => i.tipo === 'tarefa' || i.tipo === 'nota');
  const atrasadas = itens.filter(eAtrasado).sort(ordemAgenda);
  const comPrazo = itens.filter(i => i.tipo === 'tarefa' && !i.feito && i.data && !eAtrasado(i)).sort(ordemAgenda);
  const semPrazo = itens.filter(i => i.tipo === 'tarefa' && !i.feito && !i.data);
  const notas = itens.filter(i => i.tipo === 'nota' && !i.feito);
  const feitas = itens.filter(i => i.feito).slice(0, 30);

  if (!itens.length) return bannerRevisao() + vazio('Nada pendente', 'Escreva "lembrar de…" ou "preciso…" e a tarefa aparece aqui.', '✅');

  let h = bannerRevisao();
  h += secao('Atrasado', atrasadas, { marcador: true, mostrarData: true });
  h += secao('Com prazo', comPrazo, { marcador: true, mostrarData: true, calendario: true });
  h += secao('Sem prazo', semPrazo, { marcador: true });
  h += secao('Anotações', notas, { marcador: true });
  h += secao('Feito', feitas, { marcador: true, mostrarData: true });
  return h;
}

function telaBusca() {
  const termo = semAcento(App.busca.trim());
  if (!termo) return vazio('Buscar', 'Digite algo para procurar em tudo que você já anotou.', '🔎');
  const achados = Dados.itens().filter(i =>
    semAcento(i.titulo + ' ' + (i.texto || '') + ' ' + (i.categoria || '')).includes(termo));
  if (!achados.length) return vazio('Nada encontrado', 'Nenhum registro com "' + App.busca.trim() + '".', '🤷');
  return `<div class="secao-titulo">${achados.length} resultado${achados.length > 1 ? 's' : ''}</div>` +
         listaHTML(achados.slice(0, 100), { mostrarData: true, marcador: false });
}

/* ---------- painéis ---------- */

function abrirPainel(html) {
  const p = document.getElementById('painel');
  p.innerHTML = `<div class="painel-fundo" data-acao="fundo"><div class="painel"><div class="puxador"></div>${html}</div></div>`;
}

function fecharPainel() { document.getElementById('painel').innerHTML = ''; App.subAjustes = null; }

function painelEditar(id) {
  const item = Dados.itens().find(i => i.id === id);
  if (!item) return;
  App.editando = id;
  const chips = Object.keys(TIPOS).map(t =>
    `<button type="button" class="chip${t === item.tipo ? ' ativo' : ''}" data-acao="tipo-editar" data-tipo="${t}" data-id="${id}">${TIPOS[t].nome}</button>`
  ).join('');
  abrirPainel(`<h2>Editar</h2>
    <div class="confirma-tipos">${chips}</div>
    ${camposHTML(item, 'e_')}
    ${item.parcela ? `<p>Parcela ${esc(item.parcela)}. Mudar aqui muda só esta parcela.</p>` : ''}
    ${item.compra ? `<p>Registro da compra em ${item.compra}x. Ele não soma no mês: quem soma são as parcelas, a partir do mês seguinte.</p>` : ''}
    ${item.grupo && !item.compra ? `<button class="opcao perigo" data-acao="excluir-grupo" data-id="${id}"><span class="op-icone">🗑️</span><div><div>Excluir a compra e todas as parcelas</div>
      <div class="desc">Apaga a compra e as ${Dados.itens().filter(i => i.grupo === item.grupo && i.parcela).length} parcelas.</div></div></button>` : ''}
    <div class="acoes">
      <button type="button" data-acao="excluir" data-id="${id}">${item.compra ? 'Excluir a compra' : item.grupo ? 'Excluir só esta' : 'Excluir'}</button>
      <button type="button" class="principal" data-acao="salvar-edicao" data-id="${id}">Salvar</button>
    </div>`);
}

function painelFixa(id) {
  const f = Dados.fixas().find(x => x.id === id);
  if (!f) return;
  const cats = categoriasDe(f.tipo);
  abrirPainel(`<h2>🔁 Conta fixa</h2>
    <div class="campos">
      <div class="campo"><label for="x_titulo">O quê</label><input id="x_titulo" type="text" value="${esc(f.titulo)}"></div>
      <div class="campo"><label for="x_valor">Valor</label><input id="x_valor" type="text" inputmode="decimal" value="${String(f.valor).replace('.', ',')}"></div>
      <div class="campo"><label for="x_categoria">Categoria</label><select id="x_categoria">${cats.map(c =>
        `<option value="${esc(c)}"${c === f.categoria ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="campo"><label for="x_dia">Todo dia</label><input id="x_dia" type="number" inputmode="numeric" min="1" max="31" value="${f.dia}"></div>
    </div>
    <p>Mudar o valor vale daqui para frente; o que já foi pago continua como estava.</p>
    <button class="opcao perigo" data-acao="excluir-fixa" data-id="${id}"><span class="op-icone">🗑️</span><div><div>Parar de repetir</div>
      <div class="desc">Apaga a conta fixa. Os pagamentos já lançados ficam.</div></div></button>
    <div class="acoes">
      <button type="button" data-acao="fechar">Cancelar</button>
      <button type="button" class="principal" data-acao="salvar-fixa" data-id="${id}">Salvar</button>
    </div>`);
}

/* ---------- revisão das coisas atrasadas: uma de cada vez ---------- */

function abrirRevisao() {
  App.revisao = { ids: Dados.itens().filter(eAtrasado).sort(ordemAgenda).map(i => i.id), i: 0, feitos: 0 };
  painelRevisao();
}

function painelRevisao() {
  const r = App.revisao;
  while (r.i < r.ids.length && !Dados.itens().some(x => x.id === r.ids[r.i] && eAtrasado(x))) r.i++;
  if (r.i >= r.ids.length) {
    return abrirPainel(`<div class="revisao-fim"><div class="vazio-arte">🎉</div>
      <h2>Tudo arrumado!</h2><p>${r.ids.length ? 'Nada mais ficou para trás. Bom trabalho.' : 'Não tem nada atrasado.'}</p>
      <div class="acoes"><button type="button" class="principal" data-acao="fechar-revisao">Fechar</button></div></div>`);
  }
  const item = Dados.itens().find(x => x.id === r.ids[r.i]);
  const dias = -diasAte(item.data);
  abrirPainel(`<div class="revisao-topo"><strong>Arrumar o que ficou para trás</strong><span>${r.i + 1} de ${r.ids.length}</span></div>
    <div class="revisao-barra"><div style="width:${Math.round(r.i / r.ids.length * 100)}%"></div></div>
    <div class="revisao-cartao" data-tipo="${item.tipo}">
      ${seloHTML(item)}
      <div class="revisao-titulo">${esc(item.titulo)}</div>
      <div class="item-info">era para ${esc(fmtDataCurta(item.data))}${item.hora ? ' às ' + esc(item.hora) : ''} · há ${dias} dia${dias === 1 ? '' : 's'}</div>
    </div>
    <div class="revisao-botoes">
      <button type="button" class="rev rev-feito" data-acao="rev" data-o="feito"><b>✓</b>Já fiz</button>
      <button type="button" class="rev" data-acao="rev" data-o="amanha"><b>→</b>Amanhã</button>
      <button type="button" class="rev" data-acao="rev" data-o="semana"><b>📅</b>Semana que vem</button>
      <button type="button" class="rev rev-apagar" data-acao="rev" data-o="apagar"><b>🗑</b>Apagar</button>
    </div>
    <button type="button" class="mini revisao-depois" data-acao="fechar-revisao">Depois eu vejo</button>`);
}

function responderRevisao(opcao) {
  const r = App.revisao;
  const id = r.ids[r.i];
  if (opcao === 'feito') Dados.atualizar(id, { feito: true });
  else if (opcao === 'amanha') Dados.atualizar(id, { data: paraISO(somarDias(new Date(), 1)) });
  else if (opcao === 'semana') Dados.atualizar(id, { data: paraISO(somarDias(new Date(), 7)) });
  else if (opcao === 'apagar') {
    const item = Dados.itens().find(i => i.id === id);
    if (item && item.compra && item.grupo) Dados.itens().filter(i => i.grupo === item.grupo).forEach(i => Dados.remover(i.id));
    else Dados.remover(id);
  }
  r.i++;
  painelRevisao();
}

/* ---------- Ajustes ----------
   Desde 23/11/2026 no padrão dos Ajustes de Android e iPhone: tela cheia com seta
   de voltar, grupos em cartões, cada linha com ícone colorido + nome curto + à
   direita o valor atual, uma chave liga/desliga ou uma seta. Texto longo fica
   em subpáginas ("Como usar o alarme", "Privacidade"). */

const ICONE_AJ = {
  esfera:   '<circle cx="12" cy="12" r="7.5"/><circle cx="9.5" cy="10" r=".9" fill="currentColor"/><circle cx="14" cy="13.5" r=".9" fill="currentColor"/><circle cx="12.5" cy="8.6" r=".7" fill="currentColor"/><circle cx="10" cy="14.6" r=".7" fill="currentColor"/>',
  sino:     '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  domingo:  '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M9.5 14.5l2 2 3.5-3.5"/>',
  testar:   '<path d="M8 5.5v13l10.5-6.5z"/>',
  alarme:   '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 1.6M4 5.5l3-2.5M20 5.5l-3-2.5"/>',
  info:     '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/>',
  tela:     '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  sobrepor: '<rect x="3" y="7" width="12" height="12" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4"/>',
  backup:   '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  restaurar:'<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16"/>',
  repetir:  '<path d="M4 11a7.5 7.5 0 0 1 13-4.5L19.5 9"/><path d="M19.5 4v5h-5"/><path d="M20 13a7.5 7.5 0 0 1-13 4.5L4.5 15"/><path d="M4.5 20v-5h5"/>',
  palavra:  '<path d="M4 19l5.5-14h1L16 19M6.2 14h7.6"/><path d="M17 9.5h3.5M17 13h3.5"/>',
  atualizar:'<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4.5v5h-5"/>',
  teste:    '<path d="M9.5 3.5h5M10.5 3.5v6L5 18.5A1.5 1.5 0 0 0 6.3 20.5h11.4A1.5 1.5 0 0 0 19 18.5L13.5 9.5v-6"/><path d="M7.5 15h9"/>',
  ajuda:    '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"/><circle cx="12" cy="17" r=".8" fill="currentColor"/>',
  instalar: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7.5v7M9.2 11.8L12 14.6l2.8-2.8"/>',
  cadeado:  '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  lixo:     '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  alerta:   '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".8" fill="currentColor"/>'
};
const COR_AJ = { rosa: '#ec4899', roxo: '#8b5cf6', azul: '#3b82f6', laranja: '#f97316', verde: '#22a55a',
                 cinza: '#64646f', vermelho: '#ef4444', amarelo: '#d99a06', ciano: '#0ea5b7' };

/* Uma linha de ajuste. o = { acao, icone, cor, titulo, sub, valor, chave (true/false), perigo, dados } */
function linhaAj(o) {
  const direita = o.chave !== undefined
    ? `<span class="chave${o.chave ? ' ligada' : ''}" aria-hidden="true"><span></span></span>`
    : `${o.valor ? `<span class="aj-valor">${esc(o.valor)}</span>` : ''}${o.seta === false ? '' : '<span class="aj-seta" aria-hidden="true">›</span>'}`;
  const papel = o.chave !== undefined ? ` role="switch" aria-checked="${o.chave ? 'true' : 'false'}"` : '';
  return `<button type="button" class="aj-linha${o.perigo ? ' perigo' : ''}" data-acao="${o.acao}"${o.dados || ''}${papel}>
      <span class="aj-icone" style="background:${COR_AJ[o.cor] || COR_AJ.cinza}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONE_AJ[o.icone] || ''}</svg></span>
      <span class="aj-texto"><span class="aj-titulo">${o.titulo}</span>${o.sub !== undefined ? `<span class="desc aj-sub">${o.sub}</span>` : ''}</span>
      ${direita}
    </button>`;
}
function grupoAj(titulo, linhas, rodape) {
  const l = linhas.filter(Boolean);
  if (!l.length) return '';
  return `${titulo ? `<div class="aj-cabeca">${titulo}</div>` : ''}<div class="aj-grupo">${l.join('')}</div>${rodape ? `<div class="aj-rodape">${rodape}</div>` : ''}`;
}

function rotuloMin(m) { return m === 0 ? 'Na hora' : m < 60 ? m + ' min antes' : m === 1440 ? '1 dia antes' : (m / 60) + ' h antes'; }
/* [60, 30] → "1 h e 30 min antes"; [0] → "Na hora". */
function rotuloAntes(lista) {
  const curto = m => m === 0 ? 'na hora' : m < 60 ? m + ' min' : m === 1440 ? '1 dia' : (m / 60) + ' h';
  const so = lista.filter(m => m > 0).map(curto);
  let t = so.length > 1 ? so.slice(0, -1).join(', ') + ' e ' + so[so.length - 1] : (so[0] || '');
  if (t) t += ' antes';
  if (lista.includes(0)) t = t ? t + ' e na hora' : 'Na hora';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function versaoApp() { return '1.' + Math.max(Miolo.versao || 0, (typeof Atualizacao !== 'undefined' && Atualizacao.instalado) || 0); }

/* Abre os Ajustes (ou uma subpágina deles) em tela cheia. */
function painelAjustes(sub) {
  if (typeof sub !== 'string') sub = '';   // chamado direto pelo clique: abre a principal
  const velho = document.querySelector('#painel .tela-ajustes');
  const mesmaPagina = velho && (velho.dataset.sub || '') === (sub || '');
  const rolagem = mesmaPagina ? velho.scrollTop : 0;
  const corpo = sub ? subAjustesHTML(sub) : ajustesHTML();
  const titulo = { 'avisar-antes': 'Avisar compromissos', palavras: 'Palavras aprendidas',
                   alarme: 'Como usar o alarme', privacidade: 'Privacidade', diagnostico: 'Diagnóstico' }[sub] || 'Ajustes';
  document.getElementById('painel').innerHTML = `<div class="painel-fundo tela-cheia">
    <div class="painel tela-ajustes" data-sub="${sub || ''}">
      <div class="aj-topo">
        <button type="button" class="icone-botao" data-acao="${sub ? 'ajustes-voltar' : 'fechar'}" aria-label="Voltar">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <h2>${titulo}</h2>
      </div>
      ${corpo}
    </div></div>`;
  App.subAjustes = sub || null;
  const nova = document.querySelector('#painel .tela-ajustes');
  if (nova && rolagem) nova.scrollTop = rolagem;
}

function ajustesHTML() {
  const e = Dados.carregar();
  const dias = Dados.diasSemBackup();
  const nativo = Avisos.nativo;
  const nAprendidas = Object.keys(e.aprendidas).length;
  const semBackup = e.itens.length && dias >= 14;
  let h = '';

  h += grupoAj('Geral', [
    linhaAj({ acao: 'esfera-ao-abrir', icone: 'esfera', cor: 'rosa', titulo: 'Esfera na tela Hoje',
              sub: 'Toque nela ou no microfone para falar', chave: Esfera.ligada() })
  ]);

  if (nativo) {
    const proximos = Avisos.plano().length;
    h += grupoAj('Avisos', [
      Avisos.permitido === false && linhaAj({ acao: 'permitir-avisos', icone: 'alerta', cor: 'vermelho',
        titulo: 'Liberar avisos', sub: '<span class="aj-alerta">O Android está bloqueando os avisos</span>' }),
      linhaAj({ acao: 'ajustes-sub', dados: ' data-sub="avisar-antes"', icone: 'sino', cor: 'laranja',
                titulo: 'Avisar compromissos', valor: rotuloAntes(Avisos.antecedencias()) }),
      linhaAj({ acao: 'revisao-semanal', dados: ` data-sim="${e.revisaoSemanal === false ? '1' : '0'}"`, icone: 'domingo', cor: 'azul',
                titulo: 'Revisão de domingo', sub: 'Às 19h, lembra o que ficou para trás', chave: e.revisaoSemanal !== false }),
      linhaAj({ acao: 'testar-aviso', icone: 'testar', cor: 'verde', titulo: 'Testar aviso', sub: 'Chega em 10 segundos', seta: false })
    ], (proximos ? proximos + ' aviso' + (proximos === 1 ? '' : 's') + ' marcado' + (proximos === 1 ? '' : 's') + '. ' : '') +
       'Avisa mesmo com o Prumo fechado. Sem hora, avisa às 9h do dia.');

    h += grupoAj('Alarme', [
      !Avisos.telaCheia && linhaAj({ acao: 'tela-cheia', icone: 'tela', cor: 'vermelho', titulo: 'Liberar alarme em tela cheia',
        sub: '<span class="aj-alerta">Hoje ele só aparece na barra de cima</span>' }),
      !Avisos.sobrepor && linhaAj({ acao: 'sobrepor', icone: 'sobrepor', cor: 'amarelo', titulo: 'Alarme por cima de outros apps',
        sub: 'Para Parar e Adiar abrirem sobre qualquer app' }),
      linhaAj({ acao: 'testar-alarme', icone: 'alarme', cor: 'roxo', titulo: 'Testar alarme', sub: 'Toca em 10 segundos', seta: false }),
      linhaAj({ acao: 'ajustes-sub', dados: ' data-sub="alarme"', icone: 'info', cor: 'cinza', titulo: 'Como usar o alarme' })
    ]);
  }

  h += grupoAj('Seus dados', [
    linhaAj({ acao: 'exportar', icone: 'backup', cor: 'azul', titulo: 'Fazer backup',
              sub: semBackup ? `<span class="aj-alerta">Último há ${dias === 999 ? 'muito tempo' : dias + ' dias'}</span>` : (dias === 999 ? 'Nunca feito' : dias === 0 ? 'Último: hoje' : 'Último: há ' + dias + ' dia' + (dias === 1 ? '' : 's')) }),
    linhaAj({ acao: 'importar', icone: 'restaurar', cor: 'ciano', titulo: 'Restaurar backup', sub: 'Ou passar para outro celular' }),
    linhaAj({ acao: 'ajustes-sub', dados: ' data-sub="palavras"', icone: 'palavra', cor: 'roxo', titulo: 'Palavras aprendidas',
              valor: nAprendidas ? String(nAprendidas) : 'nenhuma' })
  ], e.itens.length + ' registro' + (e.itens.length === 1 ? '' : 's') + ' guardado' + (e.itens.length === 1 ? '' : 's') + ' só neste aparelho.');

  const fixas = Dados.fixas();
  if (fixas.length) {
    h += grupoAj('Contas fixas', fixas.map(f => linhaAj({ acao: 'editar-fixa', dados: ` data-id="${f.id}"`, icone: 'repetir',
      cor: f.tipo === 'receita' ? 'verde' : 'laranja', titulo: esc(f.titulo) + ' · ' + esc(fmtMoeda(f.valor)),
      sub: (f.tipo === 'receita' ? 'Entra' : 'Sai') + ' todo dia ' + f.dia })));
  }

  if (nativo) {
    h += grupoAj('Atualização', [
      linhaAj({ acao: 'procurar-atualizacao', icone: 'atualizar', cor: 'verde', titulo: 'Procurar atualização',
                sub: Miolo.pronto ? 'A ' + Miolo.pronto + ' já foi baixada' : 'O Prumo se atualiza sozinho', valor: versaoApp() }),
      Miolo.pronto && linhaAj({ acao: 'atualizar-agora', icone: 'atualizar', cor: 'verde', titulo: 'Atualizar agora para a ' + Miolo.pronto,
                sub: 'O Prumo recarrega em um segundo; seus dados ficam' }),
      linhaAj({ acao: 'miolo-teste', icone: 'teste', cor: 'cinza', titulo: 'Versões de teste',
                sub: 'Só para quem testa antes dos outros', chave: Miolo.recebeTeste() }),
      linhaAj({ acao: 'ajustes-sub', dados: ' data-sub="diagnostico"', icone: 'info', cor: 'cinza', titulo: 'Diagnóstico da atualização' })
    ]);
  }

  h += grupoAj('Ajuda', [
    linhaAj({ acao: 'tutorial', icone: 'ajuda', cor: 'rosa', titulo: 'Ver o tutorial' }),
    !nativo && linhaAj({ acao: 'instalar', icone: 'instalar', cor: 'azul', titulo: 'Instalar na tela de início' }),
    linhaAj({ acao: 'ajustes-sub', dados: ' data-sub="privacidade"', icone: 'cadeado', cor: 'cinza', titulo: 'Privacidade' })
  ]);

  h += grupoAj('', [
    linhaAj({ acao: 'apagar', icone: 'lixo', cor: 'vermelho', titulo: 'Apagar tudo', perigo: true, seta: false })
  ]);

  h += `<div class="aj-fim">Prumo ${versaoApp()}</div>`;
  return h;
}

function subAjustesHTML(sub) {
  if (sub === 'avisar-antes') {
    // Pode marcar mais de um (padrão: 1 h e 30 min antes).
    const marcados = Avisos.antecedencias();
    return grupoAj('Compromisso com hora', [0, 10, 30, 60, 120, 1440].map(m => {
      const sim = marcados.includes(m);
      return `<button type="button" class="aj-linha aj-opcao" data-acao="aviso-min" data-min="${m}" role="checkbox" aria-checked="${sim}">
         <span class="aj-texto"><span class="aj-titulo">${rotuloMin(m)}</span></span>
         <span class="aj-radio caixa${sim ? ' marcado' : ''}" aria-hidden="true"></span></button>`;
    }), 'Pode marcar mais de um: o Prumo avisa em cada um deles. Compromisso sem hora avisa às 9h da manhã do dia.');
  }
  if (sub === 'palavras') {
    const lista = Object.entries(Dados.carregar().aprendidas);
    if (!lista.length) return '<p class="aj-explica">Quando você corrigir a categoria de um lançamento, o Prumo memoriza a palavra e acerta sozinho na próxima vez. Elas aparecem aqui.</p>';
    return grupoAj('', lista.map(([pal, cat]) =>
      `<div class="aj-linha"><span class="aj-texto"><span class="aj-titulo">${esc(pal)}</span><span class="desc aj-sub">${esc(cat)}</span></span>
         <button type="button" class="mini" data-acao="esquecer" data-palavra="${esc(pal)}">Esquecer</button></div>`),
      'O Prumo usa estas palavras para acertar a categoria sozinho.');
  }
  if (sub === 'alarme') {
    return `<div class="aj-explica">
      <p>Diga <strong>"alarme"</strong>, <strong>"alarma"</strong>, <strong>"despertar"</strong> ou <strong>"me acorda"</strong>. Exemplos: <em>alarme 6h</em>, <em>alarma daqui a 40 minutos</em>.</p>
      <p>O Prumo toca como despertador: som do alarme do celular, vibração e a tela do alarme, com o celular bloqueado ou não, até você tocar em <strong>Parar</strong> ou <strong>Adiar</strong>.</p>
      <p>Também dá para ligar o alarme em qualquer compromisso, no <strong>Editar</strong>.</p>
      <p>Celular Samsung ou Xiaomi: se algum aviso não chegar, vá em Ajustes do celular → Apps → Prumo → Bateria → <strong>Sem restrições</strong>.</p></div>`;
  }
  if (sub === 'diagnostico') {
    const d = Miolo.diario();
    const fmt = iso => { const x = new Date(iso); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + ' ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
    return grupoAj('Este celular', [
      `<div class="aj-linha"><span class="aj-texto"><span class="aj-titulo">Miolo 1.${Miolo.versao}</span><span class="desc aj-sub">Parte nativa 1.${(typeof Atualizacao !== 'undefined' && Atualizacao.instalado) || '?'} · peça de atualização ${Miolo.plugin() ? 'presente' : 'AUSENTE'} · teste ${Miolo.recebeTeste() ? 'ligado' : 'desligado'}</span></span></div>`
    ]) + grupoAj('O que aconteceu (mais recente primeiro)', d.length
      ? d.map(x => `<div class="aj-linha"><span class="aj-texto"><span class="aj-sub">${esc(fmt(x.em))}</span><span class="aj-titulo aj-diario">${esc(x.texto)}</span></span></div>`)
      : ['<div class="aj-linha"><span class="aj-texto"><span class="aj-titulo">Nada anotado ainda</span></span></div>'],
      'Se a atualização não chegar, mande um print desta tela.');
  }
  if (sub === 'privacidade') {
    return `<div class="aj-explica">
      <p>O Prumo funciona sem internet e <strong>não manda nada para lugar nenhum</strong>. Tudo o que você anota fica guardado só neste aparelho.</p>
      <p>Sem cadastro, sem senha, sem propaganda. Ninguém vê o que você anota.</p>
      <p>A única coisa que ele pergunta à internet é o número da versão mais nova, para se atualizar.</p>
      <p>Por isso o <strong>backup</strong> importa: ao trocar de celular, faça um backup e restaure no novo.</p></div>`;
  }
  return '';
}

function painelInstalar() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const passos = iOS
    ? `<ol class="passos">
         <li>Esta página precisa estar aberta no <strong>Safari</strong> (não funciona pelo Chrome no iPhone).</li>
         <li>Toque no botão <span class="tecla">Compartilhar</span> — o quadrado com a seta para cima, embaixo.</li>
         <li>Role a lista e toque em <span class="tecla">Adicionar à Tela de Início</span>.</li>
         <li>Confirme em <span class="tecla">Adicionar</span>. O ícone do Prumo aparece junto dos seus apps.</li>
       </ol>`
    : `<ol class="passos">
         <li>Abra o menu do navegador — os <span class="tecla">⋮</span> três pontinhos no canto.</li>
         <li>Toque em <span class="tecla">Instalar aplicativo</span> ou <span class="tecla">Adicionar à tela inicial</span>.</li>
         <li>Confirme. O ícone do Prumo aparece junto dos seus apps.</li>
       </ol>`;
  abrirPainel(`<h2>Instalar o Prumo</h2>${passos}
    <p>Depois de instalado ele abre em tela cheia e continua funcionando sem internet.</p>
    <div class="acoes"><button type="button" class="principal" data-acao="fechar">Entendi</button></div>`);
}

/* ---------- backup ---------- */

function exportarBackup() {
  const texto = Dados.exportar();
  const nome = 'prumo-backup-' + hojeISO() + '.json';
  if (Avisos.nativo) return exportarBackupAndroid(texto, nome);
  const blob = new Blob([texto], { type: 'application/json' });
  const arquivo = new File([blob], nome, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    navigator.share({ files: [arquivo], title: 'Backup do Prumo' }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

/* No app Android o "baixar arquivo" do navegador não existe: grava o arquivo
   no próprio app e abre o menu de compartilhar (Drive, WhatsApp, Arquivos…). */
async function exportarBackupAndroid(texto, nome) {
  const { Filesystem, Share } = window.Capacitor.Plugins;
  try {
    const r = await Filesystem.writeFile({ path: nome, data: texto, directory: 'CACHE', encoding: 'utf8' });
    await Share.share({ title: 'Backup do Prumo', files: [r.uri], dialogTitle: 'Guardar o backup em…' });
  } catch (e) {
    if (!/cancel/i.test(String(e && e.message))) alert('Não consegui gerar o backup: ' + (e && e.message || e));
  }
}

function importarBackup() {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'application/json,.json';
  entrada.onchange = () => {
    const arq = entrada.files && entrada.files[0];
    if (!arq) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const juntar = confirm('Juntar com o que já está aqui?\n\nOK = juntar (nada é perdido)\nCancelar = substituir tudo pelo backup');
      try {
        const n = Dados.importar(leitor.result, juntar ? 'juntar' : 'substituir');
        fecharPainel(); render();
        alert(n + ' registro(s) lidos do backup.');
      } catch (erro) { alert(erro.message); }
    };
    leitor.readAsText(arq);
  };
  entrada.click();
}

/* ---------- render ---------- */

function render() {
  const conteudo = document.getElementById('conteudo');
  let tela;
  if (App.busca !== null) tela = telaBusca();
  else if (App.aba === 'hoje') tela = telaHoje();
  else if (App.aba === 'dinheiro') tela = telaDinheiro();
  else if (App.aba === 'agenda') tela = telaAgenda();
  else tela = telaTarefas();
  // Faixa "Versão nova do Prumo" (só no app Android), no alto de qualquer aba.
  conteudo.innerHTML = (App.busca === null ? Atualizacao.bannerHTML() : '') + tela;
  if (document.body && document.body.classList)
    document.body.classList.toggle('hoje-vazio', App.busca === null && App.aba === 'hoje' && !conteudo.innerHTML.trim());

  document.querySelectorAll('.aba').forEach(b =>
    b.classList.toggle('ativa', App.busca === null && b.dataset.aba === App.aba));
  renderConfirma();
  if (typeof EsferaHoje !== 'undefined') EsferaHoje.atualizar();
}

/* ---------- eventos ---------- */

document.addEventListener('click', evento => {
  const alvo = evento.target.closest('[data-acao]');
  if (!alvo) return;
  const acao = alvo.dataset.acao;
  const id = alvo.dataset.id;

  if (acao === 'fundo' && evento.target === alvo) { fecharPainel(); return render(); }
  if (acao === 'fechar') return fecharPainel();
  if (acao === 'fechar-recado') { App.recado = null; App.recadoTexto = null; return render(); }

  if (acao === 'revisao') return abrirRevisao();
  if (acao === 'atualizar-app') return Atualizacao.instalar();
  if (acao === 'dispensar-atualizacao') { Atualizacao.dispensada = true; return render(); }
  if (acao === 'atualizar-agora') {
    alvo.disabled = true; alvo.querySelector('.desc').textContent = 'Atualizando…';
    localStorage.removeItem(Miolo.CHAVE_TROCA);
    return Miolo.aplicarPendente().then(ok => {
      if (!ok) { alvo.querySelector('.desc').textContent = 'Não deu para trocar agora: feche e abra o Prumo.'; alvo.disabled = false; }
    });
  }
  if (acao === 'miolo-teste') { Miolo.ligarTeste(!Miolo.recebeTeste()); return painelAjustes(); }
  if (acao === 'procurar-atualizacao') {
    alvo.disabled = true; alvo.querySelector('.desc').textContent = 'Procurando…';
    return Atualizacao.conferir(true).then(async n => {
      Atualizacao.dispensada = false;
      if (n) { fecharPainel(); App.busca = null; return render(); }
      const m = await Miolo.conferir(true);
      if (m || Miolo.pronto) return painelAjustes();   // aparece o "Atualizar agora"
      alvo.querySelector('.desc').textContent = 'Você já está com a versão mais nova (1.' + Math.max(Miolo.versao, Atualizacao.instalado || 0) + ').';
      alvo.disabled = false;
    });
  }
  if (acao === 'rev') return responderRevisao(alvo.dataset.o);
  if (acao === 'fechar-revisao') { App.revisao = null; fecharPainel(); return render(); }
  if (acao === 'revisao-semanal') {
    Dados.carregar().revisaoSemanal = alvo.dataset.sim === '1';
    Dados.salvar(); return painelAjustes();
  }

  if (acao === 'add-repetir') {
    App.rascunho = lerCampos(App.rascunho, 'c_');
    if (App.rascunho.data && App.rascunho.hora) {
      App.rascunho.repetir = { cada: 20, ate: fimDaSerie(App.rascunho.data, App.rascunho.hora, '', 20) };
      App.rascunho.naHora = true;
    }
    renderConfirma();
    const campo = document.getElementById('c_cada');
    if (campo) campo.focus();
    return;
  }
  if (acao === 'add-parcelas' || acao === 'add-fixa') {
    App.rascunho = lerCampos(App.rascunho, 'c_');
    if (acao === 'add-parcelas') App.rascunho.parcelas = 2;
    else App.rascunho.todoDia = +(App.rascunho.data || hojeISO()).slice(8, 10);
    renderConfirma();
    const campo = document.getElementById(acao === 'add-parcelas' ? 'c_parcelas' : 'c_todoDia');
    if (campo) { campo.focus(); campo.select(); }
    return;
  }
  if (acao === 'pagar-fixa') {
    const pago = pagarFixa(id, alvo.dataset.ym);
    App.recadoTexto = pago ? (pago.tipo === 'receita' ? 'Recebido: ' : 'Pago: ') + pago.titulo + ', ' + fmtMoeda(pago.valor) + '.' : null;
    return render();
  }
  if (acao === 'editar-fixa') return painelFixa(id);
  if (acao === 'salvar-fixa') {
    const v = numeroBR(document.getElementById('x_valor').value.replace(/[^\d.,]/g, ''));
    const dia = parseInt(document.getElementById('x_dia').value, 10);
    if (!v) return alert('Falta o valor.');
    if (!(dia >= 1 && dia <= 31)) return alert('O dia precisa ser de 1 a 31.');
    Dados.atualizarFixa(id, { titulo: document.getElementById('x_titulo').value.trim() || 'Conta fixa',
      valor: v, dia, categoria: document.getElementById('x_categoria').value });
    fecharPainel(); return render();
  }
  if (acao === 'excluir-fixa') {
    if (!confirm('Parar de repetir esta conta?\n\nOs pagamentos já lançados continuam guardados.')) return;
    Dados.removerFixa(id); fecharPainel(); return render();
  }
  if (acao === 'excluir-grupo') {
    const item = Dados.itens().find(i => i.id === id);
    const doGrupo = Dados.itens().filter(i => i.grupo === item.grupo);
    if (!confirm('Apagar a compra e as ' + doGrupo.filter(i => i.parcela).length + ' parcelas?')) return;
    doGrupo.forEach(i => Dados.remover(i.id)); fecharPainel(); return render();
  }

  if (acao === 'tipo') return trocarTipo(alvo.dataset.tipo);
  if (acao === 'sugestao') {
    const campo = document.getElementById('campoEntrada');
    campo.value = alvo.dataset.frase;
    mostrarSugestoes(false);
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
    return;
  }
  if (acao === 'ir-aba') { App.aba = alvo.dataset.aba; App.recado = null; App.recadoTexto = null; return render(); }
  if (acao === 'tutorial') { fecharPainel(); return Tutorial.abrir(); }
  if (acao === 'cancelar') { App.rascunho = null; renderConfirma(); return; }
  if (acao === 'salvar') return salvarRascunho();

  if (acao === 'feito') {
    const item = Dados.itens().find(i => i.id === id);
    Dados.atualizar(id, { feito: !item.feito });
    return render();
  }
  if (acao === 'abrir') return painelEditar(id);
  if (acao === 'calendario') {
    const item = Dados.itens().find(i => i.id === id);
    return mandarParaCalendario(item, Avisos.antecedencias(item));
  }
  if (acao === 'passados') { App.mostrarPassados = true; return render(); }
  if (acao === 'mes') {
    const d = new Date(App.mesRef.ano, App.mesRef.mes + Number(alvo.dataset.passo), 1);
    App.mesRef = { ano: d.getFullYear(), mes: d.getMonth() };
    return render();
  }

  if (acao === 'tipo-editar') {
    const item = Object.assign({}, Dados.itens().find(i => i.id === id), lerCampos({}, 'e_'));
    item.tipo = alvo.dataset.tipo;
    Dados.atualizar(id, item);
    return painelEditar(id);
  }
  if (acao === 'salvar-edicao') {
    const original = Dados.itens().find(i => i.id === id);
    const novo = lerCampos(original, 'e_');
    if (novo.categoria && novo.categoria !== original.categoria) Dados.aprender(novo.texto || novo.titulo, novo.categoria);
    Dados.atualizar(id, novo);
    fecharPainel(); return render();
  }
  if (acao === 'excluir') {
    const item = Dados.itens().find(i => i.id === id);
    if (item && item.compra && item.grupo) {
      /* Apagar a compra apaga junto as parcelas dos meses seguintes. */
      const doGrupo = Dados.itens().filter(i => i.grupo === item.grupo);
      const n = doGrupo.filter(i => i.parcela).length;
      if (!confirm('Apagar a compra?' + (n ? '\n\nAs ' + n + ' parcelas dos próximos meses também somem.' : ''))) return;
      doGrupo.forEach(i => Dados.remover(i.id)); fecharPainel(); return render();
    }
    if (!confirm('Apagar este registro?')) return;
    Dados.remover(id); fecharPainel(); return render();
  }

  if (acao === 'exportar') return exportarBackup();
  if (acao === 'importar') return importarBackup();
  if (acao === 'aviso-min') {
    // Liga/desliga cada antecedência; sempre fica pelo menos uma marcada.
    const m = Number(alvo.dataset.min), atuais = Avisos.antecedencias();
    const lista = atuais.includes(m) ? atuais.filter(x => x !== m) : atuais.concat(m);
    if (!lista.length) return;
    Dados.carregar().avisosAntes = lista.sort((a, b) => b - a);
    Dados.salvar(); return painelAjustes();
  }
  if (acao === 'testar-aviso') return Avisos.testar();
  if (acao === 'testar-alarme') return Avisos.testarAlarme();
  if (acao === 'tela-cheia') return Avisos.nativoPrumo().abrirAjustesTelaCheia();
  if (acao === 'sobrepor') return Avisos.nativoPrumo().abrirAjustesSobrepor();
  if (acao === 'permitir-avisos') {
    return Avisos.pedirPermissao().then(ok => {
      if (!ok) alert('O Android não abriu a pergunta. Vá em Ajustes do celular → Apps → Prumo → Notificações e ligue.');
      render(); if (document.querySelector('#painel h2')) painelAjustes();
    });
  }
  if (acao === 'esfera-ao-abrir') { Esfera.ligar(!Esfera.ligada()); render(); return painelAjustes(); }
  if (acao === 'esquecer') { Dados.esquecer(alvo.dataset.palavra); return painelAjustes('palavras'); }
  if (acao === 'ajustes-sub') return painelAjustes(alvo.dataset.sub);
  if (acao === 'ajustes-voltar') return painelAjustes();
  if (acao === 'instalar') return painelInstalar();
  if (acao === 'apagar') {
    if (!confirm('Apagar TODOS os registros deste aparelho?\n\nFaça um backup antes se tiver dúvida.')) return;
    if (!confirm('Tem certeza mesmo? Não tem como desfazer.')) return;
    Dados.apagarTudo(); fecharPainel(); return render();
  }
});

/* A dica das parcelas/conta fixa acompanha o que se digita nos campos. */
document.addEventListener('input', evento => {
  if (!App.rascunho || !/^c_(valor|parcelas|todoDia|data)$/.test(evento.target.id || '')) return;
  const dica = document.getElementById('c_dica');
  if (!dica) return;
  const texto = dicaDinheiro(lerCampos(App.rascunho, 'c_'));
  dica.textContent = texto; dica.hidden = !texto;
});

/* "Lembrar a cada": o campo "Até" só aparece com repetição, já preenchido com o fim padrão. */
document.addEventListener('input', evento => {
  const m = /^([ce]_)cada$/.exec(evento.target.id || '');
  if (!m) return;
  const p = m[1], cada = parseInt(evento.target.value, 10) || 0;
  const caixa = document.getElementById(p + 'ateCampo'), ate = document.getElementById(p + 'ate');
  if (!caixa || !ate) return;
  caixa.hidden = !cada;
  const data = document.getElementById(p + 'data'), hora = document.getElementById(p + 'hora');
  if (cada && !ate.value && data && data.value && hora && hora.value) ate.value = fimDaSerie(data.value, hora.value, '', cada).slice(11, 16);
});

/* Os exemplos aparecem com a caixa vazia e em foco, e somem ao digitar. */
function mostrarSugestoes(sim) {
  const s = document.getElementById('sugestoes');
  if (sim && !App.rascunho) { s.innerHTML = '<div class="sugestoes-rotulo">Experimente, toque num exemplo:</div>' + sugestoesHTML(); s.hidden = false; }
  else s.hidden = true;
}

function iniciar() {
  // Primeiro de tudo: avisa a peça de atualização que este miolo abriu (senão ela
  // desfaz a versão nova em 10 s). Se o JS estivesse quebrado, nem chegaria aqui.
  if (typeof Miolo !== 'undefined' && window.Capacitor) Miolo.iniciar();
  document.getElementById('formEntrada').addEventListener('submit', aoEnviar);

  const hoje = new Date();
  const dataTexto = DIA_LONGO[hoje.getDay()] + ', ' + hoje.getDate() + ' de ' + NOMES_MES[hoje.getMonth()];
  document.getElementById('dataHoje').textContent = dataTexto.charAt(0).toUpperCase() + dataTexto.slice(1);

  const campo = document.getElementById('campoEntrada');
  campo.addEventListener('focus', () => mostrarSugestoes(!campo.value));
  campo.addEventListener('input', () => mostrarSugestoes(!campo.value));
  campo.addEventListener('blur', () => setTimeout(() => mostrarSugestoes(false), 150));
  // Tocar num exemplo não pode tirar o foco antes do clique chegar.
  document.getElementById('sugestoes').addEventListener('pointerdown', e => e.preventDefault());

  document.querySelectorAll('.aba').forEach(b => b.addEventListener('click', () => {
    App.aba = b.dataset.aba; App.busca = null; App.recado = null; App.recadoTexto = null;
    document.getElementById('linhaBusca').hidden = true;
    render();
  }));

  document.getElementById('btAjustes').addEventListener('click', () => painelAjustes());
  document.getElementById('btAjuda').addEventListener('click', () => { fecharPainel(); Tutorial.abrir(); });

  const linhaBusca = document.getElementById('linhaBusca');
  const campoBusca = document.getElementById('campoBusca');
  document.getElementById('btBusca').addEventListener('click', () => {
    linhaBusca.hidden = !linhaBusca.hidden;
    if (linhaBusca.hidden) { App.busca = null; campoBusca.value = ''; }
    else { App.busca = ''; campoBusca.focus(); }
    render();
  });
  campoBusca.addEventListener('input', () => { App.busca = campoBusca.value; render(); });

  const topo = document.querySelector('.topo');
  window.addEventListener('scroll', () => topo.classList.toggle('rolado', window.scrollY > 4), { passive: true });

  render();
  if (Tutorial.precisa()) Tutorial.abrir();
  else if (Tutorial.novidades().length) Tutorial.abrir({ novidades: true });   // só as telas novas, uma vez
  // Desde a 1.13 a esfera fica na tela Hoje (EsferaHoje), sem janela ao abrir.

  // Falar: pela esfera da tela Hoje; com ela desligada, pela janela.
  App.falar = () => Esfera.ligada() ? EsferaHoje.ouvir() : Esfera.abrir({ ouvir: true });

  // Site: o 🎤 aparece se o navegador reconhece voz (no app Android, logo abaixo).
  if (!Avisos.nativo && Esfera.temVoz()) {
    const bt = document.getElementById('btVoz');
    bt.hidden = false;
    bt.addEventListener('click', () => App.falar());
  }

  // O lembrete de backup não aparece mais na tela principal (pedido dele, 23/11/2026):
  // fica só nos Ajustes, em laranja, na linha "Fazer backup".

  if (Avisos.nativo) {
    Avisos.preparar().then(() => renderConfirma());
    // Versão nova liberada? Confere ao abrir e ao voltar para o app.
    const conferirVersao = () => Atualizacao.conferir().then(n => { if (n) render(); });
    conferirVersao();
    if (window.Capacitor.Plugins.App) window.Capacitor.Plugins.App.addListener('resume', conferirVersao);

    // Botão 🎤: fala → texto → mesma confirmação de quando se digita.
    const btVoz = document.getElementById('btVoz');
    btVoz.hidden = false;
    btVoz.addEventListener('click', async () => {
      if (typeof Esfera !== 'undefined') return EsferaHoje.ouvindo ? EsferaHoje.parar() : App.falar();
      try {
        const texto = await Avisos.ouvir();
        if (!texto) return;
        const campo = document.getElementById('campoEntrada');
        campo.value = texto;
        aoEnviar({ preventDefault() {} });
      } catch (e) {
        alert((e && e.message) || 'Não consegui ouvir. Tente o microfone do teclado.');
      }
    });

    // Widget e atalhos do ícone: o Android abre o app com um pedido ("falar",
    // "anotar"). Chega na abertura e também quando o app volta do fundo.
    const tratarPedido = async () => {
      let pedido = null;
      try { pedido = (await Avisos.nativoPrumo().acaoPendente()).acao; } catch (e) { return; }
      if (!pedido || Tutorial.aberto) return;
      fecharPainel(); App.busca = null;
      if (pedido === 'falar') btVoz.click();
      else if (pedido === 'anotar') {
        Esfera.fechar();
        const campo = document.getElementById('campoEntrada');
        campo.focus();
        Avisos.nativoPrumo().mostrarTeclado().catch(() => {});
      } else if (pedido === 'revisao') abrirRevisao();
    };
    tratarPedido();
    if (window.Capacitor.Plugins.App) window.Capacitor.Plugins.App.addListener('resume', tratarPedido);

    // Voltando ao app (ex.: depois de liberar a tela cheia), confere de novo.
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) return;
      await Avisos.lerEstadoAlarme();
      if (document.querySelector('#painel h2') && document.querySelector('[data-acao="testar-alarme"]')) painelAjustes();
    });
    // Botão "voltar" do Android: fecha o painel aberto em vez de sair do app.
    const AppNativo = window.Capacitor.Plugins.App;
    if (AppNativo) AppNativo.addListener('backButton', () => {
      if (Tutorial.aberto) return Tutorial.voltar();
      if (Esfera.aberta) return Esfera.fechar();
      if (App.subAjustes && document.querySelector('#painel .tela-ajustes')) return painelAjustes();
      if (document.getElementById('painel').innerHTML) { fecharPainel(); return render(); }
      if (App.rascunho) { App.rascunho = null; return renderConfirma(); }
      if (App.busca !== null) { document.getElementById('btBusca').click(); return; }
      if (App.aba !== 'hoje') { App.aba = 'hoje'; return render(); }
      AppNativo.minimizeApp();
    });
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    if (typeof Miolo !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost')) Miolo.iniciarSite();
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
