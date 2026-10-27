// @spec-source → 轉蛋系統.md §I 區 Player_Gacha_State、§H Server 端 Total_Pulls／Pity_Counter／Bonding_Points／Last_SSR_Pull；WBS GCH-14（PROG-2-1256）
/**
 * GachaSyncRecord — 各池抽卡記錄的伺服端形狀與同步校驗（純邏輯，不依賴 cc，不連線）
 *
 * 欄位對應 Server 端轉蛋表：totalPulls（Total_Pulls）、pityCounter（Pity_Counter）、
 * bondingPoints（Bonding_Points）、lastSsrPull（Last_SSR_Pull）。
 *
 * 校驗規則：
 *   - 欄位都必須是非負整數，缺欄位或不合法的值從 0 開始（與 GachaDraw 的 normalize 一致）。
 *   - lastSsrPull 不可大於 totalPulls。
 *   - 客戶端離線抽卡同步時，totalPulls 不可低於伺服端（抽數只會增加，倒退代表資料被改寫）。
 *
 * 暫定：
 *   - Pity_Counter 與 Total_Pulls 的關係規格範例本身不一致（範例 Pity 147 > Pull 47），所以不設「保底 ≤ 總抽數」的規則。
 *   - Bonding_Points 可被消耗，不要求單調遞增。
 *
 * Unity 對照：像一份有 Schema 的 ScriptableObject 存檔，載入時 Validate()，同步時只接受「只增不減」的計數。
 */

export interface GachaSyncRecord {
    totalPulls: number;
    pityCounter: number;
    bondingPoints: number;
    lastSsrPull: number;
}

const FIELDS = ['totalPulls', 'pityCounter', 'bondingPoints', 'lastSsrPull'] as const;

function isCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** 讀取一池的記錄：缺欄位或不合法的欄位視為 0 */
export function normalizeGachaSyncRecord(value: unknown): GachaSyncRecord {
    const source = (value ?? {}) as Partial<Record<(typeof FIELDS)[number], unknown>>;
    return {
        totalPulls: isCount(source.totalPulls) ? source.totalPulls : 0,
        pityCounter: isCount(source.pityCounter) ? source.pityCounter : 0,
        bondingPoints: isCount(source.bondingPoints) ? source.bondingPoints : 0,
        lastSsrPull: isCount(source.lastSsrPull) ? source.lastSsrPull : 0,
    };
}

/** 回傳錯誤訊息列表；空陣列代表通過 */
export function validateGachaSyncRecord(record: GachaSyncRecord): string[] {
    const errors: string[] = [];
    for (const field of FIELDS) {
        if (!isCount(record[field])) errors.push(`${field} 需為非負整數`);
    }
    if (record.lastSsrPull > record.totalPulls) errors.push('lastSsrPull 不可大於 totalPulls');
    return errors;
}

export type GachaSyncResult =
    | { ok: true; record: GachaSyncRecord }
    | { ok: false; reason: 'invalid-client' | 'pulls-regressed'; record: GachaSyncRecord };

/**
 * 客戶端離線抽卡同步：客戶端通過校驗且總抽數不低於伺服端，才採用客戶端記錄；
 * 否則保留伺服端記錄，並回傳原因。不修改輸入。
 */
export function reconcileGachaRecord(server: GachaSyncRecord, client: GachaSyncRecord): GachaSyncResult {
    if (validateGachaSyncRecord(client).length > 0) {
        return { ok: false, reason: 'invalid-client', record: { ...server } };
    }
    if (client.totalPulls < server.totalPulls) {
        return { ok: false, reason: 'pulls-regressed', record: { ...server } };
    }
    return { ok: true, record: { ...client } };
}
