// @spec-source → PROG-2-10106 年末典禮觀禮武將（Antigravity ceremony-crowd 資料驅動化；純邏輯不依賴 cc）
/**
 * YearEndCeremonyCrowd — 年末典禮「觀禮武將」名單與熱鬧台詞挑選（純邏輯）
 *
 * 名單：優先取玩家名冊裡的武將（好感高者優先），不足再依資料檔補名將；
 * 台詞：與說話人無關的通用熱鬧句，說話人的名字由畫面的名字標籤顯示；
 *       自稱槽位 {0} 由 SpeakerVoice 依性別代入，自稱一律用 {0} 槽位。
 */
import { selfOf, voiceGenderOf, type VoiceGender } from '../mind/SpeakerVoice';
import type { GeneralPersonalityType } from '../models/GeneralUnit';

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
    /** 玩家得獎時 2～3 位觀眾接力起鬨的台詞鍵（PROG-2-10127） */
    readonly winRelayKeys: readonly string[];
    /** 玩家落榜時拍肩、偷笑的台詞鍵 */
    readonly loseRelayKeys: readonly string[];
}

export interface CrowdRosterEntry {
    readonly id: string;
    readonly name: string;
    readonly gender?: string;
    /** 性格與年齡：台詞自稱走 SpeakerVoice（勇「本姑娘」、玩「人家」、少年「我」…）；缺值照成年處理 */
    readonly personality?: { readonly type: GeneralPersonalityType };
    readonly age?: number;
}

export type CrowdGender = VoiceGender;

export interface CrowdMember {
    readonly generalId: string;
    readonly name: string;
    readonly gender: CrowdGender;
    readonly type?: GeneralPersonalityType;
    readonly age?: number;
}

/** 性別一律走全遊戲共用的 SpeakerVoice（PROG-2-10083），不另寫一套 */
export const normalizeCrowdGender = (raw: string | null | undefined): CrowdGender => voiceGenderOf(raw ?? undefined);

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
    const push = (id: string, name: string, gender: string | undefined, entry?: CrowdRosterEntry): void => {
        if (out.length >= limit || seen.has(id) || !isCrowdEligible(id)) return;
        seen.add(id);
        out.push({
            generalId: id,
            name,
            gender: normalizeCrowdGender(gender),
            ...(entry?.personality ? { type: entry.personality.type } : {}),
            ...(entry?.age !== undefined ? { age: entry.age } : {}),
        });
    };
    const ranked = roster
        .map((entry, index) => ({ entry, index, affinity: safeAffinity(affinityOf, entry.id) }))
        .sort((a, b) => b.affinity - a.affinity || a.index - b.index);
    for (const { entry } of ranked) push(entry.id, entry.name, entry.gender, entry);
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
 * 台詞文字：台詞裡的 {0} 由共用聲線代入第一人稱（男「某」、女「妾身」…），台詞本身不寫死自稱。
 */
export function resolveCrowdLine(t: (key: string, ...args: string[]) => string, key: string, gender: CrowdGender): string {
    return t(key, selfOf({ gender: gender === 'F' ? '女' : '男' }));
}

/**
 * 台詞文字（完整聲線版）：性別、性格、年齡都走 SpeakerVoice.selfOf，
 * 同一句台詞由勇猛女將說是「本姑娘」、少年說是「我」、老將說是「老夫」。
 */
export function resolveCrowdVoiceLine(t: (key: string, ...args: string[]) => string, key: string, member: CrowdMember): string {
    return t(key, selfOf({ gender: member.gender === 'F' ? '女' : '男', type: member.type, age: member.age }));
}
