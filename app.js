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

/* ---------- estado da interface ---------- */

const App = {
  aba: 'hoje',
  rascunho: null,
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
  App.rascunho = interpretar(texto, { aprendidas: Dados.carregar().aprendidas });
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
    h += `<div class="campo"><label for="${p}valor">Valor</label>
          <input id="${p}valor" type="text" inputmode="decimal" value="${item.valor == null ? '' : String(item.valor).replace('.', ',')}"></div>`;
    const cats = categoriasDe(item.tipo);
    h += `<div class="campo"><label for="${p}categoria">Categoria</label><select id="${p}categoria">` +
         cats.map(c => `<option value="${esc(c)}"${c === item.categoria ? ' selected' : ''}>${esc(c)}</option>`).join('') +
         '</select></div>';
  }
  if (temData) {
    h += `<div class="campo"><label for="${p}data">Quando</label>
          <input id="${p}data" type="date" value="${item.data || ''}"></div>`;
  }
  if (temHora) {
    h += `<div class="campo"><label for="${p}hora">Hora</label>
          <input id="${p}hora" type="time" value="${item.hora || ''}"></div>`;
  }
  return h + '</div>';
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
  return novo;
}

function renderConfirma() {
  const alvo = document.getElementById('confirma');
  if (!App.rascunho) { alvo.innerHTML = ''; return; }
  const r = App.rascunho;
  const chips = Object.keys(TIPOS).map(t =>
    `<button type="button" class="chip${t === r.tipo ? ' ativo' : ''}" data-acao="tipo" data-tipo="${t}">${TIPOS[t].nome}</button>`
  ).join('');
  alvo.innerHTML = `<div class="confirma">
      <div class="confirma-tipos">${chips}</div>
      ${camposHTML(r, 'c_')}
      <div class="acoes">
        <button type="button" data-acao="cancelar">Cancelar</button>
        <button type="button" class="principal" data-acao="salvar">Guardar</button>
      </div>
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
  Dados.adicionar(item);
  App.rascunho = null;
  document.getElementById('campoEntrada').value = '';
  if (item.tipo === 'gasto' || item.tipo === 'receita') App.aba = 'dinheiro';
  else if (item.tipo === 'compromisso') App.aba = 'agenda';
  else if (item.tipo === 'tarefa') App.aba = 'tarefas';
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
  if (atrasado) info.push('<span class="destaque">atrasado</span>');

  let valor = '';
  if (item.valor != null) {
    const entrada = item.tipo === 'receita';
    valor = `<div class="valor ${entrada ? 'entrou' : 'saiu'}">${entrada ? '+' : '−'} ${esc(fmtMoeda(item.valor).replace('R$ ', ''))}</div>`;
  }

  const calendario = op.calendario
    ? `<button class="mini" data-acao="calendario" data-id="${item.id}">Pôr no calendário</button>` : '';

  return `<div class="${classes.join(' ')}">
    ${marcador}
    <div class="item-corpo" data-acao="abrir" data-id="${item.id}">
      <div class="item-titulo">${esc(item.titulo)}</div>
      ${info.length ? `<div class="item-info">${info.join('<span>·</span>')}</div>` : ''}
      ${calendario}
    </div>
    ${valor}
  </div>`;
}

function listaHTML(itens, op) {
  return '<div class="lista">' + itens.map(i => itemHTML(i, op)).join('') + '</div>';
}

function secao(titulo, itens, op) {
  if (!itens.length) return '';
  return `<div class="secao-titulo">${esc(titulo)}</div>` + listaHTML(itens, op);
}

function vazio(titulo, texto) {
  return `<div class="vazio"><strong>${esc(titulo)}</strong>${esc(texto)}</div>`;
}

/* ---------- telas ---------- */

function telaHoje() {
  const itens = Dados.itens();
  const h = hojeISO();
  const atrasados = itens.filter(eAtrasado).sort(ordemAgenda);
  const deHoje = itens.filter(i => i.data === h && !i.feito && (i.tipo === 'compromisso' || i.tipo === 'tarefa')).sort(ordemAgenda);
  const semPrazo = itens.filter(i => i.tipo === 'tarefa' && !i.data && !i.feito).slice(0, 6);
  const gastosHoje = itens.filter(i => i.tipo === 'gasto' && i.data === h);
  const somaHoje = gastosHoje.reduce((s, i) => s + (i.valor || 0), 0);

  if (!atrasados.length && !deHoje.length && !semPrazo.length && !gastosHoje.length) {
    if (!itens.length) {
      return vazio('Tudo no prumo', 'Escreva ou dite na caixa lá em cima. Por exemplo: "paguei 180 de conta de luz", "dentista quinta 15h", "lembrar de levar o carro na revisão".');
    }
    return vazio('Nada para hoje', 'Sem compromisso, sem atraso e sem gasto lançado hoje.');
  }

  let h2 = '';
  h2 += secao('Atrasado', atrasados, { marcador: true, mostrarData: true, calendario: false });
  h2 += secao('Hoje', deHoje, { marcador: true, calendario: false });
  if (somaHoje > 0) {
    h2 += `<div class="secao-titulo">Gasto de hoje · ${esc(fmtMoeda(somaHoje))}</div>` +
          listaHTML(gastosHoje, {});
  }
  h2 += secao('Sem prazo', semPrazo, { marcador: true });
  return h2;
}

function telaDinheiro() {
  const { ano, mes } = App.mesRef;
  const prefixo = ano + '-' + String(mes + 1).padStart(2, '0');
  const doMes = Dados.itens()
    .filter(i => (i.tipo === 'gasto' || i.tipo === 'receita') && i.data && i.data.startsWith(prefixo))
    .sort((a, b) => b.data.localeCompare(a.data));

  const saiu = doMes.filter(i => i.tipo === 'gasto').reduce((s, i) => s + (i.valor || 0), 0);
  const entrou = doMes.filter(i => i.tipo === 'receita').reduce((s, i) => s + (i.valor || 0), 0);

  let h = `<div class="mes">
      <button class="icone-botao" data-acao="mes" data-passo="-1" aria-label="Mês anterior">‹</button>
      <div class="mes-nome">${NOMES_MES[mes]} ${ano}</div>
      <button class="icone-botao" data-acao="mes" data-passo="1" aria-label="Próximo mês">›</button>
    </div>
    <div class="resumo">
      <div class="caixa"><div class="rotulo">Entrou</div><div class="numero entrou">${esc(fmtMoeda(entrou))}</div></div>
      <div class="caixa"><div class="rotulo">Saiu</div><div class="numero saiu">${esc(fmtMoeda(saiu))}</div></div>
      <div class="caixa"><div class="rotulo">Sobrou</div><div class="numero">${esc(fmtMoeda(entrou - saiu))}</div></div>
    </div>`;

  if (!doMes.length) return h + vazio('Mês em branco', 'Nada lançado neste mês.');

  const porCategoria = {};
  doMes.filter(i => i.tipo === 'gasto').forEach(i => {
    const c = i.categoria || 'Outros';
    porCategoria[c] = (porCategoria[c] || 0) + (i.valor || 0);
  });
  const ordenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  if (ordenadas.length) {
    const maior = ordenadas[0][1];
    h += '<div class="secao-titulo">Onde foi o dinheiro</div>';
    h += ordenadas.map(([c, v]) => `<div class="barra-linha">
        <div class="barra-topo"><span>${esc(c)}</span><span>${esc(fmtMoeda(v))}</span></div>
        <div class="barra-trilho"><div class="barra-cheia" style="width:${Math.max(3, Math.round(v / maior * 100))}%"></div></div>
      </div>`).join('');
  }

  let diaAtual = null;
  doMes.forEach(i => {
    if (i.data !== diaAtual) {
      if (diaAtual !== null) h += '</div>';
      diaAtual = i.data;
      h += `<div class="secao-titulo">${esc(fmtDataLonga(i.data))}</div><div class="lista">`;
    }
    h += itemHTML(i, {});
  });
  if (diaAtual !== null) h += '</div>';
  return h;
}

function telaAgenda() {
  const h = hojeISO();
  const todos = Dados.itens().filter(i => i.tipo === 'compromisso' && i.data);
  const futuros = todos.filter(i => i.data >= h).sort(ordemAgenda);
  const passados = todos.filter(i => i.data < h).sort((a, b) => ordemAgenda(b, a));

  let saida = '';
  if (!futuros.length) saida += vazio('Agenda livre', 'Nenhum compromisso marcado daqui pra frente.');

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

  if (!itens.length) return vazio('Nada pendente', 'Dite "lembrar de..." ou "preciso..." que aparece aqui.');

  let h = '';
  h += secao('Atrasado', atrasadas, { marcador: true, mostrarData: true });
  h += secao('Com prazo', comPrazo, { marcador: true, mostrarData: true });
  h += secao('Sem prazo', semPrazo, { marcador: true });
  h += secao('Anotações', notas, { marcador: true });
  h += secao('Feito', feitas, { marcador: true, mostrarData: true });
  return h;
}

function telaBusca() {
  const termo = semAcento(App.busca.trim());
  if (!termo) return vazio('Buscar', 'Digite algo para procurar em tudo que você já anotou.');
  const achados = Dados.itens().filter(i =>
    semAcento(i.titulo + ' ' + (i.texto || '') + ' ' + (i.categoria || '')).includes(termo));
  if (!achados.length) return vazio('Nada encontrado', 'Nenhum registro com "' + App.busca.trim() + '".');
  return `<div class="secao-titulo">${achados.length} resultado${achados.length > 1 ? 's' : ''}</div>` +
         listaHTML(achados.slice(0, 100), { mostrarData: true, marcador: false });
}

/* ---------- painéis ---------- */

function abrirPainel(html) {
  const p = document.getElementById('painel');
  p.innerHTML = `<div class="painel-fundo" data-acao="fundo"><div class="painel"><div class="puxador"></div>${html}</div></div>`;
}

function fecharPainel() { document.getElementById('painel').innerHTML = ''; }

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
    <div class="acoes">
      <button type="button" data-acao="excluir" data-id="${id}">Excluir</button>
      <button type="button" class="principal" data-acao="salvar-edicao" data-id="${id}">Salvar</button>
    </div>`);
}

