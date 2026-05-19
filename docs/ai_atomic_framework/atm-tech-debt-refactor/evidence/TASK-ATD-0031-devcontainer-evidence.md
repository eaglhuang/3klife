---
doc_id: doc_other_0731
task_id: TASK-ATD-0031
title: Evidence — Docker / devcontainer 作 contributor reproducibility
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Created the reproducible contributor environment surface: `Dockerfile`
(Node 24 + workspace install) and `.devcontainer/devcontainer.json` (VS
Code / Codespaces). Updated `CONTRIBUTING.md` with the usage section.

## Changes Made

### `Dockerfile` (new)
- 2-stage build: `workspace` (cacheable npm install) + `dev` (full repo).
- Node 24 + bookworm-slim base.
- Build-time dependencies for native modules: git, ca-certificates,
  python3, make, g++.
- Layered install: copies `package.json` + `packages/` + `scripts/` first
  so source changes don't bust the dependency cache.
- Smoke check that the CLI parses (`node atm.mjs --help`).
- Defaults to interactive bash.

### `.devcontainer/devcontainer.json` (new)
- Uses the Dockerfile's `dev` target.
- Mounts the local repo at `/workspace`.
- `remoteUser: "node"` to avoid root.
- Installs eslint + TypeScript next extensions in VS Code.
- Disables auto-fix-on-save (matches the explicit-validate culture).
- `postCreateCommand` smoke-tests Node + npm + the CLI.
- Sets `ATM_TEMP_ROOT=/tmp/atm-devcontainer` so test fixtures don't leak
  into the mounted repo.

### `CONTRIBUTING.md`
- Added "Reproducible dev environment (Docker / devcontainer)" subsection
  under the existing Validation section.
- Both usage paths documented (VS Code devcontainer + docker build/run).
- Explicit note that the image is contributor reproducibility only — not
  published to a registry.

## Invariants Checked

- No public surface change. The image and devcontainer are contributor
  infrastructure, not part of the CLI or schema contract.

## Validator Results

```
typecheck: 0 errors (clean)
```

The image is not built in CI as part of this card — that's a separate
infrastructure decision. The image is provided as the spec; contributors
can build locally with `docker build -t ai-atomic-framework:dev .`.
