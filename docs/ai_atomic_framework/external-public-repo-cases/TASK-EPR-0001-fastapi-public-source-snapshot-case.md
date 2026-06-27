# TASK-EPR-0001 FastAPI Public-Source Snapshot Case

## Claim

ATM exercised a provenance-pinned FastAPI public-source snapshot inside the live `3klife-npc-brain` host repository and preserved replayable validation evidence before and after a small host-visible snapshot modification.

## Non-Claim

This case does not claim governance over the FastAPI upstream maintainer workflow. It is a host-repo case built on imported public-source code with pinned provenance.

## Why FastAPI First

- `3klife-npc-brain` already runs on real `FastAPI` and `Pydantic` dependencies.
- The host already had stable smoke coverage for `/healthz`, `/v1/npc/context-options`, `/v1/npc/keyword-options`, and `/v1/npc/dialogue`.
- The case could be published with one upstream snapshot helper, one host visibility hook, and one replayable capture script.
- This avoided inventing a synthetic benchmark or over-claiming full upstream governance.

## Provenance

- Upstream URL: `https://github.com/fastapi/fastapi.git`
- Pinned snapshot HEAD: `82064857539e6286522c347b4b11331b48dd2378`
- Host repo HEAD during capture: `738b9883880742cd36b64f1f81ce6a638f073135`
- Clean baseline import path: `C:\Users\User\3klife-npc-brain\local\public-source-snapshots\fastapi-0.136.3-baseline\fastapi\__init__.py`
- Post-change import path: `C:\Users\User\3klife-npc-brain\local\public-source-snapshots\fastapi-0.136.3\fastapi\__init__.py`

## Published Surface

- Snapshot helper export: `local/public-source-snapshots/fastapi-0.136.3/fastapi/__init__.py`
- Host visibility hook: `app/main.py`
- Snapshot bootstrap script: `scripts/prepare_fastapi_public_source_case.py`
- Replayable capture script: `scripts/capture_fastapi_public_source_case.py`

The snapshot change adds `get_public_source_snapshot_metadata()`, which exposes package version, module path, repo root, pinned HEAD, and helper identity. The host change adds `fastapiSnapshot` to `/healthz` only when `NPC_BRAIN_FASTAPI_CASE_TAG` is set, so ordinary runtime behavior remains unchanged.

## ATM Readiness Notes

- `node atm.mjs orient --cwd . --json` on `3klife-npc-brain` reported Python detection, legacy URI support, and bundled Python adapter availability.
- Shadow guidance session `guidance-20260627101147-06b51a0bc8` analyzed `fastapi/applications.py` and treated `FastAPI.__init__` as a trunk no-touch zone for this minimal case.
- Shadow guidance session `guidance-20260627101201-3ef3461786` covered `fastapi/__init__.py`, so the published case intentionally stayed with a tiny helper export instead of mutating routing core or constructor behavior.
- The ATM framework repo still reported `ATM_RUNNER_SYNC_REQUIRED` during captain preflight. That issue was recorded as a framework-state note, but it did not block this host-side evidence capture.

## Validation

- Baseline capture command:
  - `C:\Users\User\3klife-npc-brain\.venv\Scripts\python.exe scripts\prepare_fastapi_public_source_case.py`
  - `C:\Users\User\3klife-npc-brain\.venv\Scripts\python.exe scripts\capture_fastapi_public_source_case.py --mode baseline --snapshot-root local/public-source-snapshots/fastapi-0.136.3-baseline`
- Post-change capture command:
  - `C:\Users\User\3klife-npc-brain\.venv\Scripts\python.exe scripts\capture_fastapi_public_source_case.py --mode post-change --case-tag npc-brain-fastapi-case`
- Baseline smoke: pass
- Post-change smoke: pass
- Post-change `/healthz` exposed:
  - `fastapiSnapshot.caseTag = npc-brain-fastapi-case`
  - `fastapiSnapshot.snapshot.repoHead = 82064857539e6286522c347b4b11331b48dd2378`
  - `fastapiSnapshot.snapshot.helper = get_public_source_snapshot_metadata`

## Artifact Root

- `C:\Users\User\3klife-npc-brain\artifacts\external-public-repo\fastapi\2026-06-27`

Key files:

- `provenance.json`
- `baseline.json`
- `post-change.json`
- `summary.json`
- `paper-safe-summary.md`
- `atm-governance-readiness.json`
- `commands.log`
- `artifact-hash-manifest.sha256`

## Publication-Safe Summary

ATM now includes a public-source snapshot governance case built on a provenance-pinned FastAPI snapshot integrated into the live `3klife-npc-brain` host repository. The host continued to execute against the imported FastAPI code path before and after a small governed snapshot helper change, and the evidence set is replayable from the committed capture script and artifact root. This case should be cited as host-side governance over imported public-source code, not as governance over the FastAPI upstream maintainer workflow.
