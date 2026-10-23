---
name: atm-adopter-upgrade
description: Safely upgrade the ATM CLI and repo-local integrations in a downstream adopter. Use when a project asks to pull a newer ATM release, refresh its runner, or make adopter upgrades repeatable.
---

# ATM Adopter Upgrade

Use this workflow in a downstream repository such as 3KLife. The goal is a versioned, reproducible upgrade that preserves the host project's rules and task data.

## Preconditions

1. Read the host repository's keep summary and `AGENTS.md`.
2. Read the host's ATM upgrade and internal sync skills, plus the upstream release instructions.
3. Run the host's required ATM identity adoption, task collision check, and task lock before editing governed files. Use a formal task card when the host requires one.
4. Use an isolated branch or worktree. Record the current runner version, branch, dirty state, and the exact files the upgrade may change.
5. Query the official package registry and source tag. Do not assume a GitHub tag's frozen runner matches the package release.

## Verify the candidate

For the npm distribution, query its version, integrity, and tarball from the registry, install it in a disposable prefix, and invoke the package entrypoint directly:

```powershell
npm view @ai-atomic-framework/cli version dist.integrity dist.tarball --json
npm install --prefix <isolated-prefix> @ai-atomic-framework/cli@<candidate-version>
node <isolated-prefix>/node_modules/@ai-atomic-framework/cli/dist/npm-runtime/atm.mjs --version
```

Accept the candidate only when `evidence.runtimeBuildIdentity` reports the requested version, `status: verified`, and the expected upstream source commit. Record the registry integrity and source commit in the task evidence.

Compare the current host entrypoint with the candidate. Reject stale or mismatched frozen artifacts. If `release/atm-onefile/atm.mjs` in the source tag reports a different version from the tag/package, do not sync it.

## Dry-run the supported adopter path

Use the candidate's documented setup or internal-release sync command with `--dry-run` first. Capture the structured result, target file list, and every integration conflict. Then run the candidate's read-only `doctor`, framework status, and task audit against the adopter to expose migration requirements before writing.

An edited or malformed ATM-managed block in `AGENTS.md` is a stop condition for `setup`. Preserve the host's custom instructions. Do not use `--force`, delete the block, or reproduce setup's writes by hand to get around the refusal. If the owner authorizes reconciliation, move host-specific guidance outside the generated block, restore the expected managed block, rerun setup dry-run, and review the exact diff before applying it.

If the candidate reports charter files missing or corrupt, inspect the actual files and the migration it proposes. `init --adopt default --force` can replace existing charter/bootstrap files; never run it against a customized adopter without a reviewed migration plan and explicit task scope. A green `init --dry-run` alone does not prove that doctor or charter integrity passes.

## Apply and validate

1. Apply only the supported command whose dry-run diff matches the task scope. Keep package/runtime caches outside source control unless the official adopter flow explicitly requires tracked files.
2. Refresh project skills through the host's sync script when integration skills change.
3. Verify the repo-local route and all applicable integrations.
4. Run the host's `doctor`, framework status, task audit, and `next` commands. Confirm the host task queue and existing work items remain intact.
5. Run the host's encoding, diff, and appropriate compute gates. Report all pre-existing failures separately from new ones.
6. Record the installed CLI version and runtime build identity, command JSON, changed-file hashes, and validation results in the task evidence.

## Rollback

Rollback only the files changed by this task, using the reviewed diff or versioned source. Preserve unrelated changes, task records, actor identity, and other worktrees. If validation fails after a supported write, capture the failure first, then restore the exact pre-upgrade bytes for affected files and rerun the host checks. Never restore or overwrite a host-owned `AGENTS.md` block without its owner's approved plan.
