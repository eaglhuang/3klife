// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 3.1／3.5；PROG-2-9582
/**
 * FamilyQaFastForward — 家族 QA 快進（純邏輯，不依賴 cc）。
 *
 * 網址參數 `qaFamily=spouse|nursing`（沿用 qaAcademy 慣例：沒帶就完全不介入）：
 *   spouse  — 走共通 API 納入首子系統配偶（family.enrollSpouse），供截圖「配偶出現在出征編制」
 *   nursing — 同上，再走 occupancy.acquire 讓她進入哺乳占用，供截圖「哺乳中不在出征編制、仍可當太守」
 * 兩條都只呼叫共通 API 的命令，規則與存檔路徑與玩家操作相同；不直接改名冊。
 */

export const QA_FAMILY_QUERY = 'qaFamily';
export type QaFamilyScenario = 'spouse' | 'nursing';

/** 解析網址查詢字串；沒帶或不是已知情境回 null（視為沒啟用） */
export function parseQaFamilyParams(search: string | undefined | null): QaFamilyScenario | null {
    if (typeof search !== 'string' || search.length === 0) return null;
    const raw = new URLSearchParams(search).get(QA_FAMILY_QUERY);
    return raw === 'spouse' || raw === 'nursing' ? raw : null;
}

/** 呼叫共通 API 的最小能力（LobbyScene 傳 services().api；測試傳假物件） */
export interface FamilyQaApiPort {
    cmd(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; reason?: string; result?: unknown }>;
}

export interface FamilyQaResult {
    scenario: QaFamilyScenario;
    generalId: string;
    /** false＝這位配偶早已在名冊（重進頁面時的冪等結果） */
    created: boolean;
}

/** 依情境快進；任一步命令失敗就丟錯（訊息帶命令名與原因，供 window.__qaFamily 公布） */
export async function fastForwardFamily(api: FamilyQaApiPort, scenario: QaFamilyScenario): Promise<FamilyQaResult> {
    const enroll = await api.cmd('family.enrollSpouse', { source: 'first-child' });
    if (!enroll.ok) throw new Error(`family.enrollSpouse 失敗：${enroll.reason ?? 'unknown'}`);
    const { generalId, created } = enroll.result as { generalId: string; created: boolean };
    if (scenario === 'nursing') {
        const occ = await api.cmd('occupancy.acquire', { personId: generalId, kind: 'nursing', refId: `qa-nursing:${generalId}` });
        if (!occ.ok) throw new Error(`occupancy.acquire 失敗：${occ.reason ?? 'unknown'}`);
    }
    return { scenario, generalId, created };
}
