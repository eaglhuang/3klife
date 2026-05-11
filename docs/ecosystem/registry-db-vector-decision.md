# 跨專案 Registry / DB / Vector — Core vs Plugin 決策文件

> **doc_id**: doc_atm_eco_0002  
> **版本**: 1.0.0  
> **建立日期**: 2026-05-11  
> **任務來源**: ATM-6-0001（依賴 ATM-5-0004）  
> **狀態**: Accepted（v1 決策）  

---

## 摘要（TL;DR）

| 功能模組 | 建議歸屬 | 理由 |
|---------|---------|-----|
| **Atom Registry（本機快取）** | **Core** | 所有 ATM 使用者都需要，屬於必要基礎設施 |
| **跨專案 Registry（Remote/Shared）** | **Plugin** | 非必要，引入網路/認證複雜度 |
| **DB 存取（PostgreSQL / SQLite）** | **Plugin** | 增加執行環境依賴，不適合做為 core |
| **pgvector（向量搜尋）** | **Plugin** | 高度特化功能，僅語意搜尋場景需要 |

---

## 背景

ATM（AI Atomic Framework）的核心設計理念是「確定性、可審計、可回滾」。隨著專案規模擴大，出現了三個架構邊界問題：

1. **Atom Registry**：目前每個專案各自維護 `atomic-registry.json`，當需要跨專案共享 atom 時，要如何同步？
2. **DB 持久化**：atom 的狀態、版本歷史、是否需要一個 DB 後端？
3. **pgvector**：語意搜尋 atom（「找一個類似 X 功能的 atom」）需要向量資料庫，這應該在哪一層？

---

## 1. Atom Registry

### 1.1 本機 Registry（Core）

**結論：維持在 Core，不變。**

`atomic-registry.json` 是 ATM 運作的最小必要元件，提供：

- Atom 的標準化 schema 儲存
- 版本追蹤
- 本機快取，不依賴網路

```
core/
  src/
    registry/
      LocalRegistry.ts      ← Core，必要
      RegistrySchema.ts     ← Core，必要
```

### 1.2 跨專案 Remote Registry（Plugin）

**結論：實作為獨立 plugin，不進 core。**

理由：
- 引入網路請求，打破 core 的純確定性原則
- 需要認證、版本衝突解決策略等複雜性
- 不同團隊對「共享 registry」的需求差異很大

**建議 plugin 規格**：

```typescript
// plugin-registry-remote/
interface RemoteRegistryAdapter {
  pull(atomId: string): Promise<AtomRecord>;
  push(atom: AtomRecord): Promise<void>;
  list(filter?: RegistryFilter): Promise<AtomRecord[]>;
  sync(localRegistry: LocalRegistry): Promise<SyncResult>;
}
```

**plugin 邊界**（Plugin Boundary Proposal）：

```
packages/
  core/                             ← LocalRegistry（必要）
  plugin-registry-remote/           ← RemoteRegistry（選配）
    src/
      RemoteRegistryAdapter.ts
      GitRemoteAdapter.ts           ← git-based sync
      HttpRemoteAdapter.ts          ← REST API sync
```

---

## 2. DB 存取

### 2.1 評估

DB 後端（PostgreSQL / SQLite）可以提供：

- Atom 歷史版本的持久化
- 複雜查詢（依 tag、phase、status 查詢）
- 多 agent 並發存取的 ACID 保障

然而：

| 考量 | 評估 |
|-----|-----|
| 執行環境依賴 | 需要 DB 服務，打破「零基礎設施」原則 |
| CI/CD 環境 | 並非所有 CI 環境都有 DB |
| 目前替代方案 | JSON 檔案 + git 已可滿足大多數場景 |
| 引入時機 | 當 atom 數量 > 1000 或多 agent 並發時才真正必要 |

### 2.2 決策：DB 為 Plugin

**結論：DB 存取實作為 `plugin-store-db`，不進 core。**

```
packages/
  core/                             ← FileStore（JSON + git，必要）
  plugin-store-db/                  ← DB Store（選配）
    src/
      DbStoreAdapter.ts
      PostgresAdapter.ts
      SqliteAdapter.ts
    migrations/
      001_create_atoms_table.sql
```

