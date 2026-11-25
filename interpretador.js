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

/* ---------- "daqui a 40 minutos" (hora contada a partir de agora) ---------- */

const NUMEROS_FALADOS = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20,
  'vinte e cinco': 25, trinta: 30, quarenta: 40, 'quarenta e cinco': 45, cinquenta: 50
};

/* "daqui a 40 minutos", "daqui 2 horas", "em meia hora", "dentro de 1h30",
   "daqui a uma hora e meia", "daqui a 2 horas e 15", "daqui uns 20 min".
   Devolve a data e a hora já somadas ao relógio de agora. */
function acharDaqui(f, agora) {
  const num = '(\\d{1,3}|' + Object.keys(NUMEROS_FALADOS).sort((a, b) => b.length - a.length).join('|') + ')';
  const valorDe = t => /^\d/.test(t) ? +t : NUMEROS_FALADOS[t];
  const inicio = '\\b(?:daqui\\s+(?:a\\s+|uns\\s+|umas\\s+)?|dentro\\s+de\\s+|em\\s+(?:uns\\s+|umas\\s+)?)';
  const tentativas = [
    // "1h30", "2h15min"
    [new RegExp(inicio + '(\\d{1,2})\\s*h\\s*([0-5]?\\d)\\s*(?:min(?:utos?)?)?\\b'), m => +m[1] * 60 + +m[2]],
    // "meia hora"
    [new RegExp(inicio + 'meia\\s+hora\\b'), () => 30],
    // "uma hora e meia", "2 horas e 15 (minutos)", "3 horas", "40 minutos", "20 min"
    [new RegExp(inicio + num + '\\s*(horas?|hs?|minutos?|mins?)\\b(?:\\s+e\\s+(meia|' + num.slice(1, -1) + ')(?:\\s*(?:minutos?|mins?))?\\b)?'), m => {
      const n = valorDe(m[1]);
      if (/^m/.test(m[2])) return n;
      const extra = m[3] ? (m[3] === 'meia' ? 30 : valorDe(m[3])) : 0;
      return n * 60 + (extra || 0);
    }]
  ];
  for (const [re, minutos] of tentativas) {
    const m = f.achar(re);
    if (!m) continue;
    const total = minutos(m);
    if (!total || total > 72 * 60) continue;
    f.marcar(m.index, m.index + m[0].length);
    const d = new Date(agora.getTime() + total * 60000);
    return { data: paraISO(d), hora: comZero(d.getHours()) + ':' + comZero(d.getMinutes()) };
  }
  return null;
}

/* ---------- "a cada 20 minutos" (aviso que se repete) ---------- */

const INTERVALO_MIN = 5;            // menos que isso vira barulho (e o Android atrasa mesmo)
const INTERVALO_MAX = 12 * 60;
const REPETIR_PADRAO = 3 * 60;      // sem dizer até quando: 3 horas, para não tocar o dia inteiro esquecido
const FIM_DO_DIA = '22:00';         // "o dia todo"

/* "a cada 20 minutos", "a cada meia hora", "a cada hora", "a cada 1h30",
   "de 20 em 20 minutos", "de meia em meia hora", "de hora em hora", "de 2 em 2 horas".
   E até quando: "até as 18h", "por 2 horas", "durante 1 hora", "o dia todo".
   Devolve { cada, ateHora?, porMin?, diaTodo? } em minutos, ou null. */
