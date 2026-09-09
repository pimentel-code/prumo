/* Configuração das provas de navegador do Prumo.
   Sobe um servidor local na porta 8177 e abre o app em dois tamanhos de tela. */

const { defineConfig, devices } = require('@playwright/test');

const PORTA = 8177;

/* Por padrão as provas rodam contra os arquivos desta pasta, num servidor local.
   Para provar o site JÁ PUBLICADO:
     PRUMO_URL=https://pimentel-code.github.io/prumo/ npx playwright test        */
const PUBLICADO = process.env.PRUMO_URL || null;

module.exports = defineConfig({
  testDir: './testes',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'testes/resultados',

  use: {
    baseURL: PUBLICADO || ('http://localhost:' + PORTA),
    // Guarda foto e filme só quando a prova falha, para o erro ficar visível.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Recife'
  },

  projects: [
    { name: 'iPhone',  use: { ...devices['iPhone 14'],  browserName: 'chromium' } },
    { name: 'Android', use: { ...devices['Pixel 7'] } }
  ],

  webServer: PUBLICADO ? undefined : {
    command: 'python3 -m http.server ' + PORTA + ' --bind 127.0.0.1',
    url: 'http://localhost:' + PORTA + '/index.html',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore'
  }
});
