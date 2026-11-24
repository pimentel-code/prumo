/* Provas do Prumo dentro de um navegador de verdade, em tela de celular.
   O que o teste do gjs não alcança: toque nos botões, telas trocando,
   dado que sobrevive a fechar o app, e o funcionamento sem internet. */

const { test, expect } = require('@playwright/test');

/* Abre o app sempre limpo, como se fosse a primeira vez — mas com o tutorial
   já visto, para ele não ficar na frente das outras provas. */
async function abrirLimpo(page) {
  await page.goto('index.html');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('prumo.tutorial.visto', '1'); localStorage.setItem('prumo.esfera.aoAbrir', 'nao'); });
  await page.reload();
  await expect(page.locator('#campoEntrada')).toBeVisible();
}

/* Escreve a frase, confere a tela de confirmação e guarda. */
async function anotar(page, frase) {
  await page.fill('#campoEntrada', frase);
  await page.press('#campoEntrada', 'Enter');
  await expect(page.locator('.confirma')).toBeVisible();
}

async function guardar(page) {
  await page.click('[data-acao="salvar"]');
  await expect(page.locator('.confirma')).toHaveCount(0);
}

const abaAtiva = page => page.locator('.aba.ativa');

test.beforeEach(async ({ page }) => { await abrirLimpo(page); });

test('abre limpo e explica o que fazer', async ({ page }) => {
  await expect(page.locator('.vazio')).toContainText('Tudo no prumo');
  await expect(page.locator('.aba')).toHaveCount(4);
  await expect(abaAtiva(page)).toContainText('Hoje');
});

test('gasto ditado vira lançamento na aba Dinheiro', async ({ page }) => {
  await anotar(page, 'paguei 180 de conta de luz');

  await expect(page.locator('.chip.ativo')).toHaveText('Saiu');
  await expect(page.locator('#c_valor')).toHaveValue('180');
  await expect(page.locator('#c_categoria')).toHaveValue('Casa');

  await guardar(page);

  await expect(abaAtiva(page)).toContainText('Dinheiro');
  await expect(page.locator('.item-titulo')).toContainText(/luz/i);
  await expect(page.locator('.valor.saiu')).toContainText('180,00');
  await expect(page.locator('.resumo')).toContainText('180,00');
});

test('a barra de busca só aparece quando se toca na lupa', async ({ page }) => {
  const barra = page.locator('#linhaBusca');
  await expect(barra).toBeHidden();          // atributo hidden E invisível de fato
  await page.click('#btBusca');
  await expect(barra).toBeVisible();
  await page.click('#btBusca');
  await expect(barra).toBeHidden();
});

test('nenhuma tela rola de lado, nem com valor alto', async ({ page }) => {
  // Rolagem lateral no celular faz a tela inteira escorregar ao passar o dedo.
  await page.evaluate(() => {
    const item = (t, v, c, dia) => ({ id:'t'+Math.random(), tipo:t, titulo:'financiamento do apartamento',
      valor:v, categoria:c, data:dia, hora:null, feito:false, texto:'', criadoEm:new Date().toISOString() });
    const hoje = new Date().toISOString().slice(0, 10);
    localStorage.setItem('prumo.dados.v1', JSON.stringify({
      itens: [item('receita', 987654.32, 'Salário', hoje), item('gasto', 3874.19, 'Casa', hoje)],
      aprendidas: {}, ultimoBackup: null }));
  });
  await page.reload();

  for (const aba of ['hoje', 'dinheiro', 'agenda', 'tarefas']) {
    await page.click(`.aba[data-aba="${aba}"]`);
    const folga = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(folga, 'a aba ' + aba + ' rola de lado').toBeLessThanOrEqual(0);
  }
});

test('os totais do mês cabem inteiros em valores reais', async ({ page }) => {
  await page.evaluate(() => {
    const item = (t, v, c) => ({ id:'t'+Math.random(), tipo:t, titulo:'x', valor:v, categoria:c,
      data:new Date().toISOString().slice(0,10), hora:null, feito:false, texto:'', criadoEm:'' });
    localStorage.setItem('prumo.dados.v1', JSON.stringify({
      itens: [item('receita', 99999.99, 'Salário'), item('gasto', 12480.55, 'Casa')],
      aprendidas: {}, ultimoBackup: null }));
  });
  await page.reload();
  await page.click('.aba[data-aba="dinheiro"]');

  const caixas = await page.locator('.resumo .numero').evaluateAll(ns =>
    ns.map(n => ({ texto: n.textContent, cortado: n.scrollWidth > n.clientWidth + 1 })));
  expect(caixas).toHaveLength(3);
  for (const c of caixas) expect(c.cortado, 'cortou: ' + c.texto).toBe(false);
});