function acharIntervalo(f) {
  const num = '(\\d{1,3}|' + Object.keys(NUMEROS_FALADOS).sort((a, b) => b.length - a.length).join('|') + ')';
  const valorDe = t => /^\d/.test(t) ? +t : NUMEROS_FALADOS[t];
  const unidade = (n, u) => /^m/.test(u) ? n : n * 60;
  const tentativas = [
    [new RegExp('\\ba\\s+cada\\s+(\\d{1,2})\\s*h\\s*([0-5]?\\d)\\s*(?:min(?:utos?)?)?\\b'), m => +m[1] * 60 + +m[2]],
    [/\b(?:a\s+cada|de)\s+meia\s+(?:em\s+meia\s+)?hora\b/, () => 30],
    [/\b(?:a\s+cada\s+hora|de\s+hora\s+em\s+hora|toda\s+hora)\b/, () => 60],
    [new RegExp('\\ba\\s+cada\\s+' + num + '\\s*(horas?|hs?|minutos?|mins?)\\b'), m => unidade(valorDe(m[1]), m[2])],
    [new RegExp('\\bde\\s+' + num + '\\s+em\\s+' + num + '\\s*(horas?|hs?|minutos?|mins?)\\b'), m => unidade(valorDe(m[1]), m[3])]
  ];
  let cada = null;
  for (const [re, minutos] of tentativas) {
    const m = f.achar(re);
    if (!m) continue;
    const n = minutos(m);
    if (!n || n < INTERVALO_MIN || n > INTERVALO_MAX) continue;
    f.marcar(m.index, m.index + m[0].length);
    cada = n;
    break;
  }
  if (!cada) return null;
  const r = { cada };

  // Até quando. Só procura isso se houver repetição: "até sexta" de uma tarefa comum fica como está.
  let m = f.achar(/\bate\s+(?:as\s+)?([01]?\d|2[0-3])\s*(?:[:h]\s*([0-5]\d)|h(?:oras?)?)\b/) ||
          f.achar(/\bate\s+as\s+([01]?\d|2[0-3])\b()/);
  if (m) { f.marcar(m.index, m.index + m[0].length); r.ateHora = comZero(+m[1]) + ':' + comZero(+(m[2] || 0)); return r; }
  m = f.achar(/\bate\s+(?:a\s+)?meia[\s-]?noite\b/);
  if (m) { f.marcar(m.index, m.index + m[0].length); r.ateHora = '23:59'; return r; }
  m = f.achar(new RegExp('\\b(?:por|durante|pelas?\\s+proximas?)\\s+(?:(?:as|os)\\s+)?' + num + '\\s*(horas?|hs?|minutos?|mins?)\\b'));
  if (m) { f.marcar(m.index, m.index + m[0].length); r.porMin = unidade(valorDe(m[1]), m[2]); return r; }
  m = f.achar(/\b(?:por\s+|durante\s+)?(?:o|todo\s+o)\s+dia\s+(?:todo|inteiro)\b|\bo\s+dia\s+todo\b|\btodo\s+o\s+dia\b/);
  if (m) { f.marcar(m.index, m.index + m[0].length); r.diaTodo = true; }
  return r;
}

/* Tira do título o pedido de aviso que acompanha a repetição:
   "me lembre disso", "me avise", "lembrar de", "me notifique". */
