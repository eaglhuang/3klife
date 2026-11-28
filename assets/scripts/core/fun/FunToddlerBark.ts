// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §2 FUN-01 幼兒親子互動；PROG-2-10177
/**
 * FunToddlerBark — 點未滿 5 歲孩子頭像出一句童言童語（純邏輯，不依賴 cc）。
 *
 * 規則：
 *  - 對象：未滿 5 歲（含 0 歲嬰兒）；滿 5 歲進開獎流程，不再觸發。
 *  - 每季換：以季數為鍵挑句，同孩子同季點幾次句子固定；下一季才換新句，連兩季不抽到同一樣板。
 *  - 年齡分段（baby／toddler／kid）過濾樣板；孩子語氣不適用 ToneLock。
 *  - 獎勵：每孩子每季第一次點擊給 BUNDLE_TODDLER_BOND（親子好感 +1），grantKey = fun01.{childId}.{seasonNo}。
 *  - 查不到台詞回 null（不畫對話框、不用萬用句硬補）。
 */
import type { IApiClient } from '../../shared/api/IApiClient';
import { claimFunReward, type FunClaimOutcome } from './FunReward';
import type { FunState } from './FunState';
import {
    FUN_TODDLER_MAX_AGE, funFill, funMatchesVoice, funPickWeighted, usableLine,
    type FunTemplateBase, type FunTrait,
} from './FunCommon';

export type ToddlerAgeBand = 'baby' | 'toddler' | 'kid';
export type ToddlerAction = 'none' | 'bounce' | 'spin' | 'bubble' | 'wave' | 'fist';
export const TODDLER_ACTIONS: readonly ToddlerAction[] = ['none', 'bounce', 'spin', 'bubble', 'wave', 'fist'];

export interface ToddlerTemplate extends FunTemplateBase {
    ageBand: ToddlerAgeBand;
    action: ToddlerAction;
    sfx?: string;
}

export interface ToddlerPool {
    schema: 'fun-toddler-bark.v1';
    id: string;
    ageBands: Record<ToddlerAgeBand, [number, number]>;
    templates: ToddlerTemplate[];
    rules: { perSeasonFixed: boolean; noRepeatLastSeason: boolean; bubbleSeconds: number };
    reward: { bundleId: string; grantKeyFmt: string };
}

export const TODDLER_POOL_JSON = 'data/fun-toddler-bark';

const DEFAULT_BANDS: Record<ToddlerAgeBand, [number, number]> = { baby: [0, 1], toddler: [2, 3], kid: [4, 4] };

/** 壞樣板略過、其餘照常（資料檔可由企劃手改）；整份壞掉回 null */
export function normalizeToddlerPool(raw: unknown): ToddlerPool | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const src = raw as Record<string, unknown>;
    if (src.schema !== 'fun-toddler-bark.v1' || !Array.isArray(src.templates)) return null;
    const templates: ToddlerTemplate[] = [];
    for (const item of src.templates as unknown[]) {
        if (typeof item !== 'object' || item === null) continue;
        const t = item as Record<string, unknown>;
        if (typeof t.id !== 'string' || typeof t.textKey !== 'string' || !['baby', 'toddler', 'kid'].includes(String(t.ageBand))) continue;
        const action = TODDLER_ACTIONS.find((a) => a === t.action) ?? 'none';
        templates.push({
            id: t.id,
            textKey: t.textKey,
            ageBand: t.ageBand as ToddlerAgeBand,
            action,
            genders: Array.isArray(t.genders) ? t.genders.filter((g): g is string => typeof g === 'string') : ['any'],
            weight: typeof t.weight === 'number' ? t.weight : 1,
            ...(typeof t.sfx === 'string' ? { sfx: t.sfx } : {}),
        });
    }
    const rules = (src.rules ?? {}) as Record<string, unknown>;
    const reward = (src.reward ?? {}) as Record<string, unknown>;
    const bands = { ...DEFAULT_BANDS };
    const rawBands = (src.ageBands ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_BANDS) as ToddlerAgeBand[]) {
        const range = rawBands[key];
        if (Array.isArray(range) && range.length === 2 && typeof range[0] === 'number' && typeof range[1] === 'number') bands[key] = [range[0], range[1]];
    }
    return {
        schema: 'fun-toddler-bark.v1',
        id: typeof src.id === 'string' ? src.id : 'FUN01_POOL',
        ageBands: bands,
        templates,
        rules: {
            perSeasonFixed: rules.perSeasonFixed !== false,
            noRepeatLastSeason: rules.noRepeatLastSeason !== false,
            bubbleSeconds: typeof rules.bubbleSeconds === 'number' && rules.bubbleSeconds > 0 ? rules.bubbleSeconds : 3.5,
        },
        reward: {
            bundleId: typeof reward.bundleId === 'string' ? reward.bundleId : 'BUNDLE_TODDLER_BOND',
            grantKeyFmt: typeof reward.grantKeyFmt === 'string' ? reward.grantKeyFmt : 'fun01.{childId}.{seasonNo}',
        },
    };
}