function painelAjustes() {
  const e = Dados.carregar();
  const dias = Dados.diasSemBackup();
  const aprendidas = Object.entries(e.aprendidas);
  const alerta = (e.itens.length && dias >= 14)
    ? `<div class="aviso">Faz ${dias === 999 ? 'tempo' : dias + ' dias'} que você não faz backup. Seus dados existem só neste aparelho.</div>` : '';

  abrirPainel(`<h2>Ajustes</h2>
    ${alerta}
    <h3>Seus dados</h3>
    <button class="opcao" data-acao="exportar"><div><div>Fazer backup</div>
      <div class="desc">Salva um arquivo com tudo. Guarde no Arquivos, iCloud ou Drive.</div></div></button>
    <button class="opcao" data-acao="importar"><div><div>Restaurar backup</div>
      <div class="desc">Traz de volta um arquivo salvo, ou passa os dados para outro celular.</div></div></button>
    <div class="desc" style="margin:4px 2px 0">${e.itens.length} registro${e.itens.length === 1 ? '' : 's'} guardado${e.itens.length === 1 ? '' : 's'} neste aparelho.</div>

    <h3>Palavras aprendidas</h3>
    ${aprendidas.length
      ? '<div class="lista">' + aprendidas.map(([p, c]) =>
          `<div class="item"><div class="item-corpo"><div class="item-titulo">${esc(p)}</div>
           <div class="item-info">${esc(c)}</div></div>
           <button class="mini" data-acao="esquecer" data-palavra="${esc(p)}">Esquecer</button></div>`).join('') + '</div>'
      : '<p>Quando você corrigir a categoria de um lançamento, o Prumo memoriza a palavra e acerta na próxima vez.</p>'}

    <h3>Sobre</h3>
    <p>O Prumo funciona sem internet e não manda nada para lugar nenhum. Tudo o que você anota fica guardado neste aparelho — por isso o backup importa.</p>
    <button class="opcao" data-acao="instalar"><div><div>Como instalar na tela de início</div>
      <div class="desc">Para abrir igual a um aplicativo, sem barra de navegador.</div></div></button>
    <button class="opcao perigo" data-acao="apagar"><div><div>Apagar tudo</div>
      <div class="desc">Remove todos os registros deste aparelho. Não tem volta.</div></div></button>`);
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
  if (App.busca !== null) conteudo.innerHTML = telaBusca();
  else if (App.aba === 'hoje') conteudo.innerHTML = telaHoje();
  else if (App.aba === 'dinheiro') conteudo.innerHTML = telaDinheiro();
  else if (App.aba === 'agenda') conteudo.innerHTML = telaAgenda();
  else conteudo.innerHTML = telaTarefas();

  document.querySelectorAll('.aba').forEach(b =>
    b.classList.toggle('ativa', App.busca === null && b.dataset.aba === App.aba));
  renderConfirma();
}

