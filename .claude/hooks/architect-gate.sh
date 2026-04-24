#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
DIRTY="${TMPDIR:-/tmp}/.claude-dirty-${SESSION_ID}"

if [ "$STOP_ACTIVE" = "true" ]; then
  rm -f "$DIRTY"
  exit 0
fi

if [ ! -f "$DIRTY" ]; then
  exit 0
fi

cat <<'JSON'
{"decision":"block","reason":"Before finishing this turn, you MUST invoke the architect subagent to review your changes. Use the Agent tool with subagent_type='architect' and describe which files/features you changed. Display the architect's review verbatim in your final response to the user — do not summarize or hide it."}
JSON

exit 0
