#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${LANGGRAPH_PORT:-2025}"
LOG_DIR="${ROOT_DIR}/local"
LOG_PATH="${LANGGRAPH_LOG_PATH:-${LOG_DIR}/langgraph-dev-external.log}"
LT_HOST="${LT_HOST:-https://localtunnel.me}"

if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  echo "Missing ${ROOT_DIR}/.env" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run localtunnel." >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"

set -a
# shellcheck disable=SC1091
source "${ROOT_DIR}/.env"
set +a

: "${NPC_BRAIN_DEPLOY_API_KEY:?NPC_BRAIN_DEPLOY_API_KEY must be set in .env}"

cleanup() {
  if [[ -n "${LANGGRAPH_PID:-}" ]] && kill -0 "${LANGGRAPH_PID}" 2>/dev/null; then
    kill "${LANGGRAPH_PID}" 2>/dev/null || true
    wait "${LANGGRAPH_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

"$HOME/.venv/3klife-etl/bin/langgraph" dev --no-browser --port "${PORT}" >"${LOG_PATH}" 2>&1 &
LANGGRAPH_PID=$!

echo "Waiting for local LangGraph dev on http://127.0.0.1:${PORT} ..."
curl --silent --show-error --fail \
  --retry 30 --retry-connrefused --retry-delay 1 \
  -H "X-API-Key: ${NPC_BRAIN_DEPLOY_API_KEY}" \
  "http://127.0.0.1:${PORT}/healthz" >/dev/null

echo "Local server ready."
echo "Log: ${LOG_PATH}"
echo "Share only the tunnel URL and NPC_BRAIN_DEPLOY_API_KEY."
echo "Press Ctrl+C to stop both the local server and the tunnel."

LT_ARGS=(--yes localtunnel --port "${PORT}" --host "${LT_HOST}")

if [[ -n "${LT_SUBDOMAIN:-}" ]]; then
  LT_ARGS+=(--subdomain "${LT_SUBDOMAIN}")
fi

if [[ "${LT_PRINT_REQUESTS:-0}" == "1" ]]; then
  LT_ARGS+=(--print-requests)
fi

exec npx "${LT_ARGS[@]}"