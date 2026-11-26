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
            'despesa','deixei','deu','ficou em','ficou','gastamos','pagamos','compramos'],
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
                'jantar com','cafe com','conversa com','call','videochamada','cabeleireiro',
                'cabelereiro','barbeiro','manicure','exame','viajar','viagem','show','churrasco']
};

/* Categorias de dinheiro por palavra-chave. O app vai somando as que você corrige. */
const CATEGORIAS = {
  'Alimentação': ['almoco','almocei','jantei','lanchei','jantar','janta','cafe','lanche','restaurante','ifood','rappi',
                  'padaria','pizza','hamburguer','acai','sorvete','comida','marmita',
                  'delivery','churrasco','doceria','sushi'],
  'Mercado':     ['mercado','supermercado','feira','hortifruti','sacolao','atacado',
                  'compras do mes','acougue'],
  'Transporte':  ['gasolina','combustivel','posto','abasteci','alcool','etanol','diesel','uber','99','taxi',
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
  /* Devolve um pedaço ao texto (o valor de uma tarefa: "pagar os 50 reais"). */
  desmarcar(inicio, fim) {
    for (let i = inicio; i < fim && i < this.usado.length; i++) this.usado[i] = false;
    this.t = this.t.slice(0, inicio) + semAcento(this.original.slice(inicio, fim)) + this.t.slice(fim);
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

/* Hora dita como se fala: "às duas da tarde", "às 10 e meia", "às sete e quinze",
   "meio-dia e meia", "quinze para as três". Número por extenso é o que o
   microfone do Android costuma escrever. */
const HORAS_FALADAS = {
  uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, onze: 11, doze: 12
};
const MINUTOS_FALADOS = {
  meia: 30, cinco: 5, dez: 10, quinze: 15, vinte: 20, 'vinte e cinco': 25, trinta: 30,
  'trinta e cinco': 35, quarenta: 40, 'quarenta e cinco': 45, cinquenta: 50, 'cinquenta e cinco': 55
};
const PALAVRAS_DE_ACORDAR = /\b(alarm\w*|despert\w*|acord\w*|madrugada|cedo)\b/;

function acharHora(f) {
  const hp = Object.keys(HORAS_FALADAS).join('|');
  const mp = Object.keys(MINUTOS_FALADOS).sort((a, b) => b.length - a.length).join('|');
  const H = '([01]?\\d|2[0-3]|' + hp + ')';
  const valH = t => /^\d/.test(t) ? +t : HORAS_FALADAS[t];
  const valM = t => !t ? 0 : /^\d/.test(t) ? +t : MINUTOS_FALADOS[t];
  const periodo = '(?:\\s*(?:da|de)\\s+(manha|tarde|noite))?';
  // Depois de "às duas" precisa vir algo que não seja um nome: "às duas camisas" não é hora.
  const fimSolto = '(?=\\s*$|\\s*[,.;!?]|\\s+(?:no|na|nos|nas|em|com|pra|pro|para|de|do|da|que|vou|vamos|tenho|tem|temos|preciso|precisa|quero|eu|me|a|o|ir|estar|ligar|buscar|pegar|levar|passar|chegar|sair|ter|tomar|fazer|comprar|marcar|pagar|ver|amanha|hoje|depois|e\\s+(?!meia|' + mp + ')))';
  // tarde/noite viram 13–23h; sem período, 1 a 5 é da tarde (ninguém marca médico às 3 da manhã)
  const ajustar = (h, per, cru) => {
    if ((per === 'tarde' || per === 'noite') && h < 12) return h + 12;
    if (!per && cru && h >= 1 && h <= 5 && !PALAVRAS_DE_ACORDAR.test(f.t)) return h + 12;
    return h;
  };
  const tentativas = [
    // "quinze para as três", "dez pras oito" → 14:45, 19:50
    [new RegExp('\\b(' + mp + '|\\d{1,2})\\s+(?:minutos\\s+)?(?:para|pra|pras)\\s+(?:as\\s+|a\\s+)?' + H + periodo + '\\b'), m => {
      const min = valM(m[1]); const h = ajustar(valH(m[2]), m[3], true) - 1;
      return [h < 0 ? 23 : h, 60 - min];
    }],
    // "às 14h30", "as 14:30", "14h30", "14:30"
    [/\b(?:as\s+)?([01]?\d|2[0-3])\s*[:h]\s*([0-5]\d)\b/, m => [+m[1], +m[2]]],
    // "meio-dia e meia"
    [/\bmeio[\s-]?dia\s+e\s+meia\b/, () => [12, 30]],
    // "às 10 e meia", "às dez e quinze da noite", "10h e meia", "às 7 e 40"
    [new RegExp('\\b(?:as\\s+|a\\s+partir\\s+das\\s+)?' + H + '\\s*(?:h|horas?)?\\s+e\\s+(' + mp + '|[0-5]?\\d)(?:\\s*min(?:utos?)?)?' + periodo + '\\b'), (m, texto) => {
      if (!/^as\s|^a\s/.test(texto) && !/^\d/.test(m[1]) && !m[3]) return null;   // "dez e meia" solto só com "às"
      return [ajustar(valH(m[1]), m[3], !/h/.test(texto)), valM(m[2])];
    }],
    // "às 14h", "14 horas", "às 9h da noite"
    [/\b(?:as\s+)?([01]?\d|2[0-3])\s*h(?:oras?)?(?:\s*(?:da|de)\s+(manha|tarde|noite))?\b/, m => [ajustar(+m[1], m[2], false), 0]],
    // "2 da tarde", "8 da noite", "9 da manhã", "duas da tarde"
    [new RegExp('\\b(?:as\\s+)?' + H + '\\s*(?:da|de)\\s+(manha|tarde|noite)\\b'), m => [ajustar(valH(m[1]), m[2], false), 0]],
    [/\bmeio[\s-]?dia\b/, () => [12, 0]],
    [/\bmeia[\s-]?noite\b/, () => [0, 0]],
    // "às duas", "as cinco no dentista" — por extenso, só com o "às" e sem um nome depois
    [new RegExp('\\bas\\s+(' + hp + ')(?:\\s+horas?)?' + fimSolto), m => [ajustar(valH(m[1]), null, true), 0]],
    // "às 8" — sem o "h". Último recurso, para não roubar número de valor.
    [/\bas\s+([01]?\d|2[0-3])\b(?!\s*[\/.,:\d])/, m => [ajustar(+m[1], null, true), 0]]
  ];
  for (const [re, extrair] of tentativas) {
    const m = f.achar(re);
    if (m) {
      const r = extrair(m, m[0]);
      if (!r) continue;
      const [h, min] = r;
      if (h > 23 || min > 59) continue;
      f.marcar(m.index, m.index + m[0].length);
      return comZero(h) + ':' + comZero(min);
    }
  }
  return null;
}

/* "de manhã", "à tarde", "hoje à noite", "amanhã cedo", "no fim da tarde", "na hora do almoço".
   Só vale quando ninguém disse a hora: dá um horário de referência, e o aviso toca nele. */
const PERIODOS = [
  [/\b(?:bem\s+)?cedo(?:\s+(?:de|pela)\s+manha)?\b/, '08:00'],
  [/\b(?:no\s+|ao\s+)?(?:fim|final)\s+da\s+tarde\b/, '17:00'],
  [/\b(?:no\s+|ao\s+)?(?:fim|final)\s+do\s+dia\b/, '18:00'],
  [/\b(?:no\s+)?(?:comeco|inicio)\s+da\s+tarde\b/, '13:00'],
  [/\b(?:na\s+)?hora\s+do\s+almoco\b/, '12:00'],
  [/\bdepois\s+do\s+almoco\b/, '13:00'],
  [/\b(?:de|pela|na|durante\s+a|a)\s+manha\b/, '09:00'],
  [/\b(?:de|pela|na|durante\s+a|a)\s+tarde\b/, '15:00'],
  [/\b(?:de|pela|na|durante\s+a|a)\s+noite\b/, '19:00'],
  [/\b(?:hoje|amanha)\s+(?=a\s+noite)/, null]   // (só para a ordem; "hoje" já sai na data)
];
function acharPeriodo(f) {
  for (const [re, hora] of PERIODOS) {
    if (!hora) continue;
    const m = f.achar(re);
    if (m) { f.marcar(m.index, m.index + m[0].length); return hora; }
  }
  return null;
}

/* "me avisa meia hora antes", "me lembra 2 horas antes", "com 15 minutos de antecedência",
   "um dia antes". Devolve os minutos (ou null). Vem ANTES da hora: senão o "2 horas"
   de "2 horas antes" vira 02:00. */
function acharAntecedencia(f) {
  const num = '(\\d{1,3}|' + Object.keys(NUMEROS_FALADOS).sort((a, b) => b.length - a.length).join('|') + ')';
  const valorDe = t => /^\d/.test(t) ? +t : NUMEROS_FALADOS[t];
  const pedido = '(?:(?:me\\s+)?(?:avis\\w*|lembr\\w*|notifi\\w*|chama\\w*)(?:-me)?\\s+)?(?:com\\s+)?';
  const depois = '\\s+(?:antes|de\\s+antecedencia)\\b';
  const tentativas = [
    [new RegExp('\\b' + pedido + 'meia\\s+hora' + depois), () => 30],
    [new RegExp('\\b' + pedido + '(?:uma\\s+)?hora\\s+e\\s+meia' + depois), () => 90],
    [new RegExp('\\b' + pedido + '(?:um|1)\\s+dia' + depois), () => 1440],
    [new RegExp('\\b' + pedido + num + '\\s*(horas?|hs?|minutos?|mins?|dias?)' + depois), m =>
      /^d/.test(m[2]) ? valorDe(m[1]) * 1440 : /^m/.test(m[2]) ? valorDe(m[1]) : valorDe(m[1]) * 60],
    [new RegExp('\\b' + pedido + '(?:uma\\s+)?hora' + depois), () => 60]
  ];
  for (const [re, minutos] of tentativas) {
    const m = f.achar(re);
    if (!m) continue;
    const n = minutos(m);
    if (!(n >= 1 && n <= 7 * 1440)) continue;
    f.marcar(m.index, m.index + m[0].length);
    return n;
  }
  return null;
}

/* Começo de frase falada que não é o assunto: "tenho médico" → "Médico",
   "fui no mercado" → "Mercado", "vou buscar o menino" → "Buscar o menino",
   "tô com consulta marcada" → "Consulta". */
const MULETAS = ['eu','marquei','agendei','combinei','tenho','temos','tem','to','tou','estou','estarei','vou','vamos','irei','ir',
                 'estar','fui','fomos','passei','ter','vai','teremos','hoje','agora'];
function tirarMuletas(titulo, tipo) {
  const partes = titulo.split(' ');
  const nua = p => semAcento(p.replace(/[.,;:!?]+$/, ''));
  let i = 0;
  // Em tarefa, "ir ao correio" é a própria tarefa: o "ir" fica.
  const muleta = w => MULETAS.includes(w) && !(tipo === 'tarefa' && (w === 'ir' || w === 'estar'));
  while (i < partes.length - 1 && (muleta(nua(partes[i])) || (i > 0 && PREPOSICOES.includes(nua(partes[i])) && muleta(nua(partes[i - 1]))))) i++;
  let s = partes.slice(i).join(' ').replace(/\s+marcad[ao]s?\b/i, '');
  s = limparTitulo(s);
  return s || titulo;
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

/* ---------- dias da semana que repetem ---------- */

/* "de segunda a sexta", "dias úteis", "todo dia", "fim de semana",
   "toda segunda e quarta", "às terças e quintas", "seg, qua e sex".
   Devolve a lista de dias (0 = domingo … 6 = sábado) ou null.
   Um dia só sem "toda"/plural ("na segunda") é data, não repetição. */
const DIAS_ABREVIADOS = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
function acharSemana(f) {
  const nome = '(domingo|segunda|terca|quarta|quinta|sexta|sabado|dom|seg|ter|qua|qui|sex|sab)(s)?(?:[\\s-]feiras?)?';
  const dia = t => t in DIAS_SEMANA ? DIAS_SEMANA[t] : DIAS_ABREVIADOS[t];
  const marca = (m, dias) => { f.marcar(m.index, m.index + m[0].length); return [...new Set(dias)].sort((a, b) => a - b); };
  let m;
  // "de segunda a sexta", "segunda à sexta", "seg a sex", "de segunda até sábado"
  m = f.achar(new RegExp('\\b(?:(?:toda|todas)\\s+(?:as\\s+)?|de\\s+)?' + nome + '\\s+(?:a|ate)\\s+(?:a\\s+)?' + nome + '\\b'));
  if (m) {
    const ini = dia(m[1]), fim = dia(m[3]), dias = [];
    for (let d = ini; ; d = (d + 1) % 7) { dias.push(d); if (d === fim || dias.length > 7) break; }
    return marca(m, dias);
  }
  m = f.achar(/\b(?:(?:em|nos|nas|todos\s+os|todo|durante\s+os|so\s+nos|so\s+em)\s+)?dias?\s+(?:uteis|util|de\s+semana)\b|\bdurante\s+a\s+semana\b/);
  if (m) return marca(m, [1, 2, 3, 4, 5]);
  m = f.achar(/\b(?:(?:todo|nos|no|aos|ao|em|todo\s+o|todos\s+os|durante\s+o|so\s+no|so\s+nos)\s+)?(?:fim|fins|final|finais)\s+de\s+semana\b/);
  if (m) return marca(m, [0, 6]);
  m = f.achar(/\b(?:todos\s+os\s+dias|todo\s+(?:santo\s+)?dia|diariamente|todo\s+dia\s+da\s+semana)\b(?!\s*\d)/);
  if (m) return marca(m, [0, 1, 2, 3, 4, 5, 6]);
  // lista: "toda segunda e quarta", "às terças e quintas", "segundas, quartas e sextas"
  const lista = new RegExp('\\b((?:toda|todas|todo|todos)\\s+(?:as\\s+|os\\s+)?|as\\s+|aos\\s+|nas\\s+|nos\\s+)?' + nome +
                           '((?:\\s*(?:,|e)\\s*(?:as\\s+|aos\\s+|nas\\s+|nos\\s+)?' + nome.replace(/\((?!\?)/g, '(?:') + ')*)');
  m = f.achar(lista);
  if (m) {
    const resto = m[4] || '';
    const nomes = [m[2]].concat((resto.match(/(domingo|segunda|terca|quarta|quinta|sexta|sabado|dom|seg|ter|qua|qui|sex|sab)/g) || []));
    const plural = !!m[3] || /s(?:[\s-]feiras?)?\b/.test(resto.trim().split(/\s+/).pop() || '') || /feiras/.test(m[0]);
    const toda = m[1] && /^tod/.test(m[1]);
    const varios = nomes.length >= 2 && (plural || toda || /^(as|aos|nas|nos)\s/.test(m[1] || ''));
    if (toda || (plural && m[1] && !/^(nas|nos)\s/.test(m[1]) || (plural && !m[1])) || varios) {
      // "na sexta" e "sexta e sábado" (sem plural) ficam como data
      if (toda || plural || varios) return marca(m, nomes.map(dia));
    }
  }
  return null;
}

/* Próxima vez que cai num desses dias, depois de `desde`. Sem hora: o dia inteiro vale. */
function proximaDaSemana(semana, hora, desde) {
  const [hh, mm] = (hora || '23:59').split(':').map(Number);
  for (let k = 0; k <= 7; k++) {
    const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + k, hh, mm);
    if (semana.includes(d.getDay()) && d > desde) return d;
  }
  return null;
}

/* [1,2,3,4,5] → "de segunda a sexta"; [0..6] → "todo dia"; [0,6] → "fim de semana". */
function rotuloSemana(semana) {
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const l = [...semana].sort((a, b) => a - b), k = l.join();
  if (k === '0,1,2,3,4,5,6') return 'todo dia';
  if (k === '1,2,3,4,5') return 'de segunda a sexta';
  if (k === '1,2,3,4,5,6') return 'de segunda a sábado';
  if (k === '0,6') return 'no fim de semana';
  const n = l.map(d => nomes[d]);
  const inteiro = ['todo domingo', 'toda segunda', 'toda terça', 'toda quarta', 'toda quinta', 'toda sexta', 'todo sábado'];
  return n.length === 1 ? inteiro[l[0]] : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1];
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
        f.posValor = [m.index, m.index + m[0].length];
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
      // "pizzas", "remédios": o plural também conta.
      if (new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b').test(t)) return cat;
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
  // "me avisa 2 horas antes" antes da hora e do daqui: senão o "2 horas" vira 02:00.
  const antecedencia = intervalo ? null : acharAntecedencia(f);
  // "daqui a 40 minutos" antes da hora: senão o "2 horas" de "daqui a 2 horas" vira 02:00.
  const daqui = acharDaqui(f, agora);
  const hora = daqui ? daqui.hora : acharHora(f);
  // "de segunda a sexta", "todo dia": antes da data, senão "segunda" vira um dia só.
  const semana = (daqui || intervalo || parcelas || repete !== null) ? null : acharSemana(f);
  const data = daqui ? daqui.data : acharData(f, hoje);
  // "de manhã", "à noite": só quando não houve hora dita.
  const periodo = (hora || daqui || intervalo) ? null : acharPeriodo(f);
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
  else if (hora || intervalo || semana) tipo = 'compromisso';
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

  // "depois do almoço ir no correio": período do dia é coisa a fazer, não anotação.
  if (periodo && tipo === 'nota') tipo = 'tarefa';
  // Tarefa com dinheiro ("pagar os 50 reais ao João"): o valor volta para o título.
  if (f.posValor && tipo !== 'gasto' && tipo !== 'receita' && !parcelas && repete === null) f.desmarcar(...f.posValor);

  // Tira do título só o verbo que revelou a intenção — o resto do texto fica.
  const marcaVerbo = (tipo === 'receita' && receita) || (tipo === 'gasto' && gasto) ||
                     (['tarefa', 'compromisso', 'nota'].includes(tipo) && tarefaMeta) || null;
  if (marcaVerbo) f.marcar(marcaVerbo.index, marcaVerbo.index + marcaVerbo.tamanho);

  const sobra = f.sobra();
  // Se só sobrou o verbo (ex.: "salário 4200 todo dia 5"), o título é o próprio verbo/palavra.
  const soVerbo = marcaVerbo ? limparTitulo(textoOriginal.substr(marcaVerbo.index, marcaVerbo.tamanho)) : '';
  let titulo = limparTitulo(sobra) || ((repete !== null || parcelas) && soVerbo) || ((daqui || intervalo) && 'Lembrete') || limparTitulo(textoOriginal) || 'Sem título';
  if (tipo !== 'nota') titulo = tirarMuletas(titulo, tipo);

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
  // "à noite", "de manhã": hora de referência, e o aviso toca nela (não 1 h antes de um palpite).
  if (periodo && (tipo === 'compromisso' || tipo === 'tarefa')) { item.hora = periodo; item.naHora = true; item.periodo = true; }
  // "me avisa meia hora antes": só esse aviso, no lugar do padrão dos Ajustes.
  if (antecedencia && (tipo === 'compromisso' || tipo === 'tarefa')) item.avisoAntes = antecedencia;

  // "12/03" dito em setembro, para algo que ainda vai acontecer, é do ano que vem.
  if (item.data && !daqui && !f.anoExplicito && (tipo === 'compromisso' || tipo === 'tarefa')) {
    const hojeISO = paraISO(hoje);
    if (item.data < hojeISO) {
      const [a, me, di] = item.data.split('-').map(Number);
      item.data = paraISO(new Date(a + 1, me - 1, di));
    }
  }

  // Repete nos dias da semana: a data é a PRÓXIMA vez (hoje, se ainda não passou a hora).
  if (semana && (tipo === 'compromisso' || tipo === 'tarefa')) {
    item.semana = semana;
    const ref = opcoes.agora || hoje;
    const desde = item.data ? new Date(Math.max(ref, new Date(item.data + 'T00:00') - 1)) : ref;
    const prox = proximaDaSemana(semana, item.hora, desde);
    if (prox) item.data = paraISO(prox);
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
