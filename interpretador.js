/* interpretador.js — transforma uma frase solta em um item estruturado.
   Sem dependências, sem internet. Tudo acontece no aparelho. */

const MAPA_ACENTOS = {
  'á':'a','à':'a','ã':'a','â':'a','ä':'a',
  'é':'e','ê':'e','è':'e','ë':'e',
  'í':'i','ì':'i','î':'i','ï':'i',
  'ó':'o','ô':'o','õ':'o','ò':'o','ö':'o',
  'ú':'u','ù':'u','û':'u','ü':'u',
  'ç':'c','ñ':'n'
};

/* Troca acento por letra simples SEM mudar o tamanho do texto — é isso que
   permite marcar posições no texto normalizado e recortar o texto original. */
function semAcento(texto) {
  return texto.toLowerCase().replace(/[^\x00-\x7f]/g, c => MAPA_ACENTOS[c] || c);
}

const DIAS_SEMANA = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6
};

const MESES = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
};

/* Palavras que revelam a intenção. Verbo no passado = já aconteceu (dinheiro);
   verbo no infinitivo = ainda vou fazer (tarefa). */
const PALAVRAS = {
  receita: ['recebi','ganhei','entrou','caiu','me pagaram','salario','honorarios',
            'deposito','vendi','rendimento','restituicao','reembolso'],
  gasto:   ['paguei','gastei','comprei','custou','torrei','saiu','gasto de',
            'despesa'],
  // Verbos que só anunciam a tarefa — somem do título ("lembrar de X" vira "X").
  // A ordem importa: acharPalavra devolve a PRIMEIRA que casar, então as
  // frases compridas vêm antes. Sem isso, "me lembrar de pagar o IPTU"
  // marcava só "lembrar" e sobrava o título torto "Me de pagar o IPTU".
  tarefaMeta: ['nao me deixe esquecer','nao posso esquecer','nao esquecer',
               'me lembrar de','me lembre de','me lembra de',
               'me lembrar','me lembre','me lembra',
               'lembrar de','lembre de','lembra de',
               'lembrar','lembre','lembra',
               'preciso','tenho que','anotar que','anota que'],
  // Verbos que SÃO a tarefa — ficam no título ("ligar para o contador").
  tarefaAcao: ['resolver','pagar','comprar','ligar','mandar','enviar','buscar','pegar',
               'levar','marcar','agendar','procurar','conferir','revisar','assinar',
               'protocolar','despachar','responder','imprimir','separar','terminar',
               'devolver','entregar','avisar','cobrar','renovar','emitir'],
  compromisso: ['reuniao','audiencia','consulta','medico','dentista','aniversario',
                'encontro','entrevista','sessao','missa','casamento','formatura',
                'voo','embarque','culto','aula','prova','plantao','visita','almoco com',
                'jantar com','cafe com','conversa com','call','videochamada']
};

/* Categorias de dinheiro por palavra-chave. O app vai somando as que você corrige. */
const CATEGORIAS = {
  'Alimentação': ['almoco','jantar','janta','cafe','lanche','restaurante','ifood','rappi',
                  'padaria','pizza','hamburguer','acai','sorvete','comida','marmita',
                  'delivery','churrasco','doceria','sushi'],
  'Mercado':     ['mercado','supermercado','feira','hortifruti','sacolao','atacado',
                  'compras do mes','acougue'],
  'Transporte':  ['gasolina','combustivel','alcool','etanol','diesel','uber','99','taxi',
                  'onibus','metro','estacionamento','pedagio','mecanico','oficina','ipva',
                  'licenciamento','revisao','pneu','lavagem','seguro do carro','passagem'],
  'Casa':        ['luz','energia','agua','aluguel','condominio','internet','gas','iptu',
                  'faxina','diarista','reforma','movel','eletrodomestico','telefone',
                  'celular','conta de casa','material de construcao'],
  'Saúde':       ['farmacia','remedio','medico','dentista','consulta','exame','vacina',
                  'plano de saude','academia','oculos','lente','terapia','psicologo',
                  'fisioterapia','laboratorio'],
  'Educação':    ['curso','livro','faculdade','mensalidade','material escolar','apostila',
                  'escola','colegio','pos','concurso','inscricao'],
  'Lazer':       ['cinema','bar','cerveja','show','teatro','viagem','hotel','pousada',
                  'jogo','parque','passeio','balada','streaming'],
  'Assinaturas': ['netflix','spotify','amazon','disney','assinatura','youtube premium',
                  'icloud','google one','hbo','globoplay'],
  'Vestuário':   ['roupa','sapato','tenis','camisa','calca','vestido','bolsa','relogio',
                  'cabeleireiro','barbeiro','salao','manicure'],
  'Trabalho':    ['cartorio','custas','emolumentos','selo','certidao','xerox','copia',
                  'correios','sedex','cartucho','papel','carimbo','contador','oab','anuidade'],
  'Família':     ['presente','filho','filha','escola do','mesada','pensao','pet','veterinario',
                  'racao']
};

