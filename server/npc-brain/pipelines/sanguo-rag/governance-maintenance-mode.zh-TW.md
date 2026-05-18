<!-- doc_id: doc_server_pipeline_0060 -->
# Sanguo-RAG Governance Maintenance Mode

## 大白話說明

這份文件是在幫整個治理重構「收尾」。前面我們已經把很多藏在 Python 裡的規則搬成 policy、rule、catalog、schema，也補了 validator、harness、CI 與 runbook。從 Phase 48 開始，預設不要再一直開 Phase 49、50、51。除非真的有 production 瓶頸、schema 破壞、新 runtime consumer 或資料安全風險，否則就用維護流程處理。

## 允許重新開大型治理工作的條件

- production state 或 run history 被證明是瓶頸。
- source schema 或 runtime schema 有 breaking change。
- 有資料遺失、錯誤寫入或安全風險。
- 新 consumer 需要目前 governance 沒有支援的穩定 contract。
- runbook 或 CI 缺口造成 operator 無法安全重跑。

## 維護模式固定檢查

1. 先跑 strict-local CI。
2. 確認 golden snapshot 沒有非預期漂移。
3. 確認工作區只 stage 本次範圍，不混入 unrelated dirty file。
4. 若需要新增 policy/rule/catalog，必須進 expected files 與 validator summary。

## 收斂原則

- 小修走維護 commit。
- 大改先寫 trigger evidence。
- PostgreSQL 與 production vector rollout 仍維持條件式，不因文件存在就自動啟用。