function marcarPedidoDeAviso(f) {
  const res = [/\b(?:me\s+)?lembr\w*(?:-me)?(?:\s+(?:disso|isso|de|que))?\b/,
               /\bme\s+(?:avis\w*|notifi\w*|cutuc\w*)(?:\s+(?:disso|isso|de|que|para|pra))?\b/,
               /\b(?:avis\w*|notifi\w*)-me(?:\s+(?:disso|isso|de|que))?\b/];
  for (const re of res) {
    const m = f.achar(re);
    if (m) f.marcar(m.index, m.index + m[0].length);
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

/* ---------- parcelas e contas fixas ---------- */

const NUM = '(\\d[\\d.]*(?:,\\d{1,2})?)';

/* "em 10x", "em 10 vezes", "parcelado em 12", "10x de 120", "em 3x sem juros".
   Devolve { n, parcela } — parcela só quando a frase diz o valor de cada uma. */
/* Número de parcelas dito por extenso: o microfone do Android escreve
   "em quatro vezes", não "em 4 vezes". */
const PARCELAS_FALADAS = {
  dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
  'vinte e quatro': 24, trinta: 30, 'trinta e seis': 36, 'quarenta e oito': 48
};

/* "em 4x", "em 4 vezes", "em quatro vezes", "parcelado em 4x", "dividido em 4 vezes",
   "parcelei o sapato em 4", "no cartão em 4x", "em 4 parcelas/prestações",
   "4x de 50", "4 parcelas de 50", "sem juros". */
function acharParcelas(f) {
  const palavras = Object.keys(PARCELAS_FALADAS).sort((a, b) => b.length - a.length).join('|');
  const N = '(\\d{1,2}|' + palavras + ')';
  const qtd = t => /^\d/.test(t) ? +t : PARCELAS_FALADAS[t];
  const verbo = '(?:(?:parcelad[oa]s?|dividid[oa]s?|parcelei|dividi|pag[oa]s?|paguei)\\s+)?';
  const cartao = '(?:(?:no|pelo)\\s+cartao(?:\\s+de\\s+credito)?\\s+)?';
  const unidade = '(?:x|vezes|parcelas?|prestac(?:ao|oes))';
  const deValor = '(?:\\s+de\\s+(?:r\\$\\s*)?' + NUM + ')?';
  const juros = '(?:\\s+(?:sem|com)\\s+juros)?';
  const tentativas = [
    new RegExp('\\b' + verbo + cartao + 'em\\s+' + N + '\\s*' + unidade + '\\b' + deValor + juros + '\\b'),
    new RegExp('\\b(?:parcelad[oa]s?|dividid[oa]s?)\\s+' + cartao + 'em\\s+' + N + '()\\b' + juros),
    new RegExp('\\b' + N + '\\s*' + unidade + '\\s+de\\s+(?:r\\$\\s*)?' + NUM + juros)
  ];
  for (const re of tentativas) {
    const m = f.achar(re);
    if (!m) continue;
    const n = qtd(m[1]);
    if (!(n >= 2 && n <= 72)) continue;
    f.marcar(m.index, m.index + m[0].length);
    tirarVerboParcela(f);
    return { n, parcela: m[2] ? numeroBR(m[2]) : null };
  }
  // "parcelei o sapato de 200 em 4", "dividi a TV em 10": o verbo vem antes, o "em N" depois.
  const v = f.achar(/\b(parcelei|dividi|parcelad[oa]s?|dividid[oa]s?)\b/);
  if (v) {
    const m = f.achar(new RegExp('\\bem\\s+' + N + '\\b(?!\\s*(?:de\\s+)?(?:' + Object.keys(MESES).join('|') + ')\\b)'));
    if (m && m.index > v.index) {
      const n = qtd(m[1]);
      if (n >= 2 && n <= 72) {
        f.marcar(m.index, m.index + m[0].length);
        tirarVerboParcela(f);
        return { n, parcela: null };
      }
    }
  }
  return null;
}

/* "Dividi o sapato" → "o sapato": o verbo de parcelar não faz parte do título. */
function tirarVerboParcela(f) {
  for (const re of [/\b(parcelei|dividi|parcelad[oa]s?|dividid[oa]s?)\b/, /\b(?:no|pelo)\s+cartao(?:\s+de\s+credito)?\b/]) {
    const m = f.achar(re);
    if (m) f.marcar(m.index, m.index + m[0].length);
  }
}

/* "todo dia 5", "todo santo dia 10", "todo mês", "por mês", "mensal".
   Devolve o dia do mês (ou 0 = "o mesmo dia de hoje"). */
function acharRepeticao(f) {
  let m = f.achar(/\btodo\s+(?:santo\s+)?dia\s+(\d{1,2})(?:\s+de\s+cada\s+mes|\s+de\s+todo\s+mes)?\b/);
  if (m && +m[1] >= 1 && +m[1] <= 31) { f.marcar(m.index, m.index + m[0].length); return +m[1]; }
  m = f.achar(/\b(?:todo\s+mes|todos\s+os\s+meses|por\s+mes|ao\s+mes|mensal(?:mente)?)\b/);
  if (m) { f.marcar(m.index, m.index + m[0].length); return 0; }
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
  // Pedaço só de pontuação (a vírgula que sobrou de "200 reais, parcelado") não conta.
  let partes = texto.replace(/\s+/g, ' ').trim().split(' ').filter(p => /[\p{L}\p{N}]/u.test(p));
  const nua = p => semAcento(p.replace(/[.,;:!?]+$/, ''));
  while (partes.length && PREPOSICOES.includes(nua(partes[0]))) partes.shift();
  while (partes.length && PREPOSICOES.includes(nua(partes[partes.length - 1]))) partes.pop();
  let s = partes.join(' ').replace(/[\s,;.\-]+$/, '');
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- a função principal ---------- */

function interpretar(textoOriginal, opcoes = {}) {
  const hoje = opcoes.hoje || new Date();
  const aprendidas = opcoes.aprendidas || {};
  const f = new Frase(textoOriginal.trim());

  // Antes de hora e data: senão o "dia 5" de "todo dia 5" vira data.
  const repete = acharRepeticao(f);
  const parcelas = acharParcelas(f);
  // "a cada 20 minutos" antes do "daqui": senão o "em 20 minutos" de "de 20 em 20 minutos" vira hora.
  const agora = opcoes.agora || new Date();
  const intervalo = acharIntervalo(f);
  if (intervalo) marcarPedidoDeAviso(f);
  // "daqui a 40 minutos" antes da hora: senão o "2 horas" de "daqui a 2 horas" vira 02:00.
  const daqui = acharDaqui(f, agora);
  const hora = daqui ? daqui.hora : acharHora(f);
  const data = daqui ? daqui.data : acharData(f, hoje);
  let valor = acharValor(f);
  if (parcelas && parcelas.parcela && valor === null) valor = Math.round(parcelas.parcela * parcelas.n * 100) / 100;

  const receita = acharPalavra(f, PALAVRAS.receita);
  const gasto = receita ? null : acharPalavra(f, PALAVRAS.gasto);
  const compromisso = acharPalavra(f, PALAVRAS.compromisso);
  const tarefaMeta = acharPalavra(f, PALAVRAS.tarefaMeta);
  const tarefaAcao = acharPalavra(f, PALAVRAS.tarefaAcao);
  const tarefa = tarefaMeta || tarefaAcao;

  let tipo;
  if (receita && valor !== null) tipo = 'receita';
  else if (gasto && valor !== null) tipo = 'gasto';
  else if (hora || intervalo) tipo = 'compromisso';
  else if (compromisso) tipo = 'compromisso';
  else if (tarefa) tipo = 'tarefa';
  else if (valor !== null) tipo = 'gasto';
  else if (data) tipo = 'tarefa';
  else tipo = 'nota';

  // Dinheiro que repete ou parcelado é sempre dinheiro, mesmo com "pagar" na frase.
  if ((repete !== null || parcelas) && valor !== null) {
    tipo = receita && !parcelas ? 'receita' : 'gasto';
    if (tarefaAcao && tarefaAcao.palavra === 'pagar') f.marcar(tarefaAcao.index, tarefaAcao.index + tarefaAcao.tamanho);
  }

  // Tira do título só o verbo que revelou a intenção — o resto do texto fica.
  const marcaVerbo = (tipo === 'receita' && receita) || (tipo === 'gasto' && gasto) ||
                     (['tarefa', 'compromisso', 'nota'].includes(tipo) && tarefaMeta) || null;
  if (marcaVerbo) f.marcar(marcaVerbo.index, marcaVerbo.index + marcaVerbo.tamanho);

  const sobra = f.sobra();
  // Se só sobrou o verbo (ex.: "salário 4200 todo dia 5"), o título é o próprio verbo/palavra.
  const soVerbo = marcaVerbo ? limparTitulo(textoOriginal.substr(marcaVerbo.index, marcaVerbo.tamanho)) : '';
  const titulo = limparTitulo(sobra) || ((repete !== null || parcelas) && soVerbo) || ((daqui || intervalo) && 'Lembrete') || limparTitulo(textoOriginal) || 'Sem título';

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
  // Hora contada a partir de agora: o aviso toca NA hora, sem antecedência.
  if (daqui) item.naHora = true;

  // "12/03" dito em setembro, para algo que ainda vai acontecer, é do ano que vem.
  if (item.data && !daqui && !f.anoExplicito && (tipo === 'compromisso' || tipo === 'tarefa')) {
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
  if (parcelas && tipo === 'gasto') item.parcelas = parcelas.n;
  if (repete !== null && (tipo === 'gasto' || tipo === 'receita')) {
    item.todoDia = repete || +(item.data || paraISO(hoje)).slice(8, 10);
  }
  if (intervalo && tipo === 'compromisso') aplicarIntervalo(item, intervalo, agora);
  return item;
}

/* Monta a série: o primeiro aviso fica em data/hora (na hora, sem antecedência)
   e item.repetir = { cada: minutos, ate: 'AAAA-MM-DDTHH:MM' }.
   Sem hora dita, começa daqui a "cada" minutos. */
function aplicarIntervalo(item, iv, agora) {
  const deData = (iso, hhmm) => { const [a, m, d] = iso.split('-').map(Number); const [h, mi] = hhmm.split(':').map(Number); return new Date(a, m - 1, d, h, mi); };
  const local = d => paraISO(d) + 'T' + comZero(d.getHours()) + ':' + comZero(d.getMinutes());
  let primeiro, marcado = true;                                // marcado = a pessoa disse quando começa
  if (item.hora) primeiro = deData(item.data || paraISO(agora), item.hora);
  else if (item.data && item.data !== paraISO(agora)) primeiro = deData(item.data, '09:00');   // "amanhã": das 9h
  else { primeiro = new Date(agora.getTime() + iv.cada * 60000); marcado = false; }
  // Começo da contagem do "por 2 horas" e do padrão: agora, ou a hora pedida se for depois.
  const comeco = marcado && primeiro > agora ? primeiro : agora;
  let ate;
  if (iv.ateHora) {
    ate = deData(paraISO(primeiro), iv.ateHora);
    if (ate <= primeiro) ate.setDate(ate.getDate() + 1);      // "das 22h até as 2h"
  } else if (iv.porMin) ate = new Date(comeco.getTime() + iv.porMin * 60000);
  else if (iv.diaTodo) {
    ate = deData(paraISO(primeiro), FIM_DO_DIA);
    if (ate <= primeiro) ate = new Date(primeiro.getTime() + REPETIR_PADRAO * 60000);
  } else ate = new Date(comeco.getTime() + REPETIR_PADRAO * 60000);
  item.data = paraISO(primeiro);
  item.hora = comZero(primeiro.getHours()) + ':' + comZero(primeiro.getMinutes());
  item.naHora = true;
  item.repetir = { cada: iv.cada, ate: local(ate) };
}