test('compromisso com hora vai para a Agenda', async ({ page }) => {
  await anotar(page, 'dentista sexta 15h');

  await expect(page.locator('.chip.ativo')).toHaveText('Compromisso');
  await expect(page.locator('#c_hora')).toHaveValue('15:00');
  await expect(page.locator('#c_data')).not.toHaveValue('');

  await guardar(page);

  await expect(abaAtiva(page)).toContainText('Agenda');
  await expect(page.locator('.item-titulo')).toContainText(/dentista/i);
  await expect(page.locator('.item .selo-hora')).toContainText('15:00');
  await page.click('[data-acao="fechar-recado"]');
  await expect(page.locator('#conteudo [data-acao="calendario"]')).toBeVisible();
});

test('tarefa aparece em Tarefas e pode ser marcada como feita', async ({ page }) => {
  await anotar(page, 'lembrar de levar o carro na revisão');
  await expect(page.locator('.chip.ativo')).toHaveText('Tarefa');
  await guardar(page);

  await expect(abaAtiva(page)).toContainText('Tarefas');
  const item = page.locator('.item').first();
  await expect(item).not.toHaveClass(/feito/);

  await item.locator('[data-acao="feito"]').click();
  await expect(page.locator('.item.feito')).toHaveCount(1);
  await expect(page.locator('.secao-titulo').filter({ hasText: 'Feito' })).toBeVisible();
});

test('tarefa com prazo também oferece o calendário', async ({ page }) => {
  // O Prumo não toca alarme sozinho: quem avisa é o calendário do celular.
  // Antes, só compromisso oferecia esse caminho — tarefa não tinha nenhum.
  await anotar(page, 'me lembrar de pagar o IPTU amanhã');
  await expect(page.locator('.chip.ativo')).toHaveText('Tarefa');
  await expect(page.locator('#c_titulo')).toHaveValue('Pagar o IPTU');
  await guardar(page);

  // Na hora, pelo recado; e depois de dispensá-lo, pelo cartão da tarefa.
  await expect(page.locator('.recado [data-acao="calendario"]')).toBeVisible();
  await page.click('[data-acao="fechar-recado"]');
  await expect(page.locator('#conteudo [data-acao="calendario"]')).toBeVisible();
});

test('depois de guardar algo com data, o aviso é oferecido na hora', async ({ page }) => {
  await anotar(page, 'me lembrar de pagar o IPTU amanhã');
  await guardar(page);

  const recado = page.locator('.recado');
  await expect(recado).toBeVisible();
  await expect(recado).toContainText('Quer ser avisado');
  // Enquanto o recado oferece o calendário, o cartão não repete o mesmo botão.
  await expect(page.locator('#conteudo [data-acao="calendario"]')).toHaveCount(0);

  await page.click('[data-acao="fechar-recado"]');
  await expect(recado).toHaveCount(0);
  await expect(page.locator('#conteudo [data-acao="calendario"]')).toBeVisible();
});

test('o recado não fica preso na tela', async ({ page }) => {
  await anotar(page, 'me lembrar de pagar o IPTU amanhã');
  await guardar(page);
  await expect(page.locator('.recado')).toBeVisible();

  await page.click('.aba[data-aba="dinheiro"]');
  await expect(page.locator('.recado')).toHaveCount(0);
});

test('gasto não oferece calendário — não é lembrete', async ({ page }) => {
  await anotar(page, 'paguei 180 de conta de luz');
  await guardar(page);
  await expect(page.locator('.recado')).toHaveCount(0);
  await expect(page.locator('[data-acao="calendario"]')).toHaveCount(0);
});

