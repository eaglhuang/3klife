<!-- doc_id: doc_index_keep_registry -->
# keep.registry — 跨專案記憶入口登錄表

> 跨 repo 工作前先查本表，找到目標 repo 的 keep 入口與記憶目錄再動工。
> 本表**只做導流**：不集中複製各 repo 記憶成大倉（避免第二真相來源）。
> 契約出處：`docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md`（TASK-MEM-0005）。

| repo | 本機路徑 | keep 入口 | 記憶目錄 | 語言 | lane 前綴 |
|---|---|---|---|---|---|
| 3KLife | `C:/Users/User/3KLife` | `docs/keep.summary.md` | `docs/keep-memory/` | 繁中 | MEM / AAO / TEAM / CID（planning 中樞） |
| AI-Atomic-Framework | `C:/Users/User/AI-Atomic-Framework` | `README.md` + `docs/governance/` | （待建，須英文、repository-neutral，見下） | 英文 | RFT / SKL / GIT（框架自治） |
| 3klife-npc-brain | `C:/Users/User/3klife-npc-brain` | `docs/keep.md`（如有） | （待建） | 繁中 | NPC |

## AAF 端注意事項

- 受 `INV-ATM-006`（框架 repo 不收 adopter 計畫）與 `INV-ATM-007`（公開文件英文、
  repository-neutral）約束：AAF 的記憶目錄只能收**框架操作教訓**，不得收 3KLife
  等 adopter 專案內容；語言一律英文。
- 在 AAF 記憶目錄建立前，AAF 操作教訓暫寫 3KLife `docs/keep-memory/`
  並以 frontmatter `repo: AI-Atomic-Framework` 標注歸屬（現行做法）。

## 登錄規則

- 新 repo 參與 ATM 治理時補一列；路徑必須實測存在。
- 其餘 adopter repo（`3klife-npc-brain-*` 系列等）隨 `internal-release sync`
  名單逐步補列。
- 記憶目錄的契約（frontmatter、型別、觸發清單）以 3KLife
  `docs/keep-memory/README.md (doc_index_keep_memory)` 為母版；各 repo 沿用
  同一契約，只改語言。
