#!/usr/bin/env bash
# Publica uma versão nova do app Android no GitHub. O Obtainium, no celular,
# percebe e atualiza sozinho.
#
#   ./publicar-apk.sh "o que mudou"      (ou: prumo atualizar "o que mudou")
#
# Faz, nesta ordem: provas rápidas → soma 1 na versão → monta o APK →
# guarda tudo no git e envia → cria a "release" vX com o Prumo.apk anexado.
# Enviar o código também atualiza o site (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")"

if ! gh api user >/dev/null 2>&1; then
  echo "O GitHub ainda não está conectado. No chat do Claude, digite:  ! gh auth login"
  exit 1
fi

./testes/rodar.sh rapido >/dev/null || { echo "As provas falharam: nada foi publicado."; exit 1; }

atual=$(grep -oP '^codigo=\K\d+' android/versao.properties)
novo=$((atual + 1))
sed -i "s/^codigo=.*/codigo=$novo/" android/versao.properties
versao="1.$novo"

./montar-apk.sh
cp -f Prumo.apk ~/Downloads/Prumo.apk 2>/dev/null || true

nota="${1:-Versão $versao do Prumo}"
git add -A
git commit -qm "Prumo $versao: $nota" || true
git push -q
gh release create "v$versao" Prumo.apk --title "Prumo $versao" --notes "$nota"

echo
echo "Publicado: Prumo $versao. O Obtainium no celular vai avisar (ou atualizar sozinho)."