test('o arquivo do calendário de uma tarefa sem hora leva alarme', async ({ page }) => {
  await anotar(page, 'me lembrar de pagar o IPTU amanhã');
  await guardar(page);

  const [baixado] = await Promise.all([
    page.waitForEvent('download'),
    page.click('.recado [data-acao="calendario"]')
  ]);
  const fs = require('fs');
  const ics = fs.readFileSync(await baixado.path(), 'utf8');

  expect(ics).toContain('SUMMARY:Pagar o IPTU');
  expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{8}/);  // dia inteiro, sem hora
  expect(ics).toContain('BEGIN:VALARM');
  expect(ics).toContain('TRIGGER;RELATED=START:PT9H');  // avisa às 9 da manhã
});

test('o que foi anotado sobrevive a fechar e reabrir o app', async ({ page }) => {
  await anotar(page, 'paguei 42,50 no almoço');
  await guardar(page);

  await page.reload();                       // fechar e abrir de novo
  await page.click('.aba[data-aba="dinheiro"]');

  await expect(page.locator('.valor.saiu')).toContainText('42,50');
});

test('a busca acha o que foi anotado', async ({ page }) => {
  await anotar(page, 'paguei 180 de conta de luz');
  await guardar(page);

  await page.click('#btBusca');
  await page.fill('#campoBusca', 'luz');

  await expect(page.locator('.secao-titulo')).toContainText('1 resultado');
  await expect(page.locator('.item-titulo')).toContainText(/luz/i);
});

test('trocar o tipo na confirmação muda os campos oferecidos', async ({ page }) => {
  await anotar(page, 'recebi 3000 do salário');
  await expect(page.locator('.chip.ativo')).toHaveText('Entrou');

  await page.click('.chip[data-tipo="compromisso"]');
  await expect(page.locator('#c_hora')).toBeVisible();   // compromisso tem hora
  await expect(page.locator('#c_valor')).toHaveCount(0); // e não tem valor

  await page.click('.chip[data-tipo="nota"]');
  await expect(page.locator('#c_data')).toHaveCount(0);  // anotação não tem data
});

test('os botões têm o tamanho mínimo para o dedo (44 px)', async ({ page }) => {
  await anotar(page, 'paguei 180 de conta de luz');
  await guardar(page);

  const pequenos = await page.evaluate(() => {
    const alvos = ['#btAjuda', '#btBusca', '#btAjustes', '.mes .icone-botao', '.aba'];
    const fora = [];
    for (const sel of alvos) {
      for (const e of document.querySelectorAll(sel)) {
        const r = e.getBoundingClientRect();
        if (r.width < 44 || r.height < 44) {
          fora.push(sel + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        }
      }
    }
    return fora;
  });
  expect(pequenos).toEqual([]);
});

test('marcar feito funciona tocando um pouco fora do quadradinho', async ({ page }) => {
  // O quadradinho tem 24 px de desenho, mas 44 px de área sensível ao toque.
  await anotar(page, 'lembrar de comprar ração');
  await guardar(page);

  const caixa = await page.locator('.marcador').first().boundingBox();
  const meio = { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };

  await page.mouse.click(meio.x, meio.y + 16);   // 16 px abaixo do desenho
  await expect(page.locator('.item.feito')).toHaveCount(1);

  await page.mouse.click(meio.x - 16, meio.y);   // e 16 px à esquerda
  await expect(page.locator('.item.feito')).toHaveCount(0);
});

test('nenhuma das quatro telas dá erro no console', async ({ page }) => {
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });

  await anotar(page, 'paguei 180 de conta de luz');
  await guardar(page);
  await anotar(page, 'dentista sexta 15h');
  await guardar(page);
  await anotar(page, 'lembrar de levar o carro na revisão');
  await guardar(page);

  for (const aba of ['hoje', 'dinheiro', 'agenda', 'tarefas']) {
    await page.click(`.aba[data-aba="${aba}"]`);
    await expect(page.locator('#conteudo')).not.toBeEmpty();
  }
  await page.click('#btAjustes');
  await expect(page.locator('.painel')).toBeVisible();

  expect(erros).toEqual([]);
});

