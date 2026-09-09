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
  await expect(page.locator('.resumo')).toContainText('R$ 180,00');
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
