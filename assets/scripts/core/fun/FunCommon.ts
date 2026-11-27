// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §1 共用規則（FUN-01～04，PROG-2-10177）
/**
 * FunCommon — 四項新手樂趣功能共用的純邏輯（不依賴 cc）：
 *  - 台詞槽位代入（{self}{honor}{child}{general}…；自稱一律走 SpeakerVoice，童角走童語表）
 *  - 女角／童角自稱違規掃描（女角不得出現「某」「在下」「俺」「咱家」）
 *  - 存檔種子抽籤（同一場景重進結果相同）
 *  - ToneLock：一開口古代口吻就維持到換場景或換 UI 視窗；雙口吻單元（FUN-02／FUN-04）為宣告例外
 *
 * Unity 對照：像一個無狀態的 LineResolver ＋ 一個 per-window 的 ToneLockRegistry。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import { fillSlots } from '../mind/MindLineTemplates';
import { selfOf, voiceGenderOf, type VoiceProfile } from '../mind/SpeakerVoice';

export type FunTone = 'ancient' | 'modern';
export type FunTrait = GeneralPersonalityType;
export const FUN_TRAITS: readonly FunTrait[] = ['Brave', 'Wise', 'Loyal', 'Playful'];
export const FUN_LOCALES: readonly string[] = ['zh-TW', 'zh-CN', 'en', 'ja'];

/** 孩子滿此歲數就進開獎流程，不再觸發 FUN-01 */
export const FUN_TODDLER_MAX_AGE = 5;

// ── 抽籤 ────────────────────────────────────────────────────────────────

