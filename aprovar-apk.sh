#!/usr/bin/env bash
# Libera para TODOS a versão de teste que você aprovou.
#
#   ./aprovar-apk.sh          (ou: prumo aprovar)       → a última versão de teste
#   ./aprovar-apk.sh v1.5                                → uma versão específica
#
# Depois disso: o Prumo dos amigos mostra "Versão nova", a página de convite
# passa a baixar essa versão e o site (iPhone) é atualizado para o mesmo código.
set -euo pipefail
cd "$(dirname "$0")"

if ! gh api user >/dev/null 2>&1; then
  echo "O GitHub ainda não está conectado. No chat do Claude, digite:  ! gh auth login"
  exit 1
fi

tag="${1:-$(gh release list --limit 30 --json tagName,isPrerelease --jq '[.[] | select(.isPrerelease)][0].tagName')}"
if [ -z "$tag" ] || [ "$tag" = "null" ]; then
  echo "Não há versão de teste esperando aprovação."
  exit 1
fi
versao="${tag#v}"

gh release edit "$tag" --prerelease=false --latest --title "Prumo $versao"
git fetch -q --tags origin
# O site (GitHub Pages) sai do ramo "estavel": aponta para o código desta versão.
git push -q -f origin "$tag^{commit}:refs/heads/estavel"

echo
echo "Liberado para todos: Prumo $versao."
if gh release view "$tag" --json body --jq .body | grep -q "\[nativo:${versao#1.}\]"; then
  echo "  · tem parte NATIVA nova: o Prumo dos amigos mostra \"Versão nova\" para instalar (confere a cada 6 h)"
else
  echo "  · só o miolo: o Prumo dos amigos se atualiza sozinho, sem aviso (ao abrir e sair do app)"
fi
echo "  · convite: https://pimentel-code.github.io/prumo/instalar.html (atualiza em alguns minutos)"
