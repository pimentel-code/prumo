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

// ---- parcelas ----
prova('"TV 1.200 em 10x" entende 10 parcelas', () => { const r = interpretar('comprei a TV 1.200 em 10x'); return r.tipo === 'gasto' && r.valor === 1200 && r.parcelas === 10 && r.titulo === 'TV'; });
prova('"10x de 120" calcula o total', () => { const r = interpretar('celular em 10x de 120'); return r.valor === 1200 && r.parcelas === 10; });
prova('parcelas viram um lançamento por mês', () => {
  const antes = Dados.itens().length;
  const r = interpretar('geladeira 1.000 em 3x'); r.data = '2026-01-31';
  const ps = criarParcelas(r);
  return Dados.itens().length === antes + 3 && ps.map(p => p.data).join() === '2026-01-31,2026-02-28,2026-03-31' &&
         ps.every(p => p.grupo === ps[0].grupo) && ps[2].parcela === '3/3' &&
         Math.round(ps.reduce((t, p) => t + p.valor, 0) * 100) === 100000 && ps[0].valor === 333.33 && ps[2].valor === 333.34;
});
prova('parcela futura fica em "Ainda vai sair", não em "Saiu"', () => {
  const r = interpretar('sofá 600 em 2x'); const ps = criarParcelas(r);
  const prox = dataDe(ps[1].data); App.mesRef = { ano: prox.getFullYear(), mes: prox.getMonth() };
  const tela = telaDinheiro(); App.mesRef = { ano: new Date().getFullYear(), mes: new Date().getMonth() };
  return tela.includes('Ainda vai sair') && tela.includes('parcela 2/2');
});

// ---- contas fixas ----
prova('"aluguel 900 todo dia 5" vira conta fixa', () => { const r = interpretar('aluguel 900 todo dia 5'); return r.tipo === 'gasto' && r.valor === 900 && r.todoDia === 5 && r.titulo === 'Aluguel'; });
prova('"salário 4200 todo dia 5" é entrada fixa', () => { const r = interpretar('salário 4200 todo dia 5'); return r.tipo === 'receita' && r.todoDia === 5 && r.titulo === 'Salário'; });
prova('"pagar internet 100 todo dia 15" é conta, não tarefa', () => { const r = interpretar('pagar internet 100 todo dia 15'); return r.tipo === 'gasto' && r.titulo === 'Internet'; });
prova('conta fixa aparece no Dinheiro com "Paguei" e entra no "vai sair"', () => {
  const hoje = new Date();
  const f = Dados.adicionarFixa({ tipo: 'gasto', titulo: 'Escola do filho', valor: 650, categoria: 'Educação', dia: 28, desde: hojeISO().slice(0, 7) });
  App.mesRef = { ano: hoje.getFullYear(), mes: hoje.getMonth() };
  const tela = telaDinheiro();
  const ok = tela.includes('Escola do filho') && tela.includes('Paguei') && tela.includes('Ainda vai sair');
  pagarFixa(f.id, hojeISO().slice(0, 7));
  const depois = telaDinheiro();
  return ok && depois.includes('✓ pago') && fixasDoMes(hoje.getFullYear(), hoje.getMonth()).find(x => x.fixa.id === f.id).pago;
});
prova('backup leva as contas fixas', () => JSON.parse(Dados.exportar()).fixas.length >= 1);

// ---- revisão do que ficou para trás ----
prova('Hoje mostra o convite para arrumar os atrasados', () => telaHoje().includes('ficou para trás') || telaHoje().includes('ficaram para trás'));
prova('revisão: "Amanhã" tira da lista de atrasados', () => {
  const t = Dados.adicionar({ tipo: 'tarefa', titulo: 'Revisar contrato', data: mais(-2), feito: false });
  abrirRevisao();
  while (App.revisao.ids[App.revisao.i] !== t.id) App.revisao.i++;
  responderRevisao('amanha');
  return Dados.itens().find(i => i.id === t.id).data === mais(1) && !eAtrasado(Dados.itens().find(i => i.id === t.id));
});
prova('revisão: "Já fiz" e "Apagar"', () => {
  const a = Dados.adicionar({ tipo: 'tarefa', titulo: 'A', data: mais(-1), feito: false });
  const b = Dados.adicionar({ tipo: 'tarefa', titulo: 'B', data: mais(-1), feito: false });
  abrirRevisao();
  while (App.revisao.ids[App.revisao.i] !== a.id) App.revisao.i++;
  responderRevisao('feito');
  App.revisao.i = App.revisao.ids.indexOf(b.id);
  responderRevisao('apagar');
  return Dados.itens().find(i => i.id === a.id).feito === true && !Dados.itens().some(i => i.id === b.id);
});

print('');
print(falhas ? falhas + ' PROBLEMA(S)' : 'tudo passou');
