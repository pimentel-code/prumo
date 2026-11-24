#!/usr/bin/env bash
# Copia os arquivos do app para www/, que é o que vai dentro do APK.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf www && mkdir -p www
cp index.html estilo.css interpretador.js dados.js calendario.js avisos.js tutorial.js atualizacao.js esfera.js app.js manifest.webmanifest sw.js www/
cp -r icones www/