const CATEGORIAS_RECEITA = {
  'Salário':     ['salario','holerite','contracheque','vale','decimo','ferias'],
  'Honorários':  ['honorarios','servico','freela','consultoria','bico'],
  'Vendas':      ['vendi','venda','vendas'],
  'Rendimentos': ['rendimento','juros','dividendo','poupanca','investimento'],
  'Reembolso':   ['reembolso','restituicao','estorno','devolucao']
};

/* ---------- ferramentas de data ---------- */

function comZero(n) { return String(n).padStart(2, '0'); }
function paraISO(d) { return d.getFullYear() + '-' + comZero(d.getMonth() + 1) + '-' + comZero(d.getDate()); }
function somarDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/* ---------- a frase e as marcações ---------- */

class Frase {
  constructor(original) {
    this.original = original;
    this.t = semAcento(original);
    this.usado = new Array(original.length).fill(false);
  }
  marcar(inicio, fim) {
    for (let i = inicio; i < fim && i < this.usado.length; i++) this.usado[i] = true;
    this.t = this.t.slice(0, inicio) + ' '.repeat(fim - inicio) + this.t.slice(fim);
  }
  /* Procura no que ainda não foi marcado. Devolve o match ou null. */
  achar(regex) {
    const r = new RegExp(regex.source, regex.flags.replace('g', ''));
    return r.exec(this.t);
  }
  /* Texto original com os pedaços já entendidos removidos. */
  sobra() {
    let s = '';
    for (let i = 0; i < this.original.length; i++) s += this.usado[i] ? ' ' : this.original[i];
    return s.replace(/\s+/g, ' ').trim();
  }
}

/* ---------- hora ---------- */

function acharHora(f) {
  const tentativas = [
    // "às 14h30", "as 14:30", "14h30", "14:30"
    [/\b(?:as\s+)?([01]?\d|2[0-3])\s*[:h]\s*([0-5]\d)\b/, m => [+m[1], +m[2]]],
    // "às 14h", "14 horas"
    [/\b(?:as\s+)?([01]?\d|2[0-3])\s*h(?:oras?)?\b/, m => [+m[1], 0]],
    // "2 da tarde", "8 da noite", "9 da manhã"
    [/\b(\d{1,2})\s*(?:da|de)\s+(manha|tarde|noite)\b/, m => {
      let h = +m[1];
      if (m[2] === 'tarde' && h < 12) h += 12;
      if (m[2] === 'noite' && h < 12) h += 12;
      return [h, 0];
    }],
    [/\bmeio[\s-]?dia\b/, () => [12, 0]],
    [/\bmeia[\s-]?noite\b/, () => [0, 0]],
    // "às 8" — sem o "h". Último recurso, para não roubar número de valor.
    [/\bas\s+([01]?\d|2[0-3])\b(?!\s*[\/.,:\d])/, m => [+m[1], 0]]
  ];
  for (const [re, extrair] of tentativas) {
    const m = f.achar(re);
    if (m) {
      const [h, min] = extrair(m);
      if (h > 23 || min > 59) continue;
      f.marcar(m.index, m.index + m[0].length);
      return comZero(h) + ':' + comZero(min);
    }
  }
  return null;
}

/* ---------- data ---------- */