test('todo arquivo da lista offline existe no servidor', async ({ page, request }) => {
  // Se um só arquivo da lista der 404, o addAll falha inteiro e o app
  // deixa de funcionar sem internet — sem avisar ninguém.
  const lista = await request.get('sw.js').then(r => r.text())
    .then(t => [...t.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean));

  expect(lista.length).toBeGreaterThan(5);
  for (const arquivo of lista) {
    const r = await request.get(arquivo);
    expect(r.status(), 'faltou no servidor: ' + arquivo).toBe(200);
  }
});

test('o app abre sem internet depois da primeira visita', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await anotar(page, 'paguei 180 de conta de luz');
  await guardar(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('#campoEntrada')).toBeVisible();
  await page.click('.aba[data-aba="dinheiro"]');
  await expect(page.locator('.valor.saiu')).toContainText('180,00');
});

test('o tutorial aparece na primeira vez e não volta depois', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const tut = page.locator('#tutorial');
  await expect(tut).toBeVisible();
  // No site são 8 telas (a do widget é só do app Android).
  const total = await page.locator('.tut-slide').count();
  expect(total).toBe(8);
  await expect(page.locator('#tutPasso')).toHaveText('1 de ' + total);

  // Anda até o fim pelos botões, conferindo que cada tela chega.
  for (let n = 2; n <= total; n++) {
    await page.click('#tutProximo');
    await expect(page.locator('#tutPasso')).toHaveText(n + ' de ' + total);
  }
  await expect(page.locator('#tutProximo')).toHaveText('Começar a usar');
  await page.click('#tutVoltar');
  await expect(page.locator('#tutPasso')).toHaveText((total - 1) + ' de ' + total);
  await page.click('#tutProximo');
  await page.click('#tutProximo');
  await expect(tut).toHaveCount(0);

  await page.reload();
  await expect(page.locator('#campoEntrada')).toBeVisible();
  await expect(tut).toHaveCount(0);
});

test('pular fecha o tutorial, e dá para rever pelos Ajustes', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('.tut-pular');
  await expect(page.locator('#tutorial')).toHaveCount(0);

  await page.click('#btAjustes');
  await page.click('[data-acao="tutorial"]');
  await expect(page.locator('#tutorial')).toBeVisible();
  await expect(page.locator('#tutPasso')).toHaveText(/^1 de /);
});

test('o botão ? no topo reabre a apresentação a qualquer hora', async ({ page }) => {
  await expect(page.locator('#btAjuda')).toBeVisible();
  await page.click('#btAjuda');
  await expect(page.locator('#tutorial')).toBeVisible();
  await expect(page.locator('#tutPasso')).toHaveText(/^1 de /);
  await expect(page.locator('.tut-slide h2').filter({ hasText: 'Parcelas e contas fixas' })).toHaveCount(1);
  await expect(page.locator('.tut-slide h2').filter({ hasText: 'Nada fica acumulado' })).toHaveCount(1);
  await page.click('.tut-pular');
  await expect(page.locator('#tutorial')).toHaveCount(0);
});

test('o tutorial passa com o dedo e não rola a página de lado', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#tutTrilho').evaluate(t => t.scrollTo({ left: t.clientWidth * 2 }));
  await expect(page.locator('#tutPasso')).toHaveText('3 de 8');
  const folga = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(folga).toBeLessThanOrEqual(0);
});

test('tocar num exemplo preenche a caixa', async ({ page }) => {
  await page.locator('.vazio .sugestao').first().click();
  await expect(page.locator('#campoEntrada')).toHaveValue('paguei 45 no almoço');
  await page.press('#campoEntrada', 'Enter');
  await expect(page.locator('.chip.ativo')).toHaveText('Saiu');
});

