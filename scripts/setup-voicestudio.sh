#!/usr/bin/env bash
# Instala e sobe o VoiceStudio (github.com/debpalash/VoiceStudio, AGPL-3.0) só com o servidor, sem a interface,
# e baixa os dois modelos que o projeto usa:
#   openbmb/VoxCPM2              voz (Apache-2.0, uso comercial permitido, 5 GB)
#   Systran/faster-whisper-small tempo de cada palavra para as legendas (MIT, 0,5 GB)
# Uso: scripts/setup-voicestudio.sh [pasta]   (padrão: ../voicestudio). Precisa de git, uv e curl.
set -euo pipefail
DIR=${1:-"$(cd "$(dirname "$0")/../.." && pwd)/voicestudio"}
URL=http://127.0.0.1:3900

[ -d "$DIR/.git" ] || git clone --depth 1 https://github.com/debpalash/VoiceStudio.git "$DIR"
cd "$DIR"
if command -v nvidia-smi >/dev/null; then GROUP=cuda; else GROUP=cpu; fi
uv sync --no-default-groups --group "$GROUP" --python 3.11
uv pip install --python .venv/bin/python "voxcpm>=2.0.3"

if ! curl -sf "$URL/health" >/dev/null; then
  nohup .venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 3900 > voicestudio.log 2>&1 &
  until curl -sf "$URL/health" >/dev/null; do sleep 2; done
fi

for repo in openbmb/VoxCPM2 Systran/faster-whisper-small; do
  until curl -s -X POST "$URL/models/install" -H 'content-type: application/json' -d "{\"repo_id\":\"$repo\"}" \
    | grep -qE 'install_started|already'; do sleep 5; done
  until curl -s "$URL/models/install/status" | grep -qE '"failed"|"jobs":\[\]'; do sleep 5; done
done
curl -s "$URL/models" | grep -o '"repo_id":"\(openbmb/VoxCPM2\|Systran/faster-whisper-small\)"[^}]*"installed":[a-z]*' || true
echo "VoiceStudio no ar em $URL"
