const HOJE = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const mais = n => { const d = new Date(HOJE); d.setDate(d.getDate()+n); return iso(d); };

const frases = [
  'paguei 180 de conta de luz', 'almoço 45 ontem', 'recebi 3.200 do salário',
  'audiência dia 12 às 14h', 'dentista quinta 15h', 'lembrar de levar o carro na revisão',
  'gasolina 200', 'netflix 55,90', 'comprar pão', 'a chave do cofre fica na gaveta'
];
frases.forEach(f => Dados.adicionar(interpretar(f)));
// um item vencido, para testar o "atrasado"
Dados.adicionar({ tipo:'tarefa', titulo:'Entregar a certidão', texto:'', valor:null,
                  categoria:null, data: mais(-3), hora:null, feito:false });

let falhas = 0;
function prova(nome, fn) {
  try {
    const r = fn();
    if (r === false) { print('FALHOU  ' + nome); falhas++; }
    else print('ok      ' + nome + (typeof r === 'string' ? '  (' + r.length + ' caracteres de HTML)' : ''));
  } catch (e) { print('ERRO    ' + nome + ' → ' + e.message); falhas++; }
}

prova('tela Hoje', () => telaHoje());
prova('tela Dinheiro', () => telaDinheiro());
prova('tela Agenda', () => telaAgenda());
prova('tela Tarefas', () => telaTarefas());
prova('busca', () => { App.busca = 'luz'; const r = telaBusca(); App.busca = null; return r; });
prova('render sem quebrar', () => { render(); return true; });

prova('dinheiro somou certo', () => {
  const h = telaDinheiro();
  return h.includes('180,00') && h.includes('3.200,00');
});
prova('atrasado aparece', () => telaHoje().includes('atrasado'));
prova('botão de calendário na agenda', () => telaAgenda().includes('Pôr no calendário'));
prova('escapa HTML perigoso', () => {
  const mau = Dados.adicionar(interpretar('lembrar de <script>alert(1)</script>'));
  const saiu = telaTarefas().includes('&lt;script&gt;') && !telaTarefas().includes('<script>');
  Dados.remover(mau.id);
  return saiu;
});
prova('backup e restauração', () => {
  const antes = Dados.itens().length;
  const pacote = Dados.exportar();
  Dados.apagarTudo();
  if (Dados.itens().length !== 0) return false;
  const n = Dados.importar(pacote, 'substituir');
  return n === antes && Dados.itens().length === antes;
});
prova('aprende categoria corrigida', () => {
  Dados.aprender('sushi do jantar', 'Lazer');
  const r = interpretar('sushi 90', { aprendidas: Dados.carregar().aprendidas });
  return r.categoria === 'Lazer';
});
prova('recusa arquivo que não é backup', () => {
  try { Dados.importar('{"nada":1}', 'juntar'); return false; }
  catch (e) { return e.message.includes('não parece'); }
});
prova('moeda em português', () => fmtMoeda(1234.5).includes('1.234,50'));

print('');
print(falhas ? falhas + ' PROBLEMA(S)' : 'tudo passou');
