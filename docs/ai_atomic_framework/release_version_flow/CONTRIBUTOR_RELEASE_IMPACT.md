<!-- doc_id: doc_other_0724 -->
# Contributor Release Impact Guide

本文件說明外部 contributor 或內部 contributor 如何在 PR 中填寫 release intent。ATM 可以先用 `.atm/release-intents/*.md`，之後再轉成 Changesets。

## 1. When Required

以下情境必須提供 release intent：

1. 修改 public API、CLI、schema、plugin SDK、adapter 行為或 agent-pack 公開契約。
2. 修改 release surface，例如 release workflow、trust chain、known-bad list、compatibility matrix。
3. 修改 core 目錄，即使宣稱是 refactor，也必須說明 public API 是否受影響。
4. 修改 docs 但會改變 adopter 操作流程或 migration 指引。

以下情境可標 `release_impact: none`：

1. typo、格式、連結修正。
2. test-only change。
3. internal refactor 且沒有 public behavior change。
4. non-public tooling maintenance。

## 2. Required Metadata

```yaml
package_group: core | cli | plugin-sdk | adapter | agent-pack | docs | tooling | example
public_api: true | false
release_impact: none | patch | minor | major
core_impact: none | patch | minor | major
requires_migration: true | false
requires_release_note: true | false
```

## 3. Suggested Release Intent File

```markdown
---
package_group: core
public_api: true
release_impact: minor
core_impact: minor
requires_migration: true
requires_release_note: true
---

# Release Intent

## Summary

Describe the user-visible change.

## Changed Surfaces

1. `packages/core/**`
2. `schemas/**`

## Compatibility

Explain why this is patch, minor, or major.

## Migration

Describe required migration steps, or write `no-migration-needed` with rationale.

## Validation

List commands and expected evidence.
```

## 4. Contributor Review Expectations

1. Core PR 需連結 issue 或 RFC。
2. Core PR 需 core CODEOWNERS review。
3. `requires_migration: true` 時必須附 migration note。
4. `release_impact: minor|major` 必須進 release note。
5. 外部 contributor 不可自行觸發 release、建立 release commit 或推 official tag。

## 5. Automation

Contributor 或 maintainer 可執行：

```bash
node tools_node/atm-version-upgrade-flow.js classify --atm-root C:\Users\User\AI-Atomic-Framework
node tools_node/atm-version-upgrade-flow.js impact --version <next>
node tools_node/atm-version-upgrade-flow.js validate-contributor-impact
```
