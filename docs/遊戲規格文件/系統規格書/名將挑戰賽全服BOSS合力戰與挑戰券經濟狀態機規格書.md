<!-- doc_id: doc_spec_0528 -->
# 名將挑戰賽全服BOSS合力戰與挑戰券經濟狀態機規格書

> **模組識別碼**：`TRN-13`  
> **系統歸屬**：名將挑戰賽（Tournament）BOSS 挑戰券與全服合力  
> **單一真相來源**：本規格書確立名將挑戰賽季節 BOSS 戰專用挑戰券之每日免費派送、持有上限約束、商城加購與入場原子扣券狀態機之唯一權威標準。

---

## 一、系統概述與架構原則

季節 BOSS 戰為名將挑戰賽中的季末重大共鳴事件。全服玩家合力攻伐當季 BOSS，依個人累積傷害比例發放賽季限定外觀與稀有虎符。參與 BOSS 討伐需消耗專用門票「**BOSS 挑戰券（Boss Ticket）**」，以此建立健康的每日參與節奏與商城經濟循環。

### Unity / 架構對照
- **門票管理中樞**：類似 Unity 中的 `BossTicketWalletService`，純邏輯運算與狀態轉換，不依賴 UI 畫面。
- **原子性操作**：出戰扣券與持有量檢驗採原子更新，杜絕無票入場漏洞。

---

## 二、挑戰券持有模型與核心常數

```typescript
export const BOSS_TICKET_MAX_HOLD = 3; // 每日免費贈送之持有上限（3 張）

export interface BossTicketState {
    bossTickets: number;       // 當前持有效挑戰券數量（非負整數）
    bossTicketDay: number;     // 最後一次領取免費挑戰券的絕對日序
}
```

- **上限規則說明**：
  - `BOSS_TICKET_MAX_HOLD` 僅限制「每日免費贈送」之累積上限，防止玩家長期囤積免費票。
  - 經由商城加購或活動營運獎勵獲得之挑戰券**不受此上限限制**，可無上限堆疊。

---

## 三、每日免費派券與加購狀態機

### 1. 每日登入自動派送演算法
```typescript
export const TOURNAMENT_DAY_MS = 24 * 60 * 60 * 1000;

export function grantDailyBossTicket(state: BossTicketState, nowMs: number): BossTicketState {
    const day = Math.floor(nowMs / TOURNAMENT_DAY_MS);
    
    // 若當前日序與上次領取日序相同，代表今日已領過，不重複發送
    if (state.bossTicketDay === day) {
        return state;
    }
    
    const held = state.bossTickets ?? 0;
    // 若未達上限則 +1，若已滿則維持原量，但推進領取日序
    const nextTickets = held < BOSS_TICKET_MAX_HOLD ? held + 1 : held;
    
    return {
        ...state,
        bossTickets: nextTickets,
        bossTicketDay: day,
    };
}
```

### 2. 商城與活動發放（突破上限）
```typescript
export function addBossTickets(state: BossTicketState, count: number): BossTicketState {
    if (!Number.isInteger(count) || count <= 0) {
        return state;
    }
    return {
        ...state,
        bossTickets: (state.bossTickets ?? 0) + count,
    };
}
```

---

## 四、發起挑戰原子扣券演算法

```typescript
export function spendBossTicket(state: BossTicketState): { ok: boolean; state: BossTicketState } {
    const held = state.bossTickets ?? 0;
    
    // 門票不足時直接阻絕，狀態不變
    if (held <= 0) {
        return { ok: false, state };
    }
    
    // 成功扣減 1 張
    return {
        ok: true,
        state: {
            ...state,
            bossTickets: held - 1,
        },
    };
}
```

---

## 五、驗收條件與測試案例 (Test Cases)

- **TC-TRN-49（每日首次派送 1 張）**：
  - 初始持券 0 張，首次進入派送 1 張，`bossTicketDay` 記錄為今日序號。
- **TC-TRN-50（持券達到 3 張上限停止累積）**：
  - 當前持券 3 張，跨日後派送，持券數仍為 3 張，不溢出至 4 張。
- **TC-TRN-51（商城購買突破 3 張上限）**：
  - 當前持券 3 張，調用 `addBossTickets(state, 5)`，持有券數精確更新為 8 張。
- **TC-TRN-52（扣券入場與零票阻絕）**：
  - 持有 1 張券時呼叫 `spendBossTicket` 回傳 `ok: true`，餘額變 0；再次呼叫回傳 `ok: false`，餘額維持 0。
