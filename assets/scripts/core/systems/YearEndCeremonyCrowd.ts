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
    /** 第 4～5 名勉勵台詞：觸發名次（規格 shard-c 增補 §1，預設 [4, 5]） */
    readonly nearPodiumRanks?: readonly number[];
    /** 與第 3 名的最大分差，deltaScore 超過就不說勉勵（預設 250） */
    readonly nearPodiumMaxDeltaScore?: number;
    readonly nearPodiumKeys?: readonly string[];
    /** 結義彩蛋：點到結義觀眾時是否優先播專屬祝賀（預設 true） */
    readonly oathEasterEggPriority?: boolean;
    readonly oathCongratsKeys?: readonly string[];
    readonly oathRelationKeys?: OathRelationKeys;
}

export interface OathRelationKeys {
    readonly elderM: string;
    readonly elderF: string;
    readonly youngerM: string;
    readonly youngerF: string;
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
export function resolveCrowdVoiceLine(t: (key: string, ...args: string[]) => string, key: string, member: CrowdMember, ...extra: string[]): string {
    return t(key, selfOf({ gender: member.gender === 'F' ? '女' : '男', type: member.type, age: member.age }), ...extra);
}

const DEFAULT_NEAR_PODIUM_RANKS: readonly number[] = [4, 5];
const DEFAULT_NEAR_PODIUM_MAX_DELTA = 250;

export interface NearPodiumBoard {
    readonly entries: ReadonlyArray<{ readonly rank: number; readonly score: number; readonly isPlayer: boolean }>;
}

export interface NearPodiumPick {
    readonly key: string;
    /** 與第 3 名的實際分差（至少 1，避免說出「多拿 0 分」） */
    readonly deltaScore: number;
}

/**
 * 第 4～5 名勉勵台詞（shard-c 增補 §1）：本府在 nearPodiumRanks 內、且與第 3 名分差 <= nearPodiumMaxDeltaScore 才回傳；
 * 句序由 turn 輪替。找不到第 3 名、分差為負或鍵表為空都回 null。
 */
export function pickNearPodiumLine(board: NearPodiumBoard, config: CeremonyCrowdConfig, turn: number): NearPodiumPick | null {
    const keys = config.nearPodiumKeys ?? [];
    if (keys.length === 0) return null;
    const player = board.entries.find((e) => e.isPlayer);
    const third = board.entries.find((e) => e.rank === 3);
    if (!player || !third) return null;
    if (!(config.nearPodiumRanks ?? DEFAULT_NEAR_PODIUM_RANKS).includes(player.rank)) return null;
    const gap = third.score - player.score;
    if (!Number.isFinite(gap) || gap < 0) return null;
    const deltaScore = Math.max(1, Math.ceil(gap));
    if (deltaScore > (config.nearPodiumMaxDeltaScore ?? DEFAULT_NEAR_PODIUM_MAX_DELTA)) return null;
    const n = Math.max(0, Math.floor(turn));
    return { key: keys[n % keys.length], deltaScore };
}

export interface OathCongratsContext {
    readonly crowd: readonly CrowdMember[];
    /** 領獎的本府武將（結義關係的另一端；主角得獎就是主角，非主角得獎是得獎者本人） */
    readonly winnerId: string;
    readonly winnerAge?: number;
    /** winnerId 生效盟約中的結義兄弟 id（SwornPact.swornBrothersOf） */
    readonly brotherIds: readonly string[];
    /** 本次點擊的觀眾（有給就只判斷這位，沒給則挑第一位結義觀眾） */
    readonly memberIndex?: number;
    readonly turn: number;
}

/**
 * 結義彩蛋的得獎者：本榜前三名中本府名次最高的那一項，用「得獎者自己的武將 id」；
 * 沒有本府前三或該項沒有 generalId 就回 null（不拿主角 id 頂替）。
 */
export function pickOathWinnerEntry<E extends { readonly rank: number; readonly isPlayer: boolean; readonly generalId?: string }>(
    entries: readonly E[],
): (E & { readonly generalId: string }) | null {
    let best: E | null = null;
    for (const e of entries) {
        if (e.isPlayer && e.rank >= 1 && e.rank <= 3 && (!best || e.rank < best.rank)) best = e;
    }
    return best && best.generalId ? (best as E & { readonly generalId: string }) : null;
}

export interface OathCongratsPick {
    readonly memberIndex: number;
    readonly key: string;
    /** 觀眾相對得獎者的稱謂 i18n 鍵（義兄／義弟／義姊／義妹） */
    readonly relationKey: string;
}

/**
 * 結義彩蛋（shard-c 增補 §2）：得獎者與觀眾是結義兄弟時回傳專屬祝賀；稱謂依觀眾性別與年齡（較年長為兄姊，
 * 年齡缺值視為兄姊）。oathEasterEggPriority 為 false、鍵表缺漏或非結義觀眾回 null。
 */
export function pickOathCongratsLine(ctx: OathCongratsContext, config: CeremonyCrowdConfig): OathCongratsPick | null {
    const keys = config.oathCongratsKeys ?? [];
    const rel = config.oathRelationKeys;
    if (config.oathEasterEggPriority === false || keys.length === 0 || !rel) return null;
    const brothers = new Set(ctx.brotherIds);
    const isBrother = (m: CrowdMember | undefined): boolean => !!m && m.generalId !== ctx.winnerId && brothers.has(m.generalId);
    const memberIndex = ctx.memberIndex !== undefined ? ctx.memberIndex : ctx.crowd.findIndex((m) => isBrother(m));
    const member = ctx.crowd[memberIndex];
    if (!isBrother(member)) return null;
    const elder = member.age === undefined || ctx.winnerAge === undefined || member.age >= ctx.winnerAge;
    const female = member.gender === 'F';
    const relationKey = elder ? (female ? rel.elderF : rel.elderM) : (female ? rel.youngerF : rel.youngerM);
    const n = Math.max(0, Math.floor(ctx.turn));
    return { memberIndex, key: keys[n % keys.length], relationKey };
}