**Plugin Boundary**：

- `core` 定義 `StoreAdapter` interface
- `plugin-store-db` 實作 `DbStoreAdapter implements StoreAdapter`
- 用戶透過 ATM config 切換 store：

```typescript
// atm.config.ts
import { createATM } from '@ai-atomic/core';
import { DbStoreAdapter } from '@ai-atomic/plugin-store-db';

const atm = createATM({
  store: new DbStoreAdapter({ url: process.env.DATABASE_URL }),
});
```

---

## 3. pgvector（語意向量搜尋）

### 3.1 評估

pgvector 讓 ATM 可以：

- 用自然語言找 atom（「找一個負責 UI 渲染的 atom」）
- 相似 atom 推薦（避免重複建立功能相同的 atom）
- RAG pipeline 整合

然而：

| 考量 | 評估 |
|-----|-----|
| 依賴鏈 | pgvector → PostgreSQL → 向量模型（embedding）|
| 使用場景 | 高度特化，僅 AI-native workflow 需要 |
| 效能開銷 | embedding 計算非同步且計算密集 |
| 必要性 | 多數 CI-only / scripted 場景完全不需要 |

### 3.2 決策：pgvector 為獨立 Plugin

**結論：實作為 `plugin-search-vector`，與 DB plugin 分離。**

分離的原因：向量搜尋可能搭配非 pgvector 的後端（如 Chroma、Weaviate、純 in-memory）。

```
packages/
  plugin-search-vector/             ← 向量搜尋（高度選配）
    src/
      VectorSearchAdapter.ts
      PgVectorAdapter.ts
      ChromaAdapter.ts
      InMemoryVectorAdapter.ts      ← 測試用
    embeddings/
      EmbeddingProvider.ts
      OpenAIEmbeddingAdapter.ts
      LocalEmbeddingAdapter.ts
```

**Plugin Boundary**：

```typescript
// core 定義
interface SearchAdapter {
  indexAtom(atom: AtomRecord): Promise<void>;
  search(query: string, topK?: number): Promise<AtomRecord[]>;
}

// plugin-search-vector 實作
class PgVectorAdapter implements SearchAdapter { ... }
class ChromaAdapter implements SearchAdapter { ... }
```

---

## 4. Plugin Boundary 總結

### 4.1 Core Package 邊界（必要，零依賴）

```
@ai-atomic/core 提供：
  - LocalRegistry（JSON-based）
  - FileStore（JSON + git）
  - Atom lifecycle state machine
  - Compute gate runner
  - Plugin SDK（介面定義）
```

### 4.2 Plugin 生態系

```
@ai-atomic/plugin-registry-remote   ← 跨專案 registry 同步
@ai-atomic/plugin-store-db          ← DB 持久化（PostgreSQL / SQLite）
@ai-atomic/plugin-search-vector     ← 向量語意搜尋（pgvector / Chroma）
@ai-atomic/plugin-behavior-*        ← 已有 behaviors（atomize, compose 等）
```

### 4.3 決策原則

1. **Core 只包含零依賴、確定性、無網路的功能**
2. **任何需要外部服務（DB、API、向量模型）的功能必須做成 Plugin**
3. **Plugin 透過 `core` 定義的介面整合，不得反向依賴彼此**
4. **Plugin 的啟用/停用不影響 core 的基本功能**

---

## 5. 實作優先序

| 優先級 | Plugin | 觸發條件 |
|-------|-------|---------|
| P2 | `plugin-registry-remote` | 有跨專案共享 atom 需求時 |
| P2 | `plugin-store-db` | atom 數量 > 1000 或多 agent 並發 |
| P3 | `plugin-search-vector` | 接入 AI-native 工作流時 |

---

## 6. 相關 RFC

若要正式啟動上述任何 plugin 的開發，需要按照 [RFC_PROCESS.md](../RFC_PROCESS.md) 開立 RFC，至少：

- `plugin-store-db`：破壞性變更（新增外部依賴），需完整 RFC + security review
- `plugin-search-vector`：新 API 設計，需 RFC

---

*本文件由 ATM-6-0001 任務建立，vs-insiders-gpt-5.3-codex 執行 | 2026-05-11*
