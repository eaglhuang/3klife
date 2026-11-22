// @spec-source → PROG-2-9424 結算視窗分區排版
/**
 * ResultDetailSections — 把結算明細（一行一筆的字串）分成戰況／兵力／獎勵／戰後紀事四區，
 * 並把每行拆成「欄名＋內容」，讓結算視窗能分區、放大字級排版，而不是整段塞進一個標籤縮字。
 *
 * 明細由好幾個系統各自產生（兵源結算、戰績、獎勵、覺醒、擒獲……），這裡只看行首分類，
 * 不改產生端；沒對到規則的行一律放「戰後紀事」，新系統加行也不會消失。
 *
 * Unity 對照：把 Debug 文字訊息依前綴分組丟進不同的 UI List section。
 */

export type ResultSectionId = 'battle' | 'troops' | 'rewards' | 'other';

/** 區段顯示順序 */
export const RESULT_SECTION_ORDER: readonly ResultSectionId[] = ['battle', 'troops', 'rewards', 'other'];

/** 區段標題的多語系鍵與找不到翻譯時的預設中文 */
export const RESULT_SECTION_TITLE: Readonly<Record<ResultSectionId, { key: string; fallback: string }>> = {
    battle: { key: 'ui.result.section.battle', fallback: '戰況' },
    troops: { key: 'ui.result.section.troops', fallback: '兵力' },
    rewards: { key: 'ui.result.section.rewards', fallback: '獎勵' },
    other: { key: 'ui.result.section.other', fallback: '戰後紀事' },
};

export interface ResultDetailRow {
    /** 欄名（例如「出征軍勢」「虎豹騎」）；整行是敘述句時為空字串 */
    key: string;
    /** 內容；「｜」已換成間隔號 */
    value: string;
}

export interface ResultDetailSection {
    id: ResultSectionId;
    rows: ResultDetailRow[];
}

const BATTLE_PREFIX = /^(軍師診斷|時限到|本場戰績|敵軍久攻|雙方|戰況)/;
const TROOP_PREFIX = /^(出征軍勢|城市兵源|兵源|補兵|傷兵)/;
const REWARD_PREFIX = /^(戰後獎賞|戰利品|獎勵|獲得|掉落|首勝|額外獎勵)/;
/** 欄名最長幾個字：超過就當成敘述句，不拆欄 */
const MAX_KEY_CHARS = 8;
const VALUE_SEPARATOR = '　·　';

/** 判斷一行明細屬於哪一區 */
export function classifyResultLine(line: string): ResultSectionId {
    const text = line.trim();
    if (BATTLE_PREFIX.test(text)) return 'battle';
    if (TROOP_PREFIX.test(text) || /^[^：]{1,8}：投入/.test(text)) return 'troops';
    if (REWARD_PREFIX.test(text)) return 'rewards';
    return 'other';
}

/** 拆欄名：「虎豹騎：投入 1200｜返還 1200」→ key 虎豹騎；「出征軍勢 3000｜返還 2300」→ key 出征軍勢 */
export function splitResultRow(line: string): ResultDetailRow {
    const text = line.trim();
    const colon = text.indexOf('：');
    let key = '';
    let value = text;
    if (colon > 0 && colon <= MAX_KEY_CHARS) {
        key = text.slice(0, colon);
        value = text.slice(colon + 1);
    } else if (/^\S{1,6} [+\-−]?\d/.test(text) && !text.includes('｜')) {
        // 「民心 -3」這種短數值行：空白前當欄名，數值靠右欄對齊
        const space = text.indexOf(' ');
        key = text.slice(0, space);
        value = text.slice(space + 1);
    } else if (text.includes('｜')) {
        // 「出征軍勢 3000｜返還 2300」：第一段的空白前面當欄名
        const first = text.split('｜')[0];
        const space = first.indexOf(' ');
        if (space > 0 && space <= MAX_KEY_CHARS) {
            key = first.slice(0, space);
            value = text.slice(space + 1);
        }
    }
    return { key, value: value.split('｜').map((part) => part.trim()).filter((part) => part.length > 0).join(VALUE_SEPARATOR) };
}

/** 整份明細分區；空區段不輸出，順序固定為戰況→兵力→獎勵→戰後紀事 */
export function buildResultSections(lines: readonly string[]): ResultDetailSection[] {
    const buckets = new Map<ResultSectionId, ResultDetailRow[]>();
    for (const raw of lines) {
        for (const line of raw.split('\n')) {
            if (line.trim().length === 0) continue;
            const id = classifyResultLine(line);
            const rows = buckets.get(id) ?? [];
            rows.push(splitResultRow(line));
            buckets.set(id, rows);
        }
    }
    return RESULT_SECTION_ORDER.filter((id) => (buckets.get(id)?.length ?? 0) > 0).map((id) => ({ id, rows: buckets.get(id)! }));
}
