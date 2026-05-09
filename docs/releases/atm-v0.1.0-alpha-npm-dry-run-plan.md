<!-- doc_id: doc_other_0109 -->
# ATM v0.1.0-alpha npm Dry-Run Plan

Date: May 9, 2026  
Task: `ATM-5-0004`

## 1. Goal

Produce deterministic publish-readiness evidence for `v0.1.0-alpha` packages.

## 2. Local Probe Result (Tracking Repo)

Command executed in this repository:

```bash
npm.cmd pack --dry-run
```

Result:

1. Failed with `Invalid package, must have name and version`.
2. Confirms this workspace is a tracking host, not the upstream publish target.

## 3. Upstream Dry-Run Procedure (Required)

Execute in upstream package workspace:

```bash
npm ci
npm run test
npm run typecheck
npm run lint
npm pack --dry-run
npm publish --dry-run
```

If monorepo/workspaces are used, run the same flow per publishable package:

1. `core`
2. `cli`
3. `plugin-*`
4. `adapter-*`

## 4. Package Naming Gate

Every publishable package MUST satisfy:

1. `core` / `cli` / `plugin-*` / `adapter-*` naming convention.
2. semver tag matches release draft version.
3. changelog/release notes references are synchronized.

## 5. Evidence Template

Attach for each package:

1. `npm pack --dry-run` output
2. `npm publish --dry-run` output
3. tarball file list and size summary
4. provenance statement (build source / commit / toolchain)
5. release owner decision (`approve` / `request-changes` / `reject`)

## 6. Exit Criteria

Dry-run phase is complete only when:

1. All target packages have successful dry-run outputs.
2. No naming/provenance/security blockers remain.
3. Release owner sign-off is upgraded to `approve`.
