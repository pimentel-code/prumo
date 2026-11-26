/* naturais.js — frases ditas do jeito que se fala com outra pessoa (25/11/2026).
   Pedido dele: "preciso estar às 14h no médico" tem que virar compromisso sem
   precisar falar mecanizado ("me lembrar, 14h, médico"). Cada linha é uma frase
   e o que o Prumo deve entender. Se mexer no interpretador, todas têm que passar.
   Hoje fixo: quarta, 25/11/2026, 9h. */
const AGORA_N = new Date(2026, 10, 25, 9, 0);
const NATURAIS = [
  ["me lembrar às 14h de marcar dentista", {"tipo":"compromisso","titulo":"Marcar dentista","data":"2026-11-25","hora":"14:00"}],
  ["preciso estar às 14h no médico", {"tipo":"compromisso","titulo":"Médico","data":"2026-11-25","hora":"14:00"}],
  ["tenho médico amanhã às 14h", {"tipo":"compromisso","titulo":"Médico","data":"2026-11-26","hora":"14:00"}],
  ["amanhã tenho que ir no médico às duas da tarde", {"tipo":"compromisso","titulo":"Médico","data":"2026-11-26","hora":"14:00"}],
  ["às 3 da tarde vou buscar o menino na escola", {"tipo":"compromisso","titulo":"Buscar o menino na escola","data":"2026-11-25","hora":"15:00"}],
  ["não posso esquecer de pagar a luz sexta", {"tipo":"tarefa","titulo":"Pagar a luz","data":"2026-11-27"}],
  ["quinta que vem tenho reunião com o contador às 9", {"tipo":"compromisso","titulo":"Reunião com o contador","data":"2026-11-26","hora":"09:00"}],
  ["o aniversário da minha mãe é dia 12 de dezembro", {"tipo":"compromisso","titulo":"Aniversário da minha mãe","data":"2026-12-12"}],
  ["gastei 10 reais na padaria", {"tipo":"gasto","titulo":"Padaria","data":"2026-11-25","valor":10,"categoria":"Alimentação"}],
  ["deixei 50 conto no posto", {"tipo":"gasto","titulo":"Posto","data":"2026-11-25","valor":50,"categoria":"Transporte"}],
  ["fui no mercado e deu 230", {"tipo":"gasto","titulo":"Mercado","data":"2026-11-25","valor":230,"categoria":"Mercado"}],
  ["o almoço hoje saiu 35", {"tipo":"gasto","titulo":"Almoço","data":"2026-11-25","valor":35,"categoria":"Alimentação"}],
  ["recebi 1500 do cliente", {"tipo":"receita","titulo":"Cliente","data":"2026-11-25","valor":1500,"categoria":"Outros"}],
  ["daqui a 40 minutos tirar o bolo do forno", {"tipo":"compromisso","titulo":"Tirar o bolo do forno","data":"2026-11-25","hora":"09:40","naHora":true}],
  ["me avisa meia hora antes da consulta das 16h amanhã", {"tipo":"compromisso","titulo":"Consulta","data":"2026-11-26","hora":"16:00","avisoAntes":30}],
  ["vou ao dentista dia 3 às 10 e meia", {"tipo":"compromisso","titulo":"Dentista","data":"2026-12-03","hora":"10:30"}],
  ["semana que vem preciso renovar a CNH", {"tipo":"tarefa","titulo":"Renovar a CNH","data":"2026-12-02"}],
  ["hoje à noite ligar pro João", {"tipo":"tarefa","titulo":"Ligar pro João","data":"2026-11-25","hora":"19:00","naHora":true}],
  ["tô com consulta marcada pra terça de manhã", {"tipo":"compromisso","titulo":"Consulta","data":"2026-12-01","hora":"09:00","naHora":true}],
  ["comprar pão quando voltar", {"tipo":"tarefa","titulo":"Comprar pão quando voltar"}],
  ["amanhã às duas eu tenho dentista", {"tipo":"compromisso","titulo":"Dentista","data":"2026-11-26","hora":"14:00"}],
  ["tenho que estar no cartório às oito e meia", {"tipo":"compromisso","titulo":"Cartório","data":"2026-11-25","hora":"08:30"}],
  ["consulta com a doutora Ana sexta às quinze para as três", {"tipo":"compromisso","titulo":"Consulta com a doutora Ana","data":"2026-11-27","hora":"14:45"}],
  ["marquei o cabelereiro pro sábado às dez", {"tipo":"compromisso","titulo":"Cabelereiro","data":"2026-11-28","hora":"10:00"}],
  ["sexta tem a reunião do condomínio às sete da noite", {"tipo":"compromisso","titulo":"Reunião do condomínio","data":"2026-11-27","hora":"19:00"}],
  ["dia 15 tenho prova de inglês às 19h30", {"tipo":"compromisso","titulo":"Prova de inglês","data":"2026-12-15","hora":"19:30"}],
  ["às cinco preciso buscar a Maria na escola", {"tipo":"compromisso","titulo":"Buscar a Maria na escola","data":"2026-11-25","hora":"17:00"}],
  ["hoje de tarde passar no banco", {"tipo":"tarefa","titulo":"Passar no banco","data":"2026-11-25","hora":"15:00","naHora":true}],
  ["amanhã cedo levar o carro na oficina", {"tipo":"tarefa","titulo":"Levar o carro na oficina","data":"2026-11-26","hora":"08:00","naHora":true}],
  ["no fim da tarde ligar para o cliente", {"tipo":"tarefa","titulo":"Ligar para o cliente","data":"2026-11-25","hora":"17:00","naHora":true}],
  ["me lembra uma hora antes do voo amanhã às 6h", {"tipo":"compromisso","titulo":"Voo","data":"2026-11-26","hora":"06:00","avisoAntes":60}],
  ["me avisa com 15 minutos de antecedência da reunião às 10h", {"tipo":"compromisso","titulo":"Reunião","data":"2026-11-25","hora":"10:00","avisoAntes":15}],
  ["comprar as duas camisas no shopping", {"tipo":"tarefa","titulo":"Comprar as duas camisas no shopping"}],
  ["comprei duas pizzas por 80 reais", {"tipo":"gasto","titulo":"Duas pizzas","data":"2026-11-25","valor":80,"categoria":"Alimentação"}],
  ["paguei 35 no uber", {"tipo":"gasto","titulo":"Uber","data":"2026-11-25","valor":35,"categoria":"Transporte"}],
  ["almocei e deu 42", {"tipo":"gasto","titulo":"Almocei","data":"2026-11-25","valor":42,"categoria":"Alimentação"}],
  ["abasteci 150", {"tipo":"gasto","titulo":"Abasteci","data":"2026-11-25","valor":150,"categoria":"Transporte"}],
  ["a conta de luz ficou em 230", {"tipo":"gasto","titulo":"Conta de luz","data":"2026-11-25","valor":230,"categoria":"Casa"}],
  ["gastamos 300 no mercado", {"tipo":"gasto","titulo":"Mercado","data":"2026-11-25","valor":300,"categoria":"Mercado"}],
  ["caiu o salário de 4500", {"tipo":"receita","titulo":"Salário","data":"2026-11-25","valor":4500,"categoria":"Salário"}],
  ["reunião às 3", {"tipo":"compromisso","titulo":"Reunião","data":"2026-11-25","hora":"15:00"}],
  ["me acorda às 5", {"tipo":"compromisso","titulo":"Me acorda","data":"2026-11-25","hora":"05:00"}],
  ["aniversário do Pedro sábado", {"tipo":"compromisso","titulo":"Aniversário do Pedro","data":"2026-11-28"}],
  ["pagar o boleto da internet até dia 10", {"tipo":"tarefa","titulo":"Pagar o boleto da internet","data":"2026-12-10"}],
  ["missa domingo às sete e meia", {"tipo":"compromisso","titulo":"Missa","data":"2026-11-29","hora":"07:30"}],
  ["jantar com a Ana hoje à noite", {"tipo":"compromisso","titulo":"Jantar com a Ana","data":"2026-11-25","hora":"19:00","naHora":true}],
  ["depois do almoço ir no correio", {"tipo":"tarefa","titulo":"Ir no correio","data":"2026-11-25","hora":"13:00","naHora":true}],
  ["na hora do almoço passar na farmácia", {"tipo":"tarefa","titulo":"Passar na farmácia","data":"2026-11-25","hora":"12:00","naHora":true}],
  ["lembrar de tomar o remédio às 22h", {"tipo":"compromisso","titulo":"Tomar o remédio","data":"2026-11-25","hora":"22:00"}],
  ["vou ao médico às 14", {"tipo":"compromisso","titulo":"Médico","data":"2026-11-25","hora":"14:00"}],
  ["consulta amanhã às 9 da manhã", {"tipo":"compromisso","titulo":"Consulta","data":"2026-11-26","hora":"09:00"}],
  ["tenho que ir ao dentista às onze", {"tipo":"compromisso","titulo":"Dentista","data":"2026-11-25","hora":"11:00"}],
  ["às 10 e 15 call com o fornecedor", {"tipo":"compromisso","titulo":"Call com o fornecedor","data":"2026-11-25","hora":"10:15"}],
  ["meio-dia e meia almoço com o chefe", {"tipo":"compromisso","titulo":"Almoço com o chefe","data":"2026-11-25","hora":"12:30"}],
  ["vou viajar dia 20 de dezembro", {"tipo":"compromisso","titulo":"Viajar","data":"2026-12-20"}],
  ["levar as duas crianças no médico às 4", {"tipo":"compromisso","titulo":"Levar as duas crianças no médico","data":"2026-11-25","hora":"16:00"}],
  ["ligar pra mãe às nove da noite", {"tipo":"compromisso","titulo":"Ligar pra mãe","data":"2026-11-25","hora":"21:00"}],
  ["comprei um tênis de 300 em 3 vezes", {"tipo":"gasto","titulo":"Tênis","data":"2026-11-25","valor":300,"categoria":"Vestuário"}],
  ["me lembre de pagar o IPTU", {"tipo":"tarefa","titulo":"Pagar o IPTU"}]
,
  // hora de 1 a 5 sem período é da tarde, menos para acordar/alarme
  ["alarme às 3", {"tipo":"compromisso","titulo":"Alarme","data":"2026-11-25","hora":"03:00"}],
  ["dentista às 6", {"tipo":"compromisso","titulo":"Dentista","data":"2026-11-25","hora":"06:00"}],
  ["reunião às 2 da manhã", {"tipo":"compromisso","titulo":"Reunião","data":"2026-11-25","hora":"02:00"}],
  // dias da semana que repetem (alarme diário) — hoje é quarta 25/11, 9h
  ["alarme às 4h45 de segunda a sexta", {"tipo":"compromisso","titulo":"Alarme","data":"2026-11-26","hora":"04:45","semana":[1,2,3,4,5]}],
  ["me acorda 4:45 de segunda à sexta-feira", {"hora":"04:45","semana":[1,2,3,4,5]}],
  ["despertador 4h45 dias úteis", {"hora":"04:45","semana":[1,2,3,4,5]}],
  ["alarme 4h45 seg a sex", {"hora":"04:45","semana":[1,2,3,4,5]}],
  ["alarme às quatro e quarenta e cinco de segunda a sexta", {"hora":"04:45","semana":[1,2,3,4,5]}],
  ["me acorda às 5 e meia de segunda a sábado", {"hora":"05:30","semana":[1,2,3,4,5,6],"data":"2026-11-26"}],
  ["alarme 6h todos os dias", {"hora":"06:00","semana":[0,1,2,3,4,5,6],"data":"2026-11-26"}],
  ["alarme às sete no fim de semana", {"titulo":"Alarme","hora":"07:00","semana":[0,6],"data":"2026-11-28"}],
  ["remédio todo dia às 22h", {"titulo":"Remédio","hora":"22:00","semana":[0,1,2,3,4,5,6],"data":"2026-11-25"}],
  ["toda segunda e quarta academia às 19h", {"titulo":"Academia","hora":"19:00","semana":[1,3],"data":"2026-11-25"}],
  ["às terças e quintas inglês às 18h", {"titulo":"Inglês","hora":"18:00","semana":[2,4],"data":"2026-11-26"}],
  ["toda sexta futebol às 20h", {"titulo":"Futebol","semana":[5],"data":"2026-11-27"}],
  ["segundas, quartas e sextas pilates às 7h", {"titulo":"Pilates","semana":[1,3,5],"data":"2026-11-27"}],
  // vários horários na mesma frase (até 5)
  ["alarme para 4h45 e 4h55 de segunda a sexta", {"titulo":"Alarme","hora":"04:45","maisHoras":["04:55"],"semana":[1,2,3,4,5],"data":"2026-11-26"}],
  ["alarme às 4h45, 4h55 e 5h05 de segunda a sexta", {"hora":"04:45","maisHoras":["04:55","05:05"],"semana":[1,2,3,4,5]}],
  ["me acorda às 5, 5h10, 5h20, 5h30 e 5h40", {"titulo":"Me acorda","hora":"05:00","maisHoras":["05:10","05:20","05:30","05:40"]}],
  ["alarme 6h, 6h05, 6h10, 6h15, 6h20 e 6h25", {"hora":"06:00","maisHoras":["06:05","06:10","06:15","06:20"]}],
  ["alarme às quatro e quarenta e cinco e às quatro e cinquenta e cinco de segunda a sexta", {"hora":"04:45","maisHoras":["04:55"]}],
  ["despertador 4:45 e 4:55 dias úteis", {"hora":"04:45","maisHoras":["04:55"],"semana":[1,2,3,4,5]}],
  ["alarme às 4h55 e 4h45", {"hora":"04:45","maisHoras":["04:55"]}],
  ["tomar remédio às 8h, 14h e 20h todos os dias", {"titulo":"Tomar remédio","hora":"08:00","maisHoras":["14:00","20:00"],"naHora":true}],
  ["reunião às 14h e dentista às 16h", {"hora":"14:00","maisHoras":undefined}],
  ["almoço às 5,50", {"hora":null}],
  // um dia só NÃO repete
  ["dentista na sexta às 15h", {"titulo":"Dentista","data":"2026-11-27","hora":"15:00"}],
  ["pagar a luz segunda", {"tipo":"tarefa","data":"2026-11-30"}]
];

let falhas = 0;
for (const [frase, esperado] of NATURAIS) {
  const r = interpretar(frase, { agora: AGORA_N, hoje: AGORA_N });
  const errado = Object.keys(esperado).filter(k => JSON.stringify(r[k]) !== JSON.stringify(esperado[k]));
  if (errado.length) {
    falhas++;
    print('FALHOU  ' + frase + '\n        ' + errado.map(k => k + ': veio ' + JSON.stringify(r[k]) + ', esperava ' + JSON.stringify(esperado[k])).join('; '));
  }
}
print(falhas ? '\n' + falhas + ' de ' + NATURAIS.length + ' frases faladas falharam' : 'ok      ' + NATURAIS.length + ' frases faladas do jeito natural');
if (falhas) throw new Error(falhas + ' frase(s) falada(s) não entendida(s)');
print('\ntudo passou');
