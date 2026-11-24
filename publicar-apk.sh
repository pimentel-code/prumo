#!/usr/bin/env bash
# Publica uma versão de TESTE do app Android no GitHub. Só chega a quem
# acompanha os testes (o Obtainium do dono, com "pré-lançamentos" ligado).
# Amigos e o site só recebem depois do ./aprovar-apk.sh.
#
#   ./publicar-apk.sh "o que mudou"      (ou: prumo atualizar "o que mudou")
#
# Faz, nesta ordem: provas rápidas → soma 1 na versão → monta o APK e o miolo.zip →
# guarda tudo no git e envia (ramo main) → cria a "pré-release" vX com os dois.
#
# Miolo silencioso (desde a 1.9): o miolo.zip (telas, cores, regras) é baixado
# sozinho pelos celulares, sem aviso. Só quando a parte NATIVA muda (pasta android/,
# capacitor.config.json, plugins do package.json) a release ganha [nativo:N] novo e
# os celulares mostram a faixa "Versão nova" para instalar o APK.
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

# A parte nativa mudou desde a última versão publicada?
# As etiquetas (v1.N) nascem no GitHub, pelo gh release: traz antes de comparar.
git fetch -q --tags origin 2>/dev/null || true
ultima=$(git tag -l 'v1.*' --sort=-v:refname | head -1)
nativo=$(cat android/nativo-minimo.txt 2>/dev/null || echo "$novo")
if [ -z "$ultima" ] || ! git diff --quiet "$ultima" -- android capacitor.config.json package.json package-lock.json \
     ':!android/versao.properties' ':!android/nativo-minimo.txt' ':!android/app/src/main/assets'; then
  nativo=$novo
fi
# FORCAR_NATIVO=1 prumo atualizar "…": obriga a instalar o APK (faixa "Versão nova"),
# por exemplo quando a atualização silenciosa precisa ser consertada pelo caminho antigo.
[ "${FORCAR_NATIVO:-}" = "1" ] && nativo=$novo
echo "$nativo" > android/nativo-minimo.txt
printf '/* Gerado pelo publicar-apk.sh: o número da versão deste miolo (o N de 1.N). */\nconst PRUMO_MIOLO = %s;\n' "$novo" > versao-miolo.js

./montar-apk.sh
rm -f miolo.zip
python3 -c "
import zipfile, os
with zipfile.ZipFile('miolo.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for raiz, _, arqs in os.walk('www'):
        for a in arqs:
            c = os.path.join(raiz, a); z.write(c, os.path.relpath(c, 'www'))
"
if [ "$nativo" = "$novo" ]; then
  tipo="com parte NATIVA nova: os celulares mostram \"Versão nova\" para instalar o APK"
else
  tipo="só o miolo: os celulares se atualizam sozinhos, sem aviso"
fi
cp -f Prumo.apk ~/Downloads/Prumo.apk 2>/dev/null || true

nota="${1:-Versão $versao do Prumo}"
python3 canais.py teste "$novo" "$nativo" "$nota"
git add -A
git commit -qm "Prumo $versao: $nota" || true
git push -q
gh release create "v$versao" Prumo.apk miolo.zip --prerelease --title "Prumo $versao (teste)" --notes "$nota

[nativo:$nativo]"

echo
echo "Publicado para TESTE: Prumo $versao ($tipo)."
echo "Recebem: o seu Obtainium e o Prumo com \"Versões de teste\" ligado nos Ajustes."
echo "Gostou? Libere para todos com:  prumo aprovar"
