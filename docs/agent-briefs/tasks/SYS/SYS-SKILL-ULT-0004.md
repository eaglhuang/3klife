---
doc_id: doc_task_0165
id: SYS-SKILL-ULT-0004
priority: P1
phase: M1-E
created: 2026-04-15
created_by_agent: GitHubCopilot
owner: Agent1
status: in-progress
started_at: 2026-10-31T12:00:00+08:00
started_by_agent: ClaudeCode_opus-5-5
type: ultimate-family
related_cards:
  - SYS-SKILL-CORE-0001
depends:
  - SYS-SKILL-CORE-0001
runtime_scope:
  - UALLDEBUFF
smoke_route: "BattleScene -> UltimateBtn -> 敵方全體減益奧義 -> 敵軍全體 debuff / DOT / 戰報同步"
verification_commands:
  - npm run check:ts-syntax
  - npm test
  - curl.exe http://localhost:7456/asset-db/refresh
  - npm run check:encoding:touched
docs_backwritten:
  - docs/遊戲規格文件/系統規格書/奧義系統.md (doc_spec_0030)
  - docs/主戰場UI規格書.md (doc_ui_0001)
notes: "覆蓋諸葛亮4、周瑜1、張飛4、郭嘉3/5、曹植5、貂蟬3/5（資料實際為貂蟬3/5、張飛4、郭嘉3/5、司馬懿4、周瑜1；諸葛亮4、曹植5 不屬此家族）。第 1 片：純邏輯 EnemyMassDebuff.ts（目標列舉排除死亡/無敵且與順序無關、郭嘉3 輪流減益、刷新取較強值+上限、倒數、驅散白名單、戰報摘要）。魅惑/沉默暫以暈眩近似；第 2 片：接戰場（BattleState.massDebuffs、dispatcher 對敵方套持續層／附加狀態（先判爆發免控與全隊抗性）／驅散、CombatResolver 命中／暴擊／攻擊／易傷、被減益陣營回合先吃 DOT 再倒數）。第 3 片：司馬懿驅散轉護盾（每清 1 個 5% 最大 HP、上限 30%、不疊加取大）；EVENT_NAMES.MassDebuffChanged 開始／結束事件與 UIBridge 戰報。待辦：敵方 HUD 常駐 icon、群體回饋與 DOT 跳字（畫面演出）。"
---

# [SYS-SKILL-ULT-0004] 奧義敵方全體減益家族

## 背景

敵方全體減益是控制戰場節奏與削弱敵軍整體輸出的核心手段。這一包要把沉默、崩解、失神、易傷、群體 DOT 放進同一個 family，不再把每條奧義拆成獨立 debuff 表。

## 實作清單

- [ ] **新增 / 修改** `EnemyMassDebuffResolver`
  - 沉默 / 減速 / 易傷 / DOT / 驅散
- [ ] **補齊** enemy-all 目標列舉與免疫判定。
- [ ] **補齊** 群體 debuff 的 HUD / 戰報摘要。

## 驗收條件

### Unit Test 驗收

- [ ] 驗證群體 debuff 的目標完整性與免疫單位排除。
- [ ] 驗證 DOT / silence / weaken 的持續與刷新規則。
- [ ] 驗證驅散只處理可被清除的正面狀態。

### A. 畫面表演驗收標準

- [ ] 全體被削弱時要有一眼可辨的群體回饋。
- [ ] 關鍵 debuff 必須能在敵方 HUD 上可讀。
- [ ] DOT 持續傷害與一般受擊要能區分。

### B. 數值公式驗收標準

- [ ] 群體 DOT、減速、易傷倍率需固定，且與單體 debuff 規則兼容。
- [ ] 群體 debuff 不可因目標順序不同而有不同覆蓋結果。
- [ ] 免疫、抗性、淨化優先序必須明確。

### C. 整合演出流程驗收標準

- [ ] 施放、全體上 debuff、下一回合行動受影響、到期或被淨化移除要完整串通。
- [ ] AI 需把關鍵敵將與全體壓制需求納入判斷。
- [ ] replay 必須重現相同 DOT tick 與 debuff 狀態變化。

## 結案檢查清單

- [ ] 敵方全體減益已整合為單一家族。
- [ ] 與單體 debuff 規則沒有分裂。
- [ ] 代表槽位可用 family 參數完全描述。
