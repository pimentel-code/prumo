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
# O app lê o canais.json (sem a API do GitHub, que tem limite de 60/h): marca o estável.
corpo=$(gh release view "$tag" --json body --jq .body)
nat=$(printf '%s' "$corpo" | grep -oP '\[nativo:\K\d+' || echo "${versao#1.}")
python3 canais.py estavel "${versao#1.}" "$nat" "$corpo"
git add canais.json && git commit -qm "canais: $versao estável" && git push -q || true
# O site (GitHub Pages) sai do ramo "estavel": aponta para o código desta versão.
git push -q -f origin "$tag^{commit}:refs/heads/estavel"

echo
echo "Liberado para todos: Prumo $versao."
# Compara com a ESTÁVEL ANTERIOR (o que os amigos têm), não só com a versão de teste anterior.
anterior=$(gh release list -L 40 --json tagName,isPrerelease --jq '.[]|select(.isPrerelease==false)|.tagName' | grep -vx "$tag" | sort -V | tail -1)
if [ -n "$anterior" ] && [ "$nat" -gt "${anterior#v1.}" ]; then
  echo "  · exige parte NATIVA mais nova que a ${anterior#v} dos amigos: eles veem \"Versão nova\" e instalam o APK UMA vez (confere a cada 30 min)"
else
  echo "  · só o miolo: o Prumo dos amigos se atualiza sozinho, sem aviso (ao abrir e sair do app)"
fi
echo "  · convite: https://pimentel-code.github.io/prumo/instalar.html (atualiza em alguns minutos)"
