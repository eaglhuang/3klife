// @spec-source → 正式版劇本文案 §2.1（開場信件）；大廳系統 開場信件先做簡易面板（新局首次進大廳開啟）（PROG-2-1302，COPY-02 面板）
/**
 * OpeningLetter — 開場信件的已讀狀態與段落切分（純邏輯，不依賴 cc）
 *
 * - 新局首次進大廳時開啟一次；關閉後記為已讀，之後不再自動開。
 * - 已讀狀態可存進存檔；讀回來的資料不合法時視為未讀，不拋例外。
 * - 信件本文以 \n\n 分段，段落文字取自 copy.letter.opening.body。
 *
 * Unity 對照：像 PlayerPrefs 裡的一個 bool 旗標，第一次開啟時設為 true，之後檢查旗標決定要不要彈窗。
 */

export interface OpeningLetterState {
    /** true 表示玩家已經關閉過這封信 */
    seen: boolean;
}

export const FRESH_OPENING_LETTER: Readonly<OpeningLetterState> = Object.freeze({ seen: false });

/** 首次進大廳時是否要自動開啟信件。 */
export function shouldShowOpeningLetter(state: OpeningLetterState): boolean {
    return !state.seen;
}

/** 關閉信件後的新狀態；不修改輸入。 */
export function markOpeningLetterSeen(state: OpeningLetterState): OpeningLetterState {
    return { ...state, seen: true };
}

/** 讀存檔時使用：非物件或 seen 不是布林值時回傳未讀狀態。 */
export function normalizeOpeningLetterState(raw: unknown): OpeningLetterState {
    if (typeof raw !== 'object' || raw === null) return { ...FRESH_OPENING_LETTER };
    const seen = (raw as { seen?: unknown }).seen;
    if (typeof seen !== 'boolean') return { ...FRESH_OPENING_LETTER };
    return { seen };
}

/** 信件本文切成段落；去掉前後空白，略過空段。 */
export function splitLetterParagraphs(body: string): string[] {
    return body
        .split('\n\n')
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0);
}
