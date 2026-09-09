/* dados.js — guarda tudo no próprio aparelho. Nada sai daqui. */

const CHAVE = 'prumo.dados.v1';

const VAZIO = {
  versao: 1,
  itens: [],
  aprendidas: {},      // palavra -> categoria, aprendido das suas correções
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
    return this.estado;
  },

  salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(this.estado));
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

  /* ---- backup ---- */

  exportar() {
    const e = this.carregar();
    e.ultimoBackup = new Date().toISOString();
    this.salvar();
    return JSON.stringify({ app: 'Prumo', versao: 1, exportadoEm: e.ultimoBackup,
                            itens: e.itens, aprendidas: e.aprendidas }, null, 1);
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
    } else {
      const jaTem = new Set(e.itens.map(i => i.id));
      const novos = pacote.itens.filter(i => !jaTem.has(i.id));
      e.itens = novos.concat(e.itens);
      Object.assign(e.aprendidas, pacote.aprendidas || {});
    }
    e.itens.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    this.salvar();
    return pacote.itens.length;
  },

  apagarTudo() {
    localStorage.removeItem(CHAVE);
    this.estado = null;
  },

  diasSemBackup() {
    const b = this.carregar().ultimoBackup;
    if (!b) return this.itens().length ? 999 : 0;
    return Math.floor((Date.now() - new Date(b).getTime()) / 86400000);
  }
};
