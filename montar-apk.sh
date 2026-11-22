#!/usr/bin/env bash
# Monta o APK do Prumo para Android.
#   ./montar-apk.sh       → gera Prumo.apk nesta pasta
# Precisa: Java 21 (pacman jdk21-openjdk) e o kit Android em ~/Android/Sdk.
set -euo pipefail
cd "$(dirname "$0")"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk}"

./copiar-www.sh
npx cap sync android
(cd android && ./gradlew --quiet assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk Prumo.apk
echo
echo "Pronto: $(pwd)/Prumo.apk ($(du -h Prumo.apk | cut -f1))"
