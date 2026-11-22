#!/usr/bin/env bash
# Roda TODAS as provas do Prumo.
#
#   ./testes/rodar.sh          tudo
#   ./testes/rodar.sh rapido   só as do gjs (instantâneas, sem navegador)
#
set -euo pipefail
cd "$(dirname "$0")/.."

# Executor das provas rápidas: gjs (Fedora) ou Node (CachyOS), o que existir.
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
rodar_js() {
  if command -v gjs >/dev/null; then gjs "$1"
  else { echo 'globalThis.print = (...a) => console.log(...a);'; cat "$1"; } > "$1.node.js"; node "$1.node.js"
  fi
}

echo "── interpretador: 24 frases de exemplo ──"
cat interpretador.js testes/casos.js > "$T/t1.js"
rodar_js "$T/t1.js"

echo
echo "── app inteiro: 14 provas com navegador simulado ──"
cat testes/stubs.js interpretador.js dados.js calendario.js avisos.js tutorial.js app.js testes/prova.js > "$T/t2.js"
rodar_js "$T/t2.js"

echo
echo "── avisos do app Android: provas com o Android simulado ──"
cat testes/stubs.js testes/stubs-android.js interpretador.js dados.js calendario.js avisos.js tutorial.js app.js testes/avisos-prova.js > "$T/t3.js"
rodar_js "$T/t3.js"

if [ "${1:-}" = "rapido" ]; then
  echo
  echo "(provas de navegador puladas)"
  exit 0
fi

if ! command -v npx >/dev/null; then
  echo
  echo "Node não está instalado — provas de navegador puladas."
  echo "Para ligá-las:  pkexec pacman -S nodejs npm && npm install"
  exit 0
fi

echo
echo "── navegador de verdade: 10 provas em tela de iPhone e de Android ──"
npx playwright test
