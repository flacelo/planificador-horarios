#!/usr/bin/env bash
set -euo pipefail

echo "== [Harness] Verificando estado del entorno =="

for cmd in git; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "ERROR: '$cmd' no está disponible." >&2
    exit 1
  fi
done

# bash solo se exige fuera de Windows (MINGW/MSYS/CYGWIN ya lo proveen con Git Bash)
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) ;;
  *)
    if ! command -v bash &> /dev/null; then
      echo "ERROR: 'bash' no está disponible." >&2
      exit 1
    fi
    ;;
esac

if [[ ! -f "agents.md" ]]; then
  echo "ERROR: 'agents.md' no existe." >&2
  exit 1
fi

for f in .opencode/agents/leader.md .opencode/agents/implementor.md .opencode/agents/reviewer.md; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: '$f' no existe." >&2
    exit 1
  fi
  if ! grep -q '^mode: subagent' "$f"; then
    echo "ERROR: '$f' no tiene 'mode: subagent' en su frontmatter." >&2
    exit 1
  fi
done

mkdir -p .opencode/context
echo "✔ Entorno listo y verificado."
