<!-- doc_id: doc_other_0727 -->
# ATM CODEOWNERS Policy

本文件定義 ATM 開源 PR 的 review ownership。CODEOWNERS 用來要求 owner review，不用來禁止外部 contributor 參與 core。

## 1. Ownership Map

建議 `.github/CODEOWNERS` 規則：

```text
packages/core/** @atm/core-maintainers
schemas/** @atm/core-maintainers
compatibility-matrix.json @atm/core-maintainers

packages/cli/** @atm/cli-maintainers
atm.mjs @atm/cli-maintainers

packages/integration-* @atm/adapter-maintainers
packages/agent-pack-* @atm/adapter-maintainers

release/** @atm/release-owners
.github/workflows/release-* @atm/release-owners
known-bad-versions.json @atm/release-owners
```

## 2. Branch Protection

Release branches 與 protected main branch 應要求：

1. required status checks。
2. CODEOWNERS approval。
3. Release Owner approval for release surface。
4. no direct push for external contributors。
5. signed or trusted release tag path。

## 3. Release Owner Authority

只有 Release Owner 或明確授權 maintainer 可以：

1. 觸發正式 release workflow。
2. 建立 release commit。
3. 推 official tag。
4. 改 dist-tag。
5. 宣告 known-bad release。

## 4. Review Escalation

以下變更需 Release Owner review：

1. release workflow。
2. version compatibility gate。
3. skew matrix。
4. known-bad list。
5. changelog generation。
6. publish credentials or trust chain。
