/* Provas do Prumo dentro de um navegador de verdade, em tela de celular.
   O que o teste do gjs não alcança: toque nos botões, telas trocando,
   dado que sobrevive a fechar o app, e o funcionamento sem internet. */

const { test, expect } = require('@playwright/test');

/* Abre o app sempre limpo, como se fosse a primeira vez. */
async function abrirLimpo(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
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
  await expect(page.locator('.item-info')).toContainText('15:00');
  await expect(page.locator('[data-acao="calendario"]')).toBeVisible();
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
    const alvos = ['#btBusca', '#btAjustes', '.mes .icone-botao', '.aba'];
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
  const lista = await request.get('/sw.js').then(r => r.text())
    .then(t => [...t.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean));

  expect(lista.length).toBeGreaterThan(5);
  for (const arquivo of lista) {
    const r = await request.get('/' + arquivo);
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
