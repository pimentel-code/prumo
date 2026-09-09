#!/usr/bin/env bash
# Roda TODAS as provas do Prumo.
#
#   ./testes/rodar.sh          tudo
#   ./testes/rodar.sh rapido   só as do gjs (instantâneas, sem navegador)
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "── interpretador: 24 frases de exemplo ──"
cat interpretador.js testes/casos.js > /tmp/prumo-t1.js
gjs /tmp/prumo-t1.js

echo
echo "── app inteiro: 14 provas com navegador simulado ──"
cat testes/stubs.js interpretador.js dados.js calendario.js app.js testes/prova.js > /tmp/prumo-t2.js
gjs /tmp/prumo-t2.js

rm -f /tmp/prumo-t1.js /tmp/prumo-t2.js

if [ "${1:-}" = "rapido" ]; then
  echo
  echo "(provas de navegador puladas)"
  exit 0
fi

if ! command -v npx >/dev/null; then
  echo
  echo "Node não está instalado — provas de navegador puladas."
  echo "Para ligá-las:  pkexec dnf install -y nodejs npm && npm install"
  exit 0
fi

echo
echo "── navegador de verdade: 10 provas em tela de iPhone e de Android ──"
npx playwright test
