<!-- doc_id: doc_other_0721 -->
# ATM Release Version Flow

本目錄是 3KLife 內 ATM 版本策略、升級規則、release run 與開源貢獻 release intent 的 canonical 入口。

舊位置 `docs/RELEASE_CHECKLIST.md`、`docs/UPGRADE_PROPOSAL_PUBLIC_RULES.md` 與 `docs/releases/*.md` 只保留短 stub，正式內容以本目錄為準。

## 核心入口

1. [ATM版本升級策略規劃書.md](./ATM版本升級策略規劃書.md)
2. [ATM版本升級規則書.md](./ATM版本升級規則書.md)
3. [OPEN_SOURCE_VERSIONING_POLICY.md](./OPEN_SOURCE_VERSIONING_POLICY.md)
4. [CONTRIBUTOR_RELEASE_IMPACT.md](./CONTRIBUTOR_RELEASE_IMPACT.md)
5. [CORE_CHANGE_POLICY.md](./CORE_CHANGE_POLICY.md)
6. [PACKAGE_GROUPS.md](./PACKAGE_GROUPS.md)
7. [CODEOWNERS_POLICY.md](./CODEOWNERS_POLICY.md)
8. [CHANGESET_POLICY.md](./CHANGESET_POLICY.md)

## Release 執行文件

1. [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
2. [UPGRADE_PROPOSAL_PUBLIC_RULES.md](./UPGRADE_PROPOSAL_PUBLIC_RULES.md)
3. [release_runs/](./release_runs/)

## 模板

1. [release-note-template.md](./release-note-template.md)
2. [release-run-record-template.md](./release-run-record-template.md)
3. [release-freeze-notice-template.md](./release-freeze-notice-template.md)

## 文件歸位規則

1. 新的 ATM release policy、versioning policy、upgrade rule 與 run record 一律放在本目錄。
2. 歷史 release run 一律放在 `release_runs/`，檔名保留原 release target。
3. 根目錄只允許保留短 stub，stub 必須只指向本目錄的新 canonical 位置。
4. 若文件會影響正式 release surface，PR 需依 [CHANGESET_POLICY.md](./CHANGESET_POLICY.md) 補 release impact metadata。
