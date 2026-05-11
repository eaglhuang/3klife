# 多語言 Adapter 擴張計畫

> **doc_id**: doc_atm_eco_0003  
> **版本**: 1.0.0  
> **建立日期**: 2026-05-11  
> **任務來源**: ATM-6-0003（依賴 ATM-2-0006、ATM-1-0006）  
> **狀態**: Accepted（v1 Roadmap）  

---

## 摘要（TL;DR）

ATM 核心以 TypeScript/JavaScript（Node.js 環境）實作。為了讓 ATM 的設計理念（確定性、可審計、可回滾的原子化操作）在其他語言生態系也能使用，需要開發對應的 **Language Adapter**。

**優先順序**：

| 優先級 | 語言/環境 | 觸發條件 |
|-------|---------|---------|
| 🔥 P1 | **Python** | AI/ML workflow 需求（LangChain、LangGraph 整合）|
| 🔶 P2 | **C# / Unity** | 遊戲 AI Agent、Unity ML-Agents 整合 |
| 🔷 P2 | **TypeScript / Cocos Creator** | 3KLife 專案原生支援強化 |
| 📌 P3 | **Rust** | CLI 工具效能優化 |
| 📌 P3 | **Go** | 後端微服務整合 |

---

## 1. 背景

### 1.1 ATM 的跨語言需求

ATM 框架的 atom（原子操作單元）本質上是**語言無關的**——它只是一個包含標準化 schema 的 JSON 描述符。然而，目前的工具鏈（CLI、registry、compute gate）全部用 JavaScript/TypeScript 實作。

當 Python AI agent 或 C# Unity 場景需要使用 ATM atoms 時，必須透過跨語言 adapter 橋接。

### 1.2 什麼是 Language Adapter？

Language Adapter 提供：

1. **讀取 atom registry**：從 `atomic-registry.json` 載入 atom 定義
2. **執行 atom lifecycle 操作**：建立、更新、回滾、過期
3. **呼叫 compute gate**（可選）：在 adapter 內驗證操作的確定性
4. **本地語言慣用介面**：Python 用 `with` 語句、C# 用 LINQ、Unity 用 MonoBehaviour

---

## 2. 優先語言：Python Adapter

### 2.1 動機

- ATM 的 AI-native 應用（LangGraph、LangChain）主要在 Python 生態
- `sanguo-rag` pipeline 已有 Python 實作，需要 ATM atom 追蹤
- Python adapter 可作為其他動態語言 adapter 的模板

### 2.2 Python Adapter 規格

**套件名稱**：`ai-atomic-python`  
**最低版本**：Python 3.9+  
**依賴**：無強制依賴（pydantic 為選配）

```python
# 基本使用
from ai_atomic import AtomRegistry, AtomLifecycle

registry = AtomRegistry.load("atomic-registry.json")

# 讀取 atom
atom = registry.get("feature-rag-pipeline")

# 執行操作（context manager 確保 rollback）
with AtomLifecycle(atom) as lifecycle:
    lifecycle.activate()
    result = run_rag_pipeline(...)
    lifecycle.complete(metadata={"result": result})
```

**介面設計**：

```python
class AtomRegistry:
    @classmethod
    def load(cls, path: str) -> "AtomRegistry": ...
    def get(self, atom_id: str) -> "AtomRecord": ...
    def list(self, filter: dict = None) -> list["AtomRecord"]: ...
    def push(self, atom: "AtomRecord") -> None: ...

class AtomLifecycle:
    def __init__(self, atom: "AtomRecord"): ...
    def __enter__(self) -> "AtomLifecycle": ...
    def __exit__(self, exc_type, exc_val, exc_tb) -> bool: ...
    def activate(self) -> None: ...
    def complete(self, metadata: dict = None) -> None: ...
    def rollback(self, reason: str = "") -> None: ...
```

### 2.3 LangGraph 整合範例

```python
from langgraph.graph import StateGraph
from ai_atomic import AtomRegistry

registry = AtomRegistry.load("atomic-registry.json")
atom = registry.get("battle-ai-decision")

def agent_node(state):
    with AtomLifecycle(atom) as lc:
        decision = run_battle_ai(state)
        lc.complete(metadata={"decision": decision})
    return {"decision": decision}

graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
```

---

## 3. C# / Unity Adapter

### 3.1 動機

- 3KLife 遊戲的 AI NPC 決策可以用 ATM atom 追蹤
- Unity ML-Agents 訓練流程可以記錄 atom lifecycle
- Cocos Creator 使用 C# 的開發者也可受益

### 3.2 C# Adapter 規格

**套件名稱**：`AiAtomic.CSharp`（NuGet）  
**最低版本**：.NET 6.0 / Unity 2022.3+

```csharp
// 基本使用
using AiAtomic;

var registry = AtomRegistry.Load("atomic-registry.json");
var atom = registry.Get("npc-decision-tree");

using var lifecycle = new AtomLifecycle(atom);
try
{
    lifecycle.Activate();
    var decision = RunNpcAI(state);
    lifecycle.Complete(new { decision });
}
catch (Exception e)
{
    lifecycle.Rollback(e.Message);
    throw;
}
```