/** 未滿 5 歲才觸發 */
export function isToddlerAge(age: number | undefined): boolean {
    return typeof age === 'number' && Number.isFinite(age) && age >= 0 && age < FUN_TODDLER_MAX_AGE;
}

export function toddlerAgeBandOf(age: number, bands: Readonly<Record<ToddlerAgeBand, [number, number]>> = DEFAULT_BANDS): ToddlerAgeBand {
    const whole = Math.floor(age + 1e-9);
    if (whole <= bands.baby[1]) return 'baby';
    if (whole <= bands.toddler[1]) return 'toddler';
    return 'kid';
}

export function toddlerGrantKey(pool: Pick<ToddlerPool, 'reward'>, childId: string, seasonNo: number): string {
    return pool.reward.grantKeyFmt.split('{childId}').join(childId).split('{seasonNo}').join(String(seasonNo));
}

/**
 * 領「孩子每季一筆」的親子好感獎勵：FUN-01 點頭像與幼兒近況摸頭兩個入口共用同一個 grantKey，
 * 同季不論按幾次、重載幾次，reward.claim 都只入帳一次（後到者 replayed）。
 */
export function claimToddlerBond(api: Pick<IApiClient, 'cmd'>, pool: Pick<ToddlerPool, 'reward'>, childId: string, seasonNo: number): Promise<FunClaimOutcome> {
    return claimFunReward(api, { bundleId: pool.reward.bundleId, grantKey: toddlerGrantKey(pool, childId, seasonNo), sourceKind: 'fun01', sourceRef: childId });
}

export interface ToddlerChild {
    id: string;
    gender?: string;
    /** 年齡（可為小數，整歲分段） */
    age: number;
    trait?: FunTrait;
}

export interface ToddlerBarkInput {
    pool: ToddlerPool;
    state: Readonly<FunState>;
    child: ToddlerChild;
    seasonNo: number;
    /** 存檔種子（magistrateUid） */
    seed: string;
    translate: (key: string) => string;
    /** 對玩家稱謂（爸爸／娘親；已本地化） */
    honor: string;
}

export interface ToddlerBarkResult {
    templateId: string;
    text: string;
    action: ToddlerAction;
    sfx: string | null;
    bubbleSeconds: number;
    grantKey: string;
    bundleId: string;
    /** 這個孩子這一季第一次點擊（獎勵只在此時結算；重送由 grantKey 去重） */
    firstThisSeason: boolean;
}

/**
 * 點一次孩子頭像：回要顯示的台詞、動作與獎勵資訊，以及更新後的 funState（呼叫端存回 session）。
 * 不符資格（滿 5 歲）或查不到台詞回 null，狀態不動。
 */
export function pickToddlerBark(input: ToddlerBarkInput): { result: ToddlerBarkResult; state: FunState } | null {
    const { pool, child, seasonNo, state } = input;
    if (!isToddlerAge(child.age)) return null;
    const band = toddlerAgeBandOf(child.age, pool.ageBands);
    const prior = state.toddler[child.id];
    const sameSeason = prior !== undefined && prior.lastSeasonNo === seasonNo;
    const candidates = pool.templates.filter((t) => t.ageBand === band && funMatchesVoice(t, child.gender, child.trait));
    if (candidates.length === 0) return null;

    const render = (t: ToddlerTemplate): string | null => {
        const raw = input.translate(t.textKey);
        if (!raw || raw === t.textKey) return null;
        const filled = funFill(raw, { voice: { gender: child.gender, age: child.age }, honor: input.honor, toddlerSeed: `${input.seed}|${child.id}|${seasonNo}` });
        return usableLine(filled, t.textKey) ? filled : null;
    };

    let chosen: ToddlerTemplate | null = null;
    let text: string | null = null;
    // 同季固定：重點只重播同一句（該句仍須能渲染，否則退回重抽）
    if (pool.rules.perSeasonFixed && sameSeason) {
        const fixed = candidates.find((t) => t.id === prior.lastTemplateId);
        if (fixed) {
            const rendered = render(fixed);
            if (rendered !== null) { chosen = fixed; text = rendered; }
        }
    }
    if (chosen === null) {
        const exclude = pool.rules.noRepeatLastSeason && prior !== undefined ? [prior.lastTemplateId] : [];
        const tried: string[] = [];
        for (let i = 0; i < candidates.length && chosen === null; i += 1) {
            const t = funPickWeighted(candidates, input.seed, `fun01|${child.id}|${seasonNo}`, [...exclude, ...tried]);
            if (!t) break;
            const rendered = render(t);
            if (rendered !== null) { chosen = t; text = rendered; } else tried.push(t.id);
        }
    }
    if (chosen === null || text === null) return null;

    const next: FunState = { ...state, toddler: { ...state.toddler, [child.id]: { lastSeasonNo: seasonNo, lastTemplateId: chosen.id } } };
    return {
        result: {
            templateId: chosen.id,
            text,
            action: chosen.action,
            sfx: chosen.sfx ?? null,
            bubbleSeconds: pool.rules.bubbleSeconds,
            grantKey: toddlerGrantKey(pool, child.id, seasonNo),
            bundleId: pool.reward.bundleId,
            firstThisSeason: !sameSeason,
        },
        state: next,
    };
}
