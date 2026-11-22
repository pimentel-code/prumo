#!/usr/bin/env bash
# Publica uma versão de TESTE do app Android no GitHub. Só chega a quem
# acompanha os testes (o Obtainium do dono, com "pré-lançamentos" ligado).
# Amigos e o site só recebem depois do ./aprovar-apk.sh.
#
#   ./publicar-apk.sh "o que mudou"      (ou: prumo atualizar "o que mudou")
#
# Faz, nesta ordem: provas rápidas → soma 1 na versão → monta o APK →
# guarda tudo no git e envia (ramo main) → cria a "pré-release" vX com o Prumo.apk.
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
gh release create "v$versao" Prumo.apk --prerelease --title "Prumo $versao (teste)" --notes "$nota"

echo
echo "Publicado para TESTE: Prumo $versao. Só o seu Obtainium recebe."
echo "Gostou? Libere para todos com:  prumo aprovar"