function acharData(f, hoje) {
  // Ordem importa: "depois de amanhã" antes de "amanhã".
  const relativas = [
    [/\bdepois\s+de\s+amanha\b/, 2],
    [/\banteontem\b/, -2],
    [/\bamanha\b/, 1],
    [/\bontem\b/, -1],
    [/\bhoje\b/, 0],
    [/\bsemana\s+que\s+vem\b/, 7],
    [/\bdaqui\s+a\s+(\d{1,3})\s+dias?\b/, null]
  ];
  for (const [re, dias] of relativas) {
    const m = f.achar(re);
    if (m) {
      f.marcar(m.index, m.index + m[0].length);
      return paraISO(somarDias(hoje, dias === null ? +m[1] : dias));
    }
  }

  // "12/03", "12/03/2026", "12-03"
  let m = f.achar(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (m) {
    const dia = +m[1], mes = +m[2];
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      let ano = m[3] ? +m[3] : hoje.getFullYear();
      if (ano < 100) ano += 2000;
      f.anoExplicito = !!m[3];
      f.marcar(m.index, m.index + m[0].length);
      return paraISO(new Date(ano, mes - 1, dia));
    }
  }

  // "12 de março", "dia 12 de março"
  const nomesMes = Object.keys(MESES).join('|');
  m = f.achar(new RegExp('\\b(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(' + nomesMes + ')\\b'));
  if (m) {
    const dia = +m[1], mes = MESES[m[2]];
    let ano = hoje.getFullYear();
    if (mes < hoje.getMonth() + 1) ano++;   // mês já passou: é do ano que vem
    f.marcar(m.index, m.index + m[0].length);
    return paraISO(new Date(ano, mes - 1, dia));
  }

  // "dia 12" — este mês se ainda não passou, senão o mês que vem
  m = f.achar(/\bdia\s+(\d{1,2})\b/);
  if (m) {
    const dia = +m[1];
    if (dia >= 1 && dia <= 31) {
      let d = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      if (d < hoje && d.toDateString() !== hoje.toDateString()) d = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
      f.marcar(m.index, m.index + m[0].length);
      return paraISO(d);
    }
  }

  // dias da semana: "quinta", "na sexta", "próxima segunda", "sexta que vem"
  const nomesDia = Object.keys(DIAS_SEMANA).join('|');
  m = f.achar(new RegExp('\\b(proxim[ao]\\s+|essa\\s+|esse\\s+|na\\s+|no\\s+)?(' + nomesDia + ')(?:[\\s-]feira)?(\\s+que\\s+vem)?\\b'));
  if (m) {
    const alvo = DIAS_SEMANA[m[2]];
    const forcarProxima = !!(m[3] || (m[1] && m[1].startsWith('proxim')));
    let delta = (alvo - hoje.getDay() + 7) % 7;
    if (forcarProxima && delta === 0) delta = 7;
    f.marcar(m.index, m.index + m[0].length);
    return paraISO(somarDias(hoje, delta));
  }

  // "mês que vem"
  m = f.achar(/\bmes\s+que\s+vem\b/);
  if (m) {
    f.marcar(m.index, m.index + m[0].length);
    const d = new Date(hoje); d.setMonth(d.getMonth() + 1);
    return paraISO(d);
  }

  return null;
}

/* ---------- valor ---------- */

function numeroBR(txt) {
  let s = txt.replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');   // 1.200 = mil e duzentos
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function acharValor(f) {
  const tentativas = [
    /\br\$\s*(\d[\d.]*(?:,\d{1,2})?)/,
    /\b(\d[\d.]*(?:,\d{1,2})?)\s*(?:reais|real|conto|contos|pila)\b/,
    /\b(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)\b/,
    /\b(\d+,\d{1,2})\b/,
    /\b(\d+)\b/
  ];
  for (const re of tentativas) {
    const m = f.achar(re);
    if (m) {
      const v = numeroBR(m[1]);
      if (v !== null && v > 0) {
        f.marcar(m.index, m.index + m[0].length);
        return v;
      }
    }
  }
  return null;
}

/* ---------- intenção e categoria ---------- */

function acharPalavra(f, lista) {
  for (const p of lista) {
    const re = new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    const m = f.achar(re);
    if (m) return { palavra: p, index: m.index, tamanho: m[0].length };
  }
  return null;
}

function acharCategoria(texto, aprendidas, entrada) {
  const t = semAcento(texto);
  for (const [palavra, cat] of Object.entries(aprendidas || {})) {
    if (new RegExp('\\b' + palavra + '\\b').test(t)) return cat;
  }
  const tabela = entrada ? CATEGORIAS_RECEITA : CATEGORIAS;
  for (const [cat, palavras] of Object.entries(tabela)) {
    for (const p of palavras) {
      if (new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t)) return cat;
    }
  }
  return null;
}