/** FNV-1a 32 位元雜湊：同字串同結果，跨平台一致 */
export function funHash(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/** 以存檔種子＋情境鍵抽 0..n-1；n<=0 回 -1 */
export function funPickIndex(seed: string, key: string, n: number): number {
    if (n <= 0) return -1;
    return funHash(`${seed}|${key}`) % n;
}

export interface FunWeighted { id: string; weight?: number }

/** 加權抽一個；exclude 內的 id 先剔除（剔光就不剔，避免無句可說）。同 seed 同輸出 */
export function funPickWeighted<T extends FunWeighted>(items: readonly T[], seed: string, key: string, exclude: readonly string[] = []): T | null {
    if (items.length === 0) return null;
    let pool = items.filter((item) => !exclude.includes(item.id));
    if (pool.length === 0) pool = items.slice();
    const weights = pool.map((item) => Math.max(0, item.weight ?? 1));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return pool[funPickIndex(seed, key, pool.length)];
    let roll = (funHash(`${seed}|${key}`) % 100000) / 100000 * total;
    for (let i = 0; i < pool.length; i += 1) {
        roll -= weights[i];
        if (roll < 0) return pool[i];
    }
    return pool[pool.length - 1];
}

// ── 槽位代入 ────────────────────────────────────────────────────────────

/** 童語自稱：男孩我／寶寶，女孩我／寶寶／人家（規格 §2.1-5） */
export function toddlerSelfOf(gender: string | undefined, seed: string): string {
    const options = voiceGenderOf(gender) === 'F' ? ['我', '寶寶', '人家'] : ['我', '寶寶'];
    return options[funPickIndex(seed, 'self', options.length)];
}

export interface FunSlotContext {
    voice: Readonly<VoiceProfile>;
    /** 對玩家稱謂（已本地化） */
    honor?: string;
    child?: string;
    general?: string;
    extra?: Readonly<Record<string, string>>;
    /** 童角：自稱改走童語表（需帶 seed 讓同孩子同季穩定） */
    toddlerSeed?: string;
}

export function funSlots(ctx: Readonly<FunSlotContext>): Record<string, string> {
    const self = ctx.toddlerSeed !== undefined ? toddlerSelfOf(ctx.voice.gender, ctx.toddlerSeed) : selfOf(ctx.voice);
    const slots: Record<string, string> = { self };
    if (ctx.honor !== undefined) slots.honor = ctx.honor;
    if (ctx.child !== undefined) slots.child = ctx.child;
    if (ctx.general !== undefined) slots.general = ctx.general;
    return { ...slots, ...(ctx.extra ?? {}) };
}

/** 套用槽位；沒給值的槽位原樣保留，呼叫端用 hasUnfilledSlot 檢查 */
export function funFill(template: string, ctx: Readonly<FunSlotContext>): string {
    return fillSlots(template, funSlots(ctx));
}

export function hasUnfilledSlot(text: string): boolean {
    return /\{\w+\}/.test(text);
}

// ── 違規掃描 ────────────────────────────────────────────────────────────

/** 女角不得出現的男性自稱（規格 §1.1-3） */
export const FEMALE_FORBIDDEN_SELF: readonly string[] = ['某', '在下', '俺', '咱家'];
/** 童角不得出現的成人自稱 */
export const CHILD_FORBIDDEN_SELF: readonly string[] = ['某', '老夫', '老身', '在下', '俺', '咱家'];

/** 回傳違規詞清單；空陣列＝通過。性別為女時掃男性自稱；童角（<16 歲）不得出現成人自稱 */
export function funLineViolations(text: string, gender: string | undefined, age: number | undefined): string[] {
    const found: string[] = [];
    if (voiceGenderOf(gender) === 'F') {
        for (const word of FEMALE_FORBIDDEN_SELF) if (text.includes(word)) found.push(word);
    }
    if (age !== undefined && age < 16) {
        for (const word of CHILD_FORBIDDEN_SELF) if (text.includes(word) && !found.includes(word)) found.push(word);
    }
    return found;
}

// ── 樣板過濾 ────────────────────────────────────────────────────────────

export interface FunTemplateBase extends FunWeighted {
    textKey: string;
    genders?: readonly string[];
    traits?: readonly FunTrait[];
}

/** 性別與性格標籤過濾；genders 缺或含 'any' 視為通用 */
export function funMatchesVoice(t: Pick<FunTemplateBase, 'genders' | 'traits'>, gender: string | undefined, trait: FunTrait | undefined): boolean {
    const g = voiceGenderOf(gender) === 'F' ? 'F' : 'M';
    if (t.genders && t.genders.length > 0 && !t.genders.includes('any') && !t.genders.includes(g)) return false;
    if (t.traits && t.traits.length > 0 && trait !== undefined && !t.traits.includes(trait)) return false;
    return true;
}

/** 翻譯結果有效：非空、不等於鍵名（i18n 查不到時回鍵本身）、沒有未填槽位 */
export function usableLine(text: string | null | undefined, key: string): text is string {
    return typeof text === 'string' && text.length > 0 && text !== key && !hasUnfilledSlot(text);
}

// ── ToneLock ───────────────────────────────────────────────────────────

export type ToneLockValue = 'unset' | FunTone;

export interface ToneResolution {
    /** 實際可用的口吻；樣板池一種口吻都沒有時為 null */
    tone: FunTone | null;
    /** 被攔下或退階時的警告（呼叫端寫 log） */
    warning?: 'tone-blocked' | 'tone-fallback' | 'tone-empty';
}

/** 口吻鎖：以 sceneId＋windowId 為範圍；換場景或換視窗就整批清空。只存在記憶體，不進存檔。 */
export class FunToneLock {
    private _scope = '';
    private readonly _locks = new Map<string, FunTone>();

    /** 進入範圍；與目前不同就清空全部鎖定 */
    public enterScope(sceneId: string, windowId: string): void {
        const scope = `${sceneId}|${windowId}`;
        if (scope === this._scope) return;
        this._scope = scope;
        this._locks.clear();
    }

    public get scope(): string { return this._scope; }

    public lockOf(speakerId: string): ToneLockValue {
        return this._locks.get(speakerId) ?? 'unset';
    }

    /**
     * 挑口吻：已鎖定就只能用鎖定值（想換另一種被攔下並回 tone-blocked）；
     * 未鎖定就用 wanted（不在 available 內則退到有的那一種，回 tone-fallback）。
     * 決定後立刻寫入鎖定（第一句決定鎖定值）。
     */
    public resolve(speakerId: string, wanted: FunTone, available: readonly FunTone[]): ToneResolution {
        if (available.length === 0) return { tone: null, warning: 'tone-empty' };
        const locked = this._locks.get(speakerId);
        if (locked !== undefined) {
            if (available.includes(locked)) return locked === wanted ? { tone: locked } : { tone: locked, warning: 'tone-blocked' };
            return { tone: available[0], warning: 'tone-fallback' };
        }
        if (available.includes(wanted)) {
            this._locks.set(speakerId, wanted);
            return { tone: wanted };
        }
        this._locks.set(speakerId, available[0]);
        return { tone: available[0], warning: 'tone-fallback' };
    }

    /**
     * 雙口吻單元（只有 FUN-02／FUN-04）：固定「古代句 → 現代句」，不受鎖定限制；
     * 單元結束後該說話者鎖定 modern（吐槽是最後一句）。
     */
    public playDualUnit(speakerId: string): readonly [FunTone, FunTone] {
        this._locks.set(speakerId, 'modern');
        return ['ancient', 'modern'];
    }
}
