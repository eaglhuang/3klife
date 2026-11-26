// @spec-source → PROG-2-10106 年末典禮觀禮武將（Antigravity ceremony-crowd 資料驅動化；純邏輯不依賴 cc）
/**
 * YearEndCeremonyCrowd — 年末典禮「觀禮武將」名單與熱鬧台詞挑選（純邏輯）
 *
 * 名單：優先取玩家名冊裡的武將（好感高者優先），不足再依資料檔補名將；
 * 台詞：與說話人無關的通用熱鬧句，說話人的名字由畫面的名字標籤顯示；
 *       台詞鍵可帶性別變體（key.f＝女武將版），沒有變體就用通用版，通用版不得用男性專用自稱。
 */
export interface CeremonyCrowdGeneral {
    readonly generalId: string;
    readonly name: string;
    /** 資料檔性別：男／女（也接受 m／f）；缺值視為未知 */
    readonly gender?: string;
}

export interface CeremonyCrowdConfig {
    readonly maxCrowd: number;
    readonly lineIntervalSeconds: number;
    readonly crowdGenerals: readonly CeremonyCrowdGeneral[];
    readonly cheerKeys: readonly string[];
}

export interface CrowdRosterEntry {
    readonly id: string;
    readonly name: string;
    readonly gender?: string;
}

export type CrowdGender = 'm' | 'f' | 'u';

export interface CrowdMember {
    readonly generalId: string;
    readonly name: string;
    readonly gender: CrowdGender;
}

export function normalizeCrowdGender(raw: string | null | undefined): CrowdGender {
    if (raw === '女' || raw === 'f' || raw === 'female') return 'f';
    if (raw === '男' || raw === 'm' || raw === 'male') return 'm';
    return 'u';
}

/** 動態子嗣（child_*）沒有正式頭像，不當觀禮武將 */
function isCrowdEligible(id: string): boolean {
    return id.length > 0 && !id.startsWith('child_') && !id.startsWith('child-');
}

/**
 * 組觀禮名單：名冊武將依好感由高到低（同分維持名冊順序），再用資料檔名將補足到 maxCrowd；同一人只出現一次。
 */
export function pickCeremonyCrowd(
    roster: readonly CrowdRosterEntry[],
    affinityOf: (generalId: string) => number,
    config: CeremonyCrowdConfig,
): CrowdMember[] {
    const limit = Math.max(0, Math.floor(config.maxCrowd));
    const seen = new Set<string>();
    const out: CrowdMember[] = [];
    const push = (id: string, name: string, gender: string | undefined): void => {
        if (out.length >= limit || seen.has(id) || !isCrowdEligible(id)) return;
        seen.add(id);
        out.push({ generalId: id, name, gender: normalizeCrowdGender(gender) });
    };
    const ranked = roster
        .map((entry, index) => ({ entry, index, affinity: safeAffinity(affinityOf, entry.id) }))
        .sort((a, b) => b.affinity - a.affinity || a.index - b.index);
    for (const { entry } of ranked) push(entry.id, entry.name, entry.gender);
    for (const general of config.crowdGenerals) push(general.generalId, general.name, general.gender);
    return out;
}

function safeAffinity(affinityOf: (id: string) => number, id: string): number {
    try {
        const value = affinityOf(id);
        return Number.isFinite(value) ? value : 0;
    } catch {
        return 0;
    }
}

/** 第 turn 次發言：說話人輪流、台詞輪流，兩者錯開週期，讓同一人不會總說同一句 */
export function crowdTurn(turn: number, memberCount: number, lineCount: number): { memberIndex: number; lineIndex: number } {
    if (memberCount <= 0 || lineCount <= 0) return { memberIndex: -1, lineIndex: -1 };
    const t = Math.max(0, Math.floor(turn));
    return { memberIndex: t % memberCount, lineIndex: (t + Math.floor(t / memberCount)) % lineCount };
}

/**
 * 依說話人性別取台詞：女武將優先用 key.f 變體；翻譯函式查不到時會回傳 key 本身，視為沒有變體。
 */
export function resolveCrowdLine(t: (key: string) => string, key: string, gender: CrowdGender): string {
    if (gender === 'f') {
        const variantKey = `${key}.f`;
        const variant = t(variantKey);
        if (variant && variant !== variantKey) return variant;
    }
    return t(key);
}
