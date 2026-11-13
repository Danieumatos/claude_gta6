#!/usr/bin/env bash
# Baixa o modelo de voz Kokoro (Apache 2.0) e instala o que ele precisa. Rode uma vez.
set -euo pipefail
mkdir -p models
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "models/$f" ] || curl -L --fail -o "models/$f" "$base/$f"
done
pip install -q kokoro-onnx soundfile
echo "voz pronta"
