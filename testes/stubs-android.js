/* Android de mentira: finge ser o app Capacitor e anota o que foi agendado. */
globalThis.agendados = [];
globalThis.alarmes = [];
globalThis.permissao = 'granted';
window.Capacitor = {
  isNativePlatform: () => true,
  Plugins: {
    LocalNotifications: {
      async createChannel() {}, async registerActionTypes() {}, addListener() {},
      async checkPermissions() { return { display: permissao }; },
      async requestPermissions() { return { display: permissao }; },
      async getPending() { return { notifications: agendados.map(n => ({ id: n.id })) }; },
      async cancel(o) { const fora = new Set(o.notifications.map(n => n.id)); agendados = agendados.filter(n => !fora.has(n.id)); },
      async schedule(o) { agendados.push(...o.notifications); }
    },
    App: { addListener() {}, minimizeApp() {} },
    Prumo: {
      async definirAlarmes(o) { globalThis.alarmes = o.alarmes; },
      async estadoAlarme() { return { telaCheia: true, sobrepor: globalThis.sobreporLiberado !== false }; },
      async abrirAjustesSobrepor() {},
      async testarAlarme() {}, async abrirAjustesTelaCheia() {},
      async ouvir() { return { texto: globalThis.falado || '' }; },
      async atualizarWidget(o) { globalThis.widget = JSON.parse(o.dados); },
      async acaoPendente() { const a = globalThis.pedido || null; globalThis.pedido = null; return { acao: a }; },
      async mostrarTeclado() {}
    }
  }
};