/* ---------- eventos ---------- */

document.addEventListener('click', evento => {
  const alvo = evento.target.closest('[data-acao]');
  if (!alvo) return;
  const acao = alvo.dataset.acao;
  const id = alvo.dataset.id;

  if (acao === 'fundo' && evento.target === alvo) return fecharPainel();
  if (acao === 'fechar') return fecharPainel();

  if (acao === 'tipo') return trocarTipo(alvo.dataset.tipo);
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
    return mandarParaCalendario(item, 30);
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
    if (!confirm('Apagar este registro?')) return;
    Dados.remover(id); fecharPainel(); return render();
  }

  if (acao === 'exportar') return exportarBackup();
  if (acao === 'importar') return importarBackup();
  if (acao === 'esquecer') { Dados.esquecer(alvo.dataset.palavra); return painelAjustes(); }
  if (acao === 'instalar') return painelInstalar();
  if (acao === 'apagar') {
    if (!confirm('Apagar TODOS os registros deste aparelho?\n\nFaça um backup antes se tiver dúvida.')) return;
    if (!confirm('Tem certeza mesmo? Não tem como desfazer.')) return;
    Dados.apagarTudo(); fecharPainel(); return render();
  }
});

function iniciar() {
  document.getElementById('formEntrada').addEventListener('submit', aoEnviar);

  document.querySelectorAll('.aba').forEach(b => b.addEventListener('click', () => {
    App.aba = b.dataset.aba; App.busca = null;
    document.getElementById('linhaBusca').hidden = true;
    render();
  }));

  document.getElementById('btAjustes').addEventListener('click', painelAjustes);

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

  if (Dados.itens().length && Dados.diasSemBackup() >= 21) {
    setTimeout(() => {
      const barra = document.getElementById('conteudo');
      barra.insertAdjacentHTML('afterbegin',
        '<div class="aviso">Faz tempo que você não faz backup. Ajustes → Fazer backup.</div>');
    }, 800);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
