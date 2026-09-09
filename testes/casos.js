const HOJE = new Date(2026, 8, 7);  // 7 de setembro de 2026
const nomes = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
print('hoje = 2026-09-07, ' + nomes[HOJE.getDay()]);
print('');

const casos = [
  'paguei 180 de conta de luz',
  'almoço 45 ontem',
  'recebi 3.200 do salário',
  'audiência dia 12 às 14h',
  'dentista quinta 15h',
  'lembrar de levar o carro na revisão',
  'pegar certidão até sexta',
  'gasolina 200',
  'R$ 1.234,56 no mercado',
  'reunião amanhã às 9h',
  'comprar pão',
  'netflix 55,90',
  'aniversário da minha mãe dia 3 de outubro',
  'almoço com o Dr. Silva meio-dia',
  'consulta 12/03 às 8h',
  'farmácia 87,40 anteontem',
  'preciso protocolar a escritura segunda que vem',
  'uber 23',
  'recebi 500 de honorários',
  'ligar para o contador',
  'condomínio 480 dia 10',
  'a chave do cofre fica na gaveta de cima',
  'prova daqui a 15 dias',
  'jantar 8 da noite'
];

for (const c of casos) {
  const r = interpretar(c, { hoje: HOJE });
  const v = r.valor === null ? '—' : r.valor.toFixed(2);
  print(
    c.padEnd(44) + ' → ' +
    r.tipo.padEnd(12) +
    ' | ' + (r.valor === null ? '' : 'R$ ' + v).padEnd(12) +
    ' | ' + (r.categoria || '').padEnd(13) +
    ' | ' + (r.data || '').padEnd(11) +
    ' | ' + (r.hora || '').padEnd(6) +
    ' | ' + r.titulo
  );
}
