/* navegador de mentira, só o suficiente para o app carregar fora do celular */
globalThis.localStorage = {
  _m: {},
  getItem(k) { return k in this._m ? this._m[k] : null; },
  setItem(k, v) { this._m[k] = String(v); },
  removeItem(k) { delete this._m[k]; }
};
const elemento = () => ({
  value: '', innerHTML: '', hidden: false, dataset: {},
  classList: { toggle() {}, add() {}, remove() {} },
  addEventListener() {}, insertAdjacentHTML() {}, focus() {}, blur() {}, click() {}, remove() {},
  style: {}, appendChild() {}
});
globalThis.document = {
  getElementById: elemento, querySelector: elemento,
  querySelectorAll: () => [], addEventListener() {}, createElement: elemento,
  body: { appendChild() {} }
};
globalThis.window = { addEventListener() {}, scrollY: 0 };
globalThis.navigator = { userAgent: 'teste', platform: 'teste', maxTouchPoints: 0 };
globalThis.alert = m => print('  [alerta] ' + m);
globalThis.confirm = () => true;
if (typeof console === 'undefined') globalThis.console = { warn: print, log: print };
