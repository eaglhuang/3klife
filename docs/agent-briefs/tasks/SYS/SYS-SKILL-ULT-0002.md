---
doc_id: doc_task_0163
id: SYS-SKILL-ULT-0002
priority: P0
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
  - UTEAMBUFF
smoke_route: "BattleScene -> UltimateBtn -> 全隊增益奧義 -> 全隊 icon / 數值 / 戰報同步"
verification_commands:
  - npm run check:ts-syntax
  - npm test
  - curl.exe http://localhost:7456/asset-db/refresh
  - npm run check:encoding:touched
docs_backwritten:
  - docs/遊戲規格文件/系統規格書/奧義系統.md (doc_spec_0030)
  - docs/主戰場UI規格書.md (doc_ui_0001)
notes: "2026-10-31 | 狀態: 進行中 | 驗證: TeamAura 7＋TeamAuraBattleWiring 3 測試過 | 變更: 第 1 片純邏輯 TeamAura——8 個 team-buff 奧義參數表、同家族逐欄取高不疊加且有上限、存活單位目標選取、減傷→護盾→HP 結算順序、陣營為鍵使中途加入單位自動吃到加成；第 2 片接戰場——奧義施放成功開 aura、施放陣營回合倒數、普攻攻擊／防禦倍率與減傷；第 3 片戰報提示——TeamAuraChanged 事件，開始寫全隊效果與回合、結束寫回退；第 4 片郭嘉十勝定論——條件型對負面狀態目標增傷 30%（上限 50%） | 阻塞: 護盾扣量與 HUD 常駐 icon 未接；條件型（曹操對酒當歌、孫權坐斷東南）與首輪必暴擊、嘲諷待後續片；原 notes 覆蓋名單含孫權4，但其資料 family 為 team-heal"
---

# [SYS-SKILL-ULT-0002] 奧義全隊增益家族

## 背景

全隊增益是大部分主君型、統率型名將的核心身份標誌，也是隊伍流派的主軸。這一包需要把 aura、護盾、士氣、抗性與反擊率等群體效果先定成同一條規則。

## 實作清單

- [ ] **新增 / 修改** `TeamAuraResolver`
  - 攻防速增益
  - 群體護盾
  - 抗性 / 反擊 / 士氣修正
- [ ] **補齊** ally-all 目標選取與入場補掛規則。
- [ ] **補齊** UI / HUD 群體狀態摘要。

## 驗收條件

### Unit Test 驗收

- [ ] 驗證全隊目標列表、漏選 / 死亡單位排除規則。
- [ ] 驗證 aura 刷新、覆蓋、來源追蹤。
- [ ] 驗證護盾與攻防 buff 的結算順序。

### A. 畫面表演驗收標準

- [ ] 全隊被施加增益時，需有一致且可讀的群體回饋。
- [ ] 不得只讓施法者有演出、受益單位沒有任何提示。
- [ ] 護盾與一般 buff 視覺要可區分。

### B. 數值公式驗收標準

- [ ] 全隊增益乘區、護盾吸收、士氣修正要固定。
- [ ] 同家族奧義不可無限制疊加出爆表結果。
- [ ] 入場後補掛、復活後補掛與中途加入單位的規則必須明確。

### C. 整合演出流程驗收標準

- [ ] 施放、群體掛狀態、後續普攻 / 反擊吃到加成、到期移除要完整跑通。
- [ ] BattleHUD 的增益摘要需能反映當前隊伍是否處於 aura 覆蓋中。
- [ ] AI 需能在我方血線穩定但需要擴大優勢時優先使用此 family。

## 結案檢查清單

- [ ] `UTEAMBUFF` 不得拆成多份獨立 team-buff 實作。
- [ ] Battle / UI / AI 對 aura 狀態共用同一份結果。
- [ ] 代表槽位已全部能用參數落地。
