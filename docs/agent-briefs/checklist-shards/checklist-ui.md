<!-- doc_id: doc_other_2694 -->
# Agent Briefs CheckList — UI 視覺介面系統

> 這是 `CheckList.md` 的「UI 視覺介面系統」分片。完整索引見 `docs/agent-briefs/CheckList.md`。

## UI 視覺介面系統

| 優先級 | 卡號 | 簡單描述 | 狀態 | 完成度% | Owner |
|---|---|---|---|---|---|
| P0 | [UI-1-0001](tasks/UI-1-0001.md (doc_task_0009)) (doc_task_0009) | 搬遷 `nav_ink` 按鈕 family 至 runtime 路徑 | done | 100% | Agent2 |
| P0 | [UI-1-0002](tasks/UI-1-0002.md (doc_task_0010)) (doc_task_0010) | 搬遷 `paper_utility` 按鈕 family 至 runtime 路徑 | done | 100% | Agent2 |
| P0 | [UI-1-0003](tasks/UI-1-0003.md (doc_task_0011)) (doc_task_0011) | 搬遷 `warning` 按鈕 family 至 runtime 路徑 | done | 100% | Agent2 |
| P0 | [UI-1-0004](tasks/UI-1-0004.md (doc_task_0012)) (doc_task_0012) | 產生共用 shadow 與 noise 紋理 | not-started | 0% | Agent2 |
| P0 | [UI-2-0001](tasks/UI-2-0001.md (doc_task_0025)) (doc_task_0025) | 更新 `lobby-main-default` skin 指向 `nav_ink` | done | 100% | Agent1 |
| P0 | [UI-2-0002](tasks/UI-2-0002.md (doc_task_0026)) (doc_task_0026) | 更新 `duel-challenge-default` skin 指向 `paper_utility` | done | 100% | Agent1 |
| P0 | [UI-2-0021](tasks/UI-2-0021.md (doc_task_0045)) (doc_task_0045) | 修復 PreviewInEditor 的 SpriteFrame 路徑解析 | done | 100% | Agent1 |
| P1 | [UI-2-0003](tasks/UI-2-0003.md (doc_task_0027)) (doc_task_0027) | 新增 parchment 系列 design token | done | 100% | Agent1 |
| P1 | [UI-2-0004](tasks/UI-2-0004.md (doc_task_0028)) (doc_task_0028) | 新增淺底專用 label-style 變體 | done | 100% | Agent1 |
| P1 | [UI-2-0006](tasks/UI-2-0006.md (doc_task_0030)) (doc_task_0030) | 驗證 shared button family 的 border 20px 規範 | done | 100% | Agent1 |
| P1 | [UI-2-0007](tasks/UI-2-0007.md (doc_task_0031)) (doc_task_0031) | 為多個 skin 補上 shadow slot 定義 | done | 100% | Agent1 |
| P1 | [UI-2-0008](tasks/UI-2-0008.md (doc_task_0032)) (doc_task_0032) | 建立 item-cell 標準 skin fragment | done | 0% | Agent1 |
| P1 | [UI-2-0009](tasks/UI-2-0009.md (doc_task_0033)) (doc_task_0033) | 建立 common-parchment skin fragment | done | 0% | Agent1 |
| P1 | [UI-2-0010](tasks/UI-2-0010.md (doc_task_0034)) (doc_task_0034) | 為 `UIPreviewBuilder` 加入 shadow layer 渲染 | done | 85% | Agent1 |
| P1 | [UI-2-0011](tasks/UI-2-0011.md (doc_task_0035)) (doc_task_0035) | 為 `UIPreviewBuilder` 加入 noise overlay | done | 100% | Agent1 |
| P1 | [UI-2-0012](tasks/UI-2-0012.md (doc_task_0036)) (doc_task_0036) | `duel.btn.accept` 對齊 `equipment.primary` | done | 100% | Agent1 |
| P1 | [UI-2-0013](tasks/UI-2-0013.md (doc_task_0037)) (doc_task_0037) | lobby / popup / duel 首批 skin 補 shadow slot | done | 100% | Agent1 |
| P1 | [UI-2-0014](tasks/UI-2-0014.md (doc_task_0038)) (doc_task_0038) | general / support / shop / gacha 群組補 shadow slot | done | 100% | Agent1 |
| P1 | [UI-2-0015](tasks/UI-2-0015.md (doc_task_0039)) (doc_task_0039) | battle / system 群組補 shadow slot | done | 100% | Agent1 |
| P1 | [UI-2-0016](tasks/UI-2-0016.md (doc_task_0040)) (doc_task_0040) | 補齊 popup / Layout / legacy shadow 覆蓋 | done | 60% | Agent1 |
| P1 | [UI-2-0017](tasks/UI-2-0017.md (doc_task_0041)) (doc_task_0041) | 修補 general-detail bleed slot 缺失 | done | 100% | Agent1 |
| P1 | [UI-2-0018](tasks/UI-2-0018.md (doc_task_0042)) (doc_task_0042) | 補上 screen-driven preview harness | done | 100% | Agent1 |
| P1 | [UI-2-0019](tasks/UI-2-0019.md (doc_task_0043)) (doc_task_0043) | 對齊 D-2 QA 目標與 target family | done | 100% | Agent1 |
| P1 | [UI-2-0020](tasks/UI-2-0020.md (doc_task_0044)) (doc_task_0044) | 補上 shared light-surface carrier | done | 0% | Agent1 |
| P1 | [UI-2-0022](tasks/UI-2-0022.md (doc_task_0046)) (doc_task_0046) | `general-list` 升級正式九宮格皮膚 | done | 100% | Agent1 |
| P1 | [UI-2-0023](tasks/UI-2-0023.md (doc_task_0047)) (doc_task_0047) | 完成 headless preview screenshot 流程 | done | 100% | Agent1 |
| P1 | [UI-2-0024](tasks/UI-2-0024.md (doc_task_0048)) (doc_task_0048) | 拆分 `UIPreviewBuilder.ts` 降低風險 | completed | 100% | Agent1 |
| P1 | [UI-2-0025](tasks/UI-2-0025.md (doc_task_0049)) (doc_task_0049) | 對齊 `Gacha` preview contract | done | 100% | Agent1 |
| P1 | [UI-1-0005](tasks/UI-1-0005.md (doc_task_0013)) (doc_task_0013) | 產生水平 Tab active/inactive sprites | done | 100% | Agent2 |
| P1 | [UI-1-0006](tasks/UI-1-0006.md (doc_task_0014)) (doc_task_0014) | 產生 bleed overlay sprites | done | 100% | Agent2 |
| P1 | [UI-1-0007](tasks/UI-1-0007.md (doc_task_0015)) (doc_task_0015) | 產生 dark_metal frame/fill/bg sprites | done | 100% | Agent2 |
| P1 | [UI-1-0008](tasks/UI-1-0008.md (doc_task_0016)) (doc_task_0016) | 產生 circle_icon sprites | done | 100% | Agent2 |
| P1 | [UI-1-0010](tasks/UI-1-0010.md (doc_task_0018)) (doc_task_0018) | 產生 badge sprites | done | 100% | Agent2 |
| P1 | [UI-1-0011](tasks/UI-1-0011.md (doc_task_0019)) (doc_task_0019) | 產生 gold_cta frame/fill/bg sprites | done | 100% | Agent2 |
| P1 | [UI-1-0012](tasks/UI-1-0012.md (doc_task_0020)) (doc_task_0020) | 建立 `validate-skin-contracts.js` | done | 100% | Agent2 |
| P1 | [UI-1-0013](tasks/UI-1-0013.md (doc_task_0021)) (doc_task_0021) | 建立 frame sprite 金色邊緣掃描 | done | 100% | Agent2 |
| P1 | [UI-1-0014](tasks/UI-1-0014.md (doc_task_0022)) (doc_task_0022) | `LobbyMain` 正式截圖與 notes 回填 | done | 100% | Agent2 |
| P1 | [UI-1-0015](tasks/UI-1-0015.md (doc_task_0023)) (doc_task_0023) | `ShopMain/Gacha` 正式比較與 notes 回填 | done | 100% | Agent2 |
| P1 | [UI-1-0016](tasks/UI-1-0016.md (doc_task_0024)) (doc_task_0024) | `DuelChallenge` mixed-family QA | done | 100% | Agent2 |
| P2 | [UI-2-0005](tasks/UI-2-0005.md (doc_task_0029)) (doc_task_0029) | button-skin 新增 selected 第四態 | done | 100% | Agent1 |
| P2 | [UI-1-0009](tasks/UI-1-0009.md (doc_task_0017)) (doc_task_0017) | 產生 diamond_tab sprites | done | 100% | Agent2 |

