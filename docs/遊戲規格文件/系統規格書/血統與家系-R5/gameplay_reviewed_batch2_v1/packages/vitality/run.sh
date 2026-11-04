#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 verify_sources.py
node --import ./probes/register.mjs ./probes/run.mjs > probes/run.stdout.txt 2> probes/run.stderr.txt
cat probes/run.stdout.txt
