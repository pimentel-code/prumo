/* dados.js — guarda tudo no próprio aparelho. Nada sai daqui. */

const CHAVE = 'prumo.dados.v1';

const VAZIO = {
  versao: 1,
  itens: [],
  aprendidas: {},      // palavra -> categoria, aprendido das suas correções
  fixas: [],           // contas fixas: { id, tipo, titulo, valor, categoria, dia, desde: 'AAAA-MM' }
  ultimoBackup: null
};

const Dados = {
  estado: null,

  carregar() {
    if (this.estado) return this.estado;
    try {
      const bruto = localStorage.getItem(CHAVE);
      this.estado = bruto ? Object.assign({}, VAZIO, JSON.parse(bruto)) : Object.assign({}, VAZIO, { itens: [] });
    } catch (e) {
      console.warn('Não consegui ler os dados guardados:', e);
      this.estado = Object.assign({}, VAZIO, { itens: [] });
    }
    if (!Array.isArray(this.estado.fixas)) this.estado.fixas = [];
    return this.estado;
  },

  salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(this.estado));
      if (typeof Avisos !== 'undefined') Avisos.programar();   // app Android: refaz os avisos
      return true;
    } catch (e) {
      alert('Não consegui salvar. O armazenamento do celular pode estar cheio.\n\nFaça um backup em Ajustes antes de continuar.');
      return false;
    }
  },

  itens() { return this.carregar().itens; },

  adicionar(item) {
    const completo = Object.assign({}, item, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      criadoEm: new Date().toISOString()
    });
    this.carregar().itens.unshift(completo);
    this.salvar();
    return completo;
  },

  atualizar(id, mudancas) {
    const item = this.itens().find(i => i.id === id);
    if (!item) return null;
    Object.assign(item, mudancas);
    this.salvar();
    return item;
  },

  remover(id) {
    const e = this.carregar();
    e.itens = e.itens.filter(i => i.id !== id);
    this.salvar();
  },

  /* Você corrigiu a categoria: o app memoriza a palavra mais forte da frase. */
  aprender(texto, categoria) {
    const palavras = semAcento(texto)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length >= 4 && !/^\d+$/.test(p) && !PREPOSICOES.includes(p));
    if (!palavras.length) return;
    this.carregar().aprendidas[palavras[0]] = categoria;
    this.salvar();
  },

  esquecer(palavra) {
    delete this.carregar().aprendidas[palavra];
    this.salvar();
  },

  /* ---- contas fixas (aluguel, internet, salário…) ---- */

  fixas() { return this.carregar().fixas; },

  adicionarFixa(fixa) {
    const completa = Object.assign({}, fixa, {
      id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      criadoEm: new Date().toISOString()
    });
    this.carregar().fixas.push(completa);
    this.salvar();
    return completa;
  },

  atualizarFixa(id, mudancas) {
    const f = this.fixas().find(x => x.id === id);
    if (!f) return null;
    Object.assign(f, mudancas);
    this.salvar();
    return f;
  },

  removerFixa(id) {
    const e = this.carregar();
    e.fixas = e.fixas.filter(f => f.id !== id);
    this.salvar();
  },

  /* ---- backup ---- */

  exportar() {
    const e = this.carregar();
    e.ultimoBackup = new Date().toISOString();
    this.salvar();
    return JSON.stringify({ app: 'Prumo', versao: 1, exportadoEm: e.ultimoBackup,
                            itens: e.itens, aprendidas: e.aprendidas, fixas: e.fixas }, null, 1);
  },

  importar(texto, modo) {
    let pacote;
    try { pacote = JSON.parse(texto); }
    catch (e) { throw new Error('Esse arquivo não parece um backup do Prumo.'); }
    if (!pacote || !Array.isArray(pacote.itens)) throw new Error('Esse arquivo não parece um backup do Prumo.');

    const e = this.carregar();
    if (modo === 'substituir') {
      e.itens = pacote.itens;
      e.aprendidas = pacote.aprendidas || {};
      e.fixas = pacote.fixas || [];
    } else {
      const jaTem = new Set(e.itens.map(i => i.id));
      const novos = pacote.itens.filter(i => !jaTem.has(i.id));
      e.itens = novos.concat(e.itens);
      Object.assign(e.aprendidas, pacote.aprendidas || {});
      const fixasJa = new Set(e.fixas.map(f => f.id));
      e.fixas = e.fixas.concat((pacote.fixas || []).filter(f => !fixasJa.has(f.id)));
    }
    e.itens.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    this.salvar();
    return pacote.itens.length;
  },

  apagarTudo() {
    localStorage.removeItem(CHAVE);
    this.estado = null;
    if (typeof Avisos !== 'undefined') Avisos.programar(0);
  },

  diasSemBackup() {
    const b = this.carregar().ultimoBackup;
    if (!b) return this.itens().length ? 999 : 0;
    return Math.floor((Date.now() - new Date(b).getTime()) / 86400000);
  }
};
