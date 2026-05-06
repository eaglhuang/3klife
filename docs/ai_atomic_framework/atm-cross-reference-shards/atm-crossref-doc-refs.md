# ATM Cross Reference — doc_refs 欄位規範

> 這是 `ATM_cross_reference.md` 的「doc_refs 欄位規範」分片。完整索引見 `docs/ai_atomic_framework/ATM_cross_reference.md`。

## doc_refs 欄位規範

### 格式

```yaml
doc_refs:
  - "doc_other_0032#§1"          # 3klife-coexistence-plan.md §1 Freeze List
  - "doc_other_0035#§3.1"        # upstream-versioning-policy.md §3.1 標準流程
```

或單行陣列形式：

```yaml
doc_refs: ["doc_other_0032#§1", "doc_other_0035#§3.1"]
```

### 強制情境（重大任務卡必填）

| 任務卡類型 | 必引用的 doc_ref |
|---|---|
| 並行開發 / freeze 相關 | `doc_other_0032#§1`（Freeze List）+ `doc_other_0032#§3`（仲裁順序） |
| Breaking change / migration | `doc_other_0035#§3`（Deprecation Cycle）+ `doc_other_0035#§5`（PR Template） |
| Adapter 化卡（ATM-3-*） | `doc_other_0036#§命運總表` + `doc_other_0036#§詳細命運說明` |
| 版本政策 / compat 升級 | `doc_other_0035#§1`（Tier）+ `doc_other_0035#§4`（Compatibility Matrix） |
| 3KLife 消費升級（S1→S4） | `doc_other_0033#§S2`（對應 stage）+ `doc_other_0033#§跨stage通則` |

### 不強制情境

- 日常 bug fix（P2/P3 小卡）
- 單純文件修正
- 測試補充（無行為變更）

### 加入 atm-task-template.md 的欄位位置

在 frontmatter `notes` 之後加入可選欄位：

```yaml
doc_refs: []      # 重大卡填入，格式: ["doc_other_XXXX#§N"]
```

---