/* ---------- limpeza do título ---------- */

const PREPOSICOES = ['de','do','da','dos','das','com','no','na','nos','nas','em','para','pra',
                     'pro','a','ao','o','os','as','e','que','um','uma','ate','por'];

function limparTitulo(texto) {
  let partes = texto.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  while (partes.length && PREPOSICOES.includes(semAcento(partes[0]))) partes.shift();
  while (partes.length && PREPOSICOES.includes(semAcento(partes[partes.length - 1]))) partes.pop();
  let s = partes.join(' ').replace(/[\s,;.\-]+$/, '');
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- a função principal ---------- */

function interpretar(textoOriginal, opcoes = {}) {
  const hoje = opcoes.hoje || new Date();
  const aprendidas = opcoes.aprendidas || {};
  const f = new Frase(textoOriginal.trim());

  const hora = acharHora(f);
  const data = acharData(f, hoje);
  const valor = acharValor(f);

  const receita = acharPalavra(f, PALAVRAS.receita);
  const gasto = receita ? null : acharPalavra(f, PALAVRAS.gasto);
  const compromisso = acharPalavra(f, PALAVRAS.compromisso);
  const tarefaMeta = acharPalavra(f, PALAVRAS.tarefaMeta);
  const tarefaAcao = acharPalavra(f, PALAVRAS.tarefaAcao);
  const tarefa = tarefaMeta || tarefaAcao;

  let tipo;
  if (receita && valor !== null) tipo = 'receita';
  else if (gasto && valor !== null) tipo = 'gasto';
  else if (hora) tipo = 'compromisso';
  else if (compromisso) tipo = 'compromisso';
  else if (tarefa) tipo = 'tarefa';
  else if (valor !== null) tipo = 'gasto';
  else if (data) tipo = 'tarefa';
  else tipo = 'nota';

  // Tira do título só o verbo que revelou a intenção — o resto do texto fica.
  const marcaVerbo = (tipo === 'receita' && receita) || (tipo === 'gasto' && gasto) ||
                     (['tarefa', 'compromisso', 'nota'].includes(tipo) && tarefaMeta) || null;
  if (marcaVerbo) f.marcar(marcaVerbo.index, marcaVerbo.index + marcaVerbo.tamanho);

  const sobra = f.sobra();
  const titulo = limparTitulo(sobra) || limparTitulo(textoOriginal) || 'Sem título';

  const item = {
    tipo,
    titulo,
    texto: textoOriginal.trim(),
    valor: (tipo === 'gasto' || tipo === 'receita') ? valor : null,
    categoria: null,
    data: data || ((tipo === 'gasto' || tipo === 'receita') ? paraISO(hoje) : null),
    hora,
    feito: false
  };

  // "12/03" dito em setembro, para algo que ainda vai acontecer, é do ano que vem.
  if (item.data && !f.anoExplicito && (tipo === 'compromisso' || tipo === 'tarefa')) {
    const hojeISO = paraISO(hoje);
    if (item.data < hojeISO) {
      const [a, me, di] = item.data.split('-').map(Number);
      item.data = paraISO(new Date(a + 1, me - 1, di));
    }
  }

  // Marcou hora mas não disse o dia: é hoje.
  if (item.hora && !item.data) item.data = paraISO(hoje);

  if (item.valor !== null) {
    item.categoria = acharCategoria(textoOriginal, aprendidas, tipo === 'receita') || 'Outros';
  }
  return item;
}