test('compra parcelada vira uma parcela por mês', async ({ page }) => {
  await anotar(page, 'comprei a TV 1.200 em 10x');
  await expect(page.locator('#c_parcelas')).toHaveValue('10');
  await expect(page.locator('#c_dica')).toContainText('10 × R$ 120,00');
  await guardar(page);

  await expect(page.locator('.recado')).toContainText('10 parcelas');
  // Mês da compra: o registro da compra com o valor cheio (não soma no "Saiu").
  await expect(page.locator('.valor.compra')).toContainText('1.200,00');
  await expect(page.locator('.numero.saiu')).toHaveText('0,00');
  await page.click('[data-acao="mes"][data-passo="1"]');
  await expect(page.locator('.item-info').filter({ hasText: 'parcela 1/10' })).toBeVisible();
  await page.click('[data-acao="mes"][data-passo="1"]');
  await expect(page.locator('.item-info').filter({ hasText: 'parcela 2/10' })).toBeVisible();
  await expect(page.locator('.previsao')).toContainText('Ainda vai sair');

  // Apagar todas de uma vez pelo Editar
  await page.locator('.item-corpo').first().click();
  page.once('dialog', d => d.accept());
  await page.click('[data-acao="excluir-grupo"]');
  await page.click('[data-acao="mes"][data-passo="-1"]');
  await expect(page.locator('.item-info').filter({ hasText: 'parcela' })).toHaveCount(0);
  await page.click('[data-acao="mes"][data-passo="-1"]');
  await expect(page.locator('.valor.compra')).toHaveCount(0);
});

test('apagar a compra (botão Excluir) apaga junto as parcelas dos meses seguintes', async ({ page }) => {
  await anotar(page, 'sapato 300 dividido em 3x');
  await guardar(page);
  await page.locator('.item-corpo').first().click();
  await expect(page.locator('[data-acao="excluir"]')).toHaveText('Excluir a compra');
  page.once('dialog', d => d.accept());
  await page.click('[data-acao="excluir"]');
  await expect(page.locator('.valor.compra')).toHaveCount(0);
  for (let k = 1; k <= 3; k++) {
    await page.click('[data-acao="mes"][data-passo="1"]');
    await expect(page.locator('.item-info').filter({ hasText: 'parcela' })).toHaveCount(0);
  }
});

test('"sapato de 200 reais em quatro vezes" (como o microfone escreve): R$ 50 nos 4 meses', async ({ page }) => {
  await anotar(page, 'comprei sapato de 200 reais em quatro vezes');
  await expect(page.locator('#c_parcelas')).toHaveValue('4');
  await expect(page.locator('#c_dica')).toContainText('4 × R$ 50,00');
  await guardar(page);
  await expect(page.locator('.valor.compra')).toContainText('200,00');
  for (let k = 1; k <= 4; k++) {
    await page.click('[data-acao="mes"][data-passo="1"]');
    await expect(page.locator('.item').filter({ hasText: 'parcela ' + k + '/4' })).toContainText('50');
  }
  await page.click('[data-acao="mes"][data-passo="1"]');
  await expect(page.locator('.item-info').filter({ hasText: 'parcela' })).toHaveCount(0);
});

test('conta fixa aparece todo mês e "Paguei" lança o pagamento', async ({ page }) => {
  const dia = new Date().getDate();           // vence hoje: aparece em Hoje também
  await anotar(page, `internet 120 todo dia ${dia}`);
  await expect(page.locator('#c_todoDia')).toHaveValue(String(dia));
  await expect(page.locator('#c_data')).toHaveCount(0);
  await guardar(page);

  await expect(abaAtiva(page)).toContainText('Dinheiro');
  const fixa = page.locator('.item.fixa');
  await expect(fixa).toContainText('Internet');
  await expect(page.locator('.previsao')).toContainText('120,00');

  await page.click('.aba[data-aba="hoje"]');
  await expect(page.locator('.secao-titulo').filter({ hasText: 'Contas para pagar' })).toBeVisible();
  await page.click('[data-acao="pagar-fixa"]');
  await expect(page.locator('.recado')).toContainText('Pago: Internet');

  await page.click('.aba[data-aba="dinheiro"]');
  await expect(fixa).toContainText('✓ pago');
  await expect(page.locator('.resumo .numero.saiu')).toContainText('120,00');

  // e no mês que vem ela volta, a pagar
  await page.click('[data-acao="mes"][data-passo="1"]');
  await expect(page.locator('[data-acao="pagar-fixa"]')).toBeVisible();
});

test('botão "Repete todo mês" transforma um gasto em conta fixa', async ({ page }) => {
  await anotar(page, 'paguei 80 de academia');
  await page.click('[data-acao="add-fixa"]');
  await expect(page.locator('#c_todoDia')).toBeVisible();
  await expect(page.locator('#c_dica')).toContainText('Conta fixa');
});

