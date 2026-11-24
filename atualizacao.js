/* atualizacao.js — o app Android confere se saiu versão nova do Prumo.

   Pergunta ao GitHub só "qual é a última versão liberada?" (a release
   "latest", que nunca é uma versão de teste). Nenhum dado da pessoa sai do
   celular. Sem internet, simplesmente não avisa. A versão nova aparece numa
   faixa no alto; "Atualizar" baixa o APK e abre o instalador do Android.

   Desde a 1.9 a faixa só aparece quando a versão nova mexe na parte NATIVA
   (marca "[nativo:N]" na release). Mudança só de telas/regras chega sozinha,
   sem aviso nenhum, pelo miolo.js. */

const Atualizacao = {
  API: 'https://api.github.com/repos/pimentel-code/prumo/releases/latest',
  CHAVE: 'prumo.atualizacao',
  INTERVALO: 30 * 60 * 1000,       // confere no máximo a cada 30 minutos (era 6 h até a 1.13)
  instalado: 0,                    // versionCode do app (o "N" de "1.N")
  nova: null,                      // { versao, codigo, url, notas }
  dispensada: false,               // "Agora não": some até o app reabrir
  baixando: false,

  /* "v1.7" → 7 */
  codigoDe(tag) {
    const m = /^v?1\.(\d+)$/.exec(String(tag || '').trim());
    return m ? +m[1] : 0;
  },

  versaoInstalada() { return this.instalado ? '1.' + this.instalado : ''; },

  async conferir(forcar) {
    if (!Avisos.nativo) return null;
    try { this.instalado = +(await window.Capacitor.Plugins.App.getInfo()).build || 0; }
    catch (e) { return null; }

    let salvo = {};
    try { salvo = JSON.parse(localStorage.getItem(this.CHAVE)) || {}; } catch (e) {}
    let rel = salvo.rel || null;
    if (forcar || !salvo.em || Date.now() - salvo.em > this.INTERVALO) {
      try {
        const r = await fetch(this.API, { headers: { Accept: 'application/vnd.github+json' } });
        if (r.ok || r.status === 404) {
          const j = r.ok ? await r.json() : {};
          const apk = (j.assets || []).find(a => /\.apk$/i.test(a.name));
          rel = apk ? { tag: j.tag_name, url: apk.browser_download_url, body: String(j.body || ''),
                        notas: String(j.body || '').replace(/\[nativo:\d+\]/g, '').trim().slice(0, 400) } : null;
          localStorage.setItem(this.CHAVE, JSON.stringify({ em: Date.now(), rel }));
        }
      } catch (e) { /* sem internet: fica com o que sabia */ }
    }
    const codigo = rel ? this.codigoDe(rel.tag) : 0;
    // Só pede o APK se a parte nativa exigida for mais nova que a instalada.
    const m = rel && /\[nativo:(\d+)\]/.exec(rel.body || '');
    const nativo = m ? +m[1] : codigo;
    this.nova = (this.instalado && nativo > this.instalado)
      ? { versao: '1.' + codigo, codigo, url: rel.url, notas: rel.notas }
      : null;
    return this.nova;
  },

  bannerHTML() {
    if (!this.nova || this.dispensada) return '';
    const n = this.nova;
    return `<div class="atualizacao">
      <span class="atualizacao-icone">✨</span>
      <div class="atualizacao-texto"><strong>Versão nova do Prumo (${esc(n.versao)})</strong>
        <span>${this.baixando ? 'Baixando… o instalador do Android abre em seguida.' : 'Seus dados continuam como estão.'}</span></div>
      <div class="atualizacao-botoes">
        <button type="button" class="mini principal-mini" data-acao="atualizar-app"${this.baixando ? ' disabled' : ''}>${this.baixando ? 'Baixando…' : 'Atualizar'}</button>
        ${this.baixando ? '' : '<button type="button" class="mini" data-acao="dispensar-atualizacao">Agora não</button>'}
      </div>
    </div>`;
  },

  async instalar() {
    if (!this.nova || this.baixando) return;
    const P = Avisos.nativoPrumo();
    try {
      if (!(await P.podeInstalar()).pode) {
        alert('Só da primeira vez: o Android vai abrir uma tela.\n\nLigue "Permitir desta fonte" para o Prumo, volte e toque em Atualizar de novo.');
        await P.abrirPermissaoInstalar();
        return;
      }
    } catch (e) { /* aparelho antigo: segue */ }
    this.baixando = true; render();
    try {
      await P.instalarAtualizacao({ url: this.nova.url });
    } catch (e) {
      alert((e && e.message) || 'Não consegui baixar a versão nova. Confira a internet e tente de novo.');
    }
    this.baixando = false; render();
  }
};