| P1 | [UI-2-0117](tasks/UI/UI-2-0117.md (doc_task_0406)) (doc_task_0406) | 修正蔡文姬、黃月英臉型、髮型與配色辨識 | in-progress | 100% | codex-gpt-6.1 |

| P1 | [UI-2-0118](tasks/UI/UI-2-0118.md (doc_task_0407)) (doc_task_0407) | 簡化女角衣帶並校正手指與道具 | done | 100% | codex-gpt-6.1 |

| P1 | [UI-2-0119](tasks/UI/UI-2-0119.md (doc_task_0408)) (doc_task_0408) | 拉開五位吳將五官辨識度並收束衣帶 | done | 100% | codex-gpt-6.1 |

| P1 | [UI-2-0120](tasks/UI/UI-2-0120.md (doc_task_0411)) (doc_task_0411) | 延長蔡文姬古琴並修正抱持姿勢 | done | 85% | codex-gpt-6.1 |

| P1 | [UI-2-0223](tasks/UI/UI-2-0223.md (doc_task_1412)) (doc_task_1412) | 王基魏藍軍政官立繪與列表頭像 | done | 100% | codex-gpt-6.1-sol |
| P1 | [UI-2-0224](tasks/UI/UI-2-0224.md (doc_task_1413)) (doc_task_1413) | 孫禮魏藍弓騎立繪與列表頭像 | done | 100% | codex-gpt-6.1-sol |
| P1 | [UI-2-0225](tasks/UI/UI-2-0225.md (doc_task_1414)) (doc_task_1414) | 王渾魏藍年長都督立繪與列表頭像 | done | 100% | codex-gpt-6.1-sol |
| P1 | [UI-2-0226](tasks/UI/UI-2-0226.md (doc_task_1415)) (doc_task_1415) | 文欽魏藍暗朱前線將領立繪與列表頭像 | done | 100% | codex-gpt-6.1-sol |
| P1 | [UI-2-0227](tasks/UI/UI-2-0227.md (doc_task_1416)) (doc_task_1416) | 公孫淵深青骨白遼東割據者立繪與列表頭像 | done | 100% | codex-gpt-6.1-sol |
| P1 | [UI-2-0228](tasks/UI/UI-2-0228.md (doc_task_1418)) (doc_task_1418) | 木鹿大王青銅赭金象兵統領立繪與列表頭像 | in-progress | 100% | codex-gpt-6.1-sol |
| P1 | [UI-2-0229](tasks/UI/UI-2-0229.md (doc_task_1419)) (doc_task_1419) | 鄂煥鐵紫前線勇將立繪與列表頭像 | done | 100% | codex-gpt-6.1-sol |
| P1 | [UI-2-0230](tasks/UI/UI-2-0230.md (doc_task_1420)) (doc_task_1420) | 沙摩柯青黛神射立繪與列表頭像 | done | 100% | codex-gpt-6.1-sol |

| P1 | [UI-1-0017](tasks/UI/UI-1-0017.md (doc_task_0409)) (doc_task_0409) | 校正魏國五位武將立繪構圖與個人色票 | in-progress | 70% | codex-gpt-6.1 |

| P1 | [UI-1-0018](tasks/UI/UI-1-0018.md (doc_task_0410)) (doc_task_0410) | 拉開魏國第二批五位武將的臉部與個人配色 | in-progress | 95% | codex-gpt-6.1 |

| P1 | [UI-1-0019](tasks/UI/UI-1-0019.md (doc_task_0412)) (doc_task_0412) | 審核蜀國七位武將立繪辨識與個人色票 | in-progress | 15% | codex-gpt-6.1 |
