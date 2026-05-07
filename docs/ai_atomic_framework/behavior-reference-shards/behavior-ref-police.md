# 原子行為參考手冊 — 行為×警察使用關係表

> 這是 `原子行為參考手冊.md` 的「行為×警察使用關係表」分片。完整索引見 `docs/ai_atomic_framework/原子行為參考手冊.md`。

## 5. 行為 × 警察 使用關係表

| 警察類型 | 使用的行為 | 偵測機制 | 對應任務卡 |
|---|---|---|---|
| **Dedup Police** | dedup-merge / infect / sweep | sf 比對 + LLM similarity skill + fingerprint-index O(1) lookup | ATM-2-0030 |
| **Quality Police** | evolve | automated gates（nonRegression / qualityImprovement / newCapability） | ATM-2-0005 |
| **Lifecycle Police** | sweep / expire | TTL scan / unused-caller scan / 非法 status transition 偵測 | ATM-2-0031 |
| **Boundary Police** | split / extract / atomize | layer 邊界檢查（atom 不得跨 adapter boundary） | ATM-2-0010 |
| **Map Integration Police** | split / merge / atomize / infect | map-level propagation test（任一成員行為觸發全 map 整合測試） | ATM-2-0025 |
| **Demand Police** ⭐ NEW | split | sub-function caller 分佈分析（子功能被 ≥2 外部 caller 引用） | ATM-2-0030 |
| **Atomization Police** | atomize | neutrality scan 整合（確保新原子不引入 host coupling） | ATM-2-0033 |

---