**Unity MonoBehaviour 包裝**：

```csharp
public class AtomAgent : MonoBehaviour
{
    private AtomRegistry _registry;
    
    void Start()
    {
        _registry = AtomRegistry.Load(Application.streamingAssetsPath + "/atomic-registry.json");
    }
    
    public void ExecuteAtom(string atomId, Action<AtomLifecycle> body)
    {
        var atom = _registry.Get(atomId);
        using var lifecycle = new AtomLifecycle(atom);
        body(lifecycle);
    }
}
```

---

## 4. TypeScript / Cocos Creator Adapter 強化

### 4.1 動機

雖然 ATM 核心已是 TypeScript，但 Cocos Creator 環境有特殊限制：

- 無 Node.js 標準 `fs` 模組（瀏覽器環境）
- 資源必須透過 Cocos AssetBundle 載入
- 腳本必須繼承 `cc.Component` 等 Cocos 類型

### 4.2 Cocos Creator Adapter 規格

**套件路徑**：`packages/adapter-cocos/`  
**目標版本**：Cocos Creator 3.8+

```typescript
import { _decorator, Component } from 'cc';
import { CocosAtomRegistry } from '@ai-atomic/adapter-cocos';

const { ccclass, property } = _decorator;

@ccclass('AtomBridge')
export class AtomBridge extends Component {
    private registry: CocosAtomRegistry;
    
    async start() {
        this.registry = await CocosAtomRegistry.loadFromBundle('main', 'atomic-registry');
    }
    
    async executeAtom(atomId: string) {
        const lifecycle = this.registry.createLifecycle(atomId);
        try {
            await lifecycle.activate();
            // ... 執行操作
            await lifecycle.complete();
        } catch (e) {
            await lifecycle.rollback(String(e));
        }
    }
}
```

---

## 5. Adapter 驗收矩陣

每個 Language Adapter 必須通過以下驗收測試才能發布：

| 驗收項目 | Python | C# / Unity | Cocos TS | Rust | Go |
|---------|--------|------------|---------|------|---|
| **基本 CRUD**（讀/寫 registry） | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| **Lifecycle（activate/complete/rollback）** | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| **Rollback 確定性**（rollback 後狀態還原）| ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| **Cross-lang 互通**（TS 寫入、Python 讀取）| ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| **Plugin 整合**（plugin-registry-remote）| 🔶 選配 | 🔶 選配 | 🔶 選配 | ❌ 不適用 | 🔶 選配 |
| **錯誤處理**（無效 atom ID、schema 不符）| ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| **並發安全**（multi-thread / async）| 🔶 選配 | ✅ 必須 | ❌ 不適用 | ✅ 必須 | ✅ 必須 |
| **文件完整度**（README + API docs）| ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 |
| **CI 自動測試** | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 |

### 5.1 驗收流程

1. **RFC 開立**：每個新語言 adapter 需開 RFC（見 `docs/RFC_PROCESS.md`）
2. **Prototype 實作**：在 `packages/adapter-<lang>/` 實作最小可驗收版本
3. **跑驗收矩陣測試**：執行 `adapter-acceptance-test` 腳本（見下方）
4. **Cross-lang 互通測試**：TS reference 實作對比，確保 schema 相容
5. **Maintainer 審查**：至少 2 名 Maintainer approve
6. **Release**：隨下個 minor release 一起發布

### 5.2 驗收測試指令

```bash
# 跑特定語言的 adapter 驗收測試
node tools_node/run-adapter-acceptance-test.js --lang python --adapter-path packages/adapter-python

# 跑 cross-lang 互通測試
node tools_node/run-adapter-acceptance-test.js --cross-lang --ref ts --target python

# 輸出 adapter 驗收矩陣報告
node tools_node/run-adapter-acceptance-test.js --matrix --output docs/ecosystem/adapter-acceptance-report.md
```

---

## 6. 實作時間線建議

| 階段 | 目標 | 預計觸發時機 |
|-----|-----|------------|
| **Phase 7.1** | Python adapter（最小可驗收版本）| sanguo-rag 整合需求出現時 |
| **Phase 7.2** | Cocos Creator adapter 強化 | 3KLife NPC AI 系統開發時 |
| **Phase 7.3** | C# / Unity adapter | Unity ML-Agents 整合需求時 |
| **Phase 8.x** | Rust adapter（CLI 效能版）| CLI 效能成為瓶頸時 |
| **Phase 8.x** | Go adapter | 後端微服務整合需求時 |

---

## 7. 相關文件

- RFC 流程：[docs/RFC_PROCESS.md](../RFC_PROCESS.md)（ATM-6-0002 建立）
- Plugin 邊界決策：[docs/ecosystem/registry-db-vector-decision.md](./registry-db-vector-decision.md)（ATM-6-0001 建立）
- JS/TS Language Package：`packages/language-js/`（ATM-2-0006 實作）
- Core ATM Spec：`packages/core/`（ATM-1-0006 實作）

---

*本文件由 ATM-6-0003 任務建立，vs-insiders-gpt-5.3-codex 執行 | 2026-05-11*