test('revisão do que ficou para trás: uma de cada vez', async ({ page }) => {
  await page.evaluate(() => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const t = (titulo, n) => ({ id: 't' + titulo, tipo: 'tarefa', titulo, data: d(n), hora: null, feito: false, texto: '', criadoEm: '' });
    localStorage.setItem('prumo.dados.v1', JSON.stringify({ itens: [t('Ligar pro banco', -3), t('Mandar e-mail', -1), t('Pagar boleto', -2)], aprendidas: {}, ultimoBackup: new Date().toISOString() }));
  });
  await page.reload();
  await expect(page.locator('.revisao-banner')).toContainText('3 coisas ficaram para trás');
  await page.click('.revisao-banner');

  await expect(page.locator('.revisao-topo')).toContainText('1 de 3');
  await expect(page.locator('.revisao-titulo')).toHaveText('Ligar pro banco');   // a mais antiga primeiro
  await page.click('[data-o="feito"]');
  await expect(page.locator('.revisao-titulo')).toHaveText('Pagar boleto');
  await page.click('[data-o="amanha"]');
  await page.click('[data-o="apagar"]');
  await expect(page.locator('.revisao-fim')).toContainText('Tudo arrumado');
  await page.click('[data-acao="fechar-revisao"]');

  await expect(page.locator('.revisao-banner')).toHaveCount(0);
  await page.click('.aba[data-aba="tarefas"]');
  await expect(page.locator('.item-titulo').filter({ hasText: 'Pagar boleto' })).toBeVisible();
  await expect(page.locator('.item-titulo').filter({ hasText: 'Mandar e-mail' })).toHaveCount(0);
});

/* ---------- esfera ao abrir (23/11/2026) ---------- */

async function abrirComEsfera(page) {
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('prumo.tutorial.visto', '1'); });
  await page.reload();
  await expect(page.locator('#esfera')).toBeVisible();
}

test('a esfera recebe ao abrir e o ✕ leva às listas', async ({ page }) => {
  await abrirComEsfera(page);
  await expect(page.locator('#esferaTexto')).toContainText('diga o que precisa');
  await page.click('[data-esfera="fechar"]');
  await expect(page.locator('#esfera')).toHaveCount(0);
  await expect(page.locator('#campoEntrada')).toBeVisible();
});

test('escrever na esfera mostra o que entendeu e Guardar anota', async ({ page }) => {
  await abrirComEsfera(page);
  await page.fill('#esferaCampo', 'almoço 45 reais');
  await page.press('#esferaCampo', 'Enter');
  await expect(page.locator('#esferaTexto')).toContainText('Saiu');
  await expect(page.locator('#esferaTexto')).toContainText('45');
  await page.click('[data-esfera="guardar"]');
  await expect(page.locator('#esfera')).toHaveCount(0);
  await expect(page.locator('.confirma')).toHaveCount(0);
  await page.click('.aba[data-aba="dinheiro"]');
  await expect(page.locator('#conteudo')).toContainText('Almoço');
});

test('Corrigir na esfera abre a confirmação completa', async ({ page }) => {
  await abrirComEsfera(page);
  await page.fill('#esferaCampo', 'dentista quinta 15h');
  await page.press('#esferaCampo', 'Enter');
  await page.click('[data-esfera="corrigir"]');
  await expect(page.locator('#esfera')).toHaveCount(0);
  await expect(page.locator('.confirma')).toBeVisible();
});

test('a esfera desliga nos Ajustes e não volta ao abrir', async ({ page }) => {
  await abrirComEsfera(page);
  await page.click('[data-esfera="fechar"]');
  await page.click('#btAjustes');
  await page.click('[data-acao="esfera-ao-abrir"]');
  await expect(page.locator('[data-acao="esfera-ao-abrir"]')).toContainText('desligada');
  await page.reload();
  await expect(page.locator('#campoEntrada')).toBeVisible();
  await expect(page.locator('#esfera')).toHaveCount(0);
});

test('a esfera desenha as partículas (o quadro não fica vazio)', async ({ page }) => {
  await abrirComEsfera(page);
  await page.waitForTimeout(400);
  const acesos = await page.evaluate(() => {
    const c = document.querySelector('.esfera-tela');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
    return n;
  });
  expect(acesos).toBeGreaterThan(500);
});
