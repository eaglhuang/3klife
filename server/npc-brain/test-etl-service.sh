#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${LANGGRAPH_BASE_URL:-http://127.0.0.1:2025}"
GRAPH_ID="${GRAPH_ID:-sanguo_etl_graph}"
OUT_DIR="${ROOT_DIR}/local"
RAW_INPUT="${1:-lu-bu}"

if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  echo "Missing ${ROOT_DIR}/.env" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required." >&2
  exit 1
fi

if [[ "${RAW_INPUT}" == \{* || "${RAW_INPUT}" == \[* ]]; then
  INPUT_JSON="${RAW_INPUT}"
else
  INPUT_JSON="$(python3 - "${RAW_INPUT}" <<'PY'
import json
import sys
print(json.dumps({"focusGeneralId": sys.argv[1]}, ensure_ascii=False))
PY
)"
fi

mkdir -p "${OUT_DIR}"

set -a
# shellcheck disable=SC1091
source "${ROOT_DIR}/.env"
set +a

: "${NPC_BRAIN_DEPLOY_API_KEY:?NPC_BRAIN_DEPLOY_API_KEY must be set in .env}"

timestamp="$(date +%Y%m%d-%H%M%S)"
assistants_path="${OUT_DIR}/etl-assistants-${timestamp}.json"
thread_path="${OUT_DIR}/etl-thread-${timestamp}.json"
payload_path="${OUT_DIR}/etl-run-payload-${timestamp}.json"
result_path="${OUT_DIR}/etl-run-result-${timestamp}.json"

echo "[1/5] Health check: ${BASE_URL}/healthz"
curl --silent --show-error --fail \
  -H "X-API-Key: ${NPC_BRAIN_DEPLOY_API_KEY}" \
  "${BASE_URL}/healthz" >/dev/null

echo "[2/5] Resolve assistant for graph: ${GRAPH_ID}"
curl --silent --show-error --fail \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${NPC_BRAIN_DEPLOY_API_KEY}" \
  "${BASE_URL}/assistants/search" \
  -d '{}' >"${assistants_path}"

ASSISTANT_ID="$(python3 - "${assistants_path}" "${GRAPH_ID}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
graph_id = sys.argv[2]

if isinstance(payload, list):
    items = payload
elif isinstance(payload, dict):
    items = payload.get('assistants') or payload.get('items') or payload.get('data') or []
else:
    items = []

for item in items:
    if not isinstance(item, dict):
        continue
    if item.get('graph_id') == graph_id or item.get('graphId') == graph_id:
        print(item.get('assistant_id') or item.get('assistantId') or item.get('id') or '')
        break
PY
)"

if [[ -z "${ASSISTANT_ID}" ]]; then
  echo "Unable to find assistant for graph ${GRAPH_ID}. See ${assistants_path}" >&2
  exit 1
fi

echo "[3/5] Create thread"
curl --silent --show-error --fail \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${NPC_BRAIN_DEPLOY_API_KEY}" \
  "${BASE_URL}/threads" \
  -d '{}' >"${thread_path}"

THREAD_ID="$(python3 - "${thread_path}" <<'PY'
import json
import sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
print(payload.get('thread_id') or payload.get('threadId') or payload.get('id') or '')
PY
)"

if [[ -z "${THREAD_ID}" ]]; then
  echo "Unable to resolve thread_id. See ${thread_path}" >&2
  exit 1
fi

python3 - "${ASSISTANT_ID}" "${INPUT_JSON}" "${payload_path}" <<'PY'
import json
import sys
from pathlib import Path
assistant_id, input_json, output_path = sys.argv[1:4]
payload = {
    'assistant_id': assistant_id,
    'input': json.loads(input_json),
}
Path(output_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
PY

echo "[4/5] Run graph via /threads/${THREAD_ID}/runs/wait"
curl --silent --show-error --fail \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${NPC_BRAIN_DEPLOY_API_KEY}" \
  "${BASE_URL}/threads/${THREAD_ID}/runs/wait" \
  --data @"${payload_path}" >"${result_path}"

echo "[5/5] Summarize result"
python3 - "${result_path}" "${THREAD_ID}" "${ASSISTANT_ID}" "${GRAPH_ID}" "${BASE_URL}" <<'PY'
import json
import sys
from pathlib import Path

result_path, thread_id, assistant_id, graph_id, base_url = sys.argv[1:6]
data = json.loads(Path(result_path).read_text(encoding='utf-8'))

focus_generals = [item.get('generalId') for item in data.get('focusGenerals', []) if isinstance(item, dict)]
bottlenecks = data.get('bottlenecks', [])[:3]
commands = data.get('recommendedCommands', [])[:4]
completion = ((data.get('completionSummary') or {}).get('completion') or {})
overall = completion.get('overallPercent')
review_questions = data.get('focusReviewQuestions', [])[:3]

print('')
print('ETL service smoke test succeeded.')
print(f'Base URL: {base_url}')
print(f'Graph ID: {graph_id}')
print(f'Assistant ID: {assistant_id}')
print(f'Thread ID: {thread_id}')
print(f'Result file: {result_path}')
print('')
print(f"resolvedFocusGeneralId: {data.get('resolvedFocusGeneralId')}")
print(f'focusGenerals: {focus_generals}')
if overall is not None:
    print(f'overallCompletionPercent: {overall}')
print('')
print('Top bottlenecks:')
for item in bottlenecks:
    if not isinstance(item, dict):
        continue
    print(f"  - {item.get('dimension')} | gap={item.get('weightedGapPoints')} | score={item.get('score')}")
    if item.get('why'):
        print(f"    {item.get('why')}")
print('')
print('Recommended commands:')
for item in commands:
    if not isinstance(item, dict):
        continue
    print(f"  - [{item.get('stage')}] {item.get('label')}")
    print(f"    {item.get('command')}")
print('')
if review_questions:
    print('Focus review questions:')
    for item in review_questions:
        if not isinstance(item, dict):
            continue
        question = item.get('question') or item.get('prompt') or item.get('title') or item.get('eventTitle') or json.dumps(item, ensure_ascii=False)
        print(f'  - {question}')
else:
    print('Focus review questions: []')
PY

echo ""
echo "Raw files saved under ${OUT_DIR}"