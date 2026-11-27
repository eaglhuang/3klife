// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §3 FUN-02／§4 FUN-03／§5 FUN-04；2026-11-27 晚世界觀修訂；PROG-2-10185
/**
 * FunStageLines — FUN-02 滿月酒、FUN-03 勝仗搭話、FUN-04 首次招募自我介紹的選人與選句（純邏輯，不依賴 cc）。
 *
 * 世界觀修訂（使用者 2026-11-27 晚）：
 *  - 武將一律古代口吻，不會講現代話，也不知道主角的來歷；所以不再有 ToneLock 的古今切換。
 *  - 原規格的「現代白話吐槽」改成主角的內心 OS：獨立一句、顯示成「（心想）」樣式，不是武將說的。
 *  - 台詞全走 i18n 鍵，槽位 {self}{honor}{child}{son}{general}{he} 由這裡代入；性別來自說話武將。
 *
 * Unity 對照：像三個無狀態的 DialoguePicker，吃資料表＋存檔狀態，回傳要演的台詞與新的狀態。
 */
import type { FunState, FunPendingVictoryChat } from './FunState';
import {
    FUN_TRAITS, funFill, funHash, funMatchesVoice, funPickWeighted, usableLine,
    type FunSlotContext, type FunTrait,
} from './FunCommon';
import { voiceGenderOf } from '../mind/SpeakerVoice';
import { popupTypeOfId } from '../systems/PopupSpeakerLine';

export const FUN_STAGE_LINES_JSON = 'data/fun-stage-lines';
/** 成年門檻：未滿此歲數的不當賓客、不搭話、不自我介紹 */
export const FUN_ADULT_AGE = 16;

// ── 資料表 ──────────────────────────────────────────────────────────────

export interface RecruitLineSet { intro: string; os: string }
export interface MoonLineSet { toast: string; os: string; gift?: string }

export interface VictoryTemplate {
    id: string;
    resultBand: 'bigWin' | 'closeWin' | 'win';
    traits: FunTrait[];
    genders: string[];
    textKey: string;
    osKey?: string;
    weight: number;
}

export interface FunStageLines {
    recruit: {
        entries: Record<string, RecruitLineSet>;
        fallbackByTrait: Record<FunTrait, RecruitLineSet[]>;
        announceByTrait: Record<FunTrait, string>;
        maxIntroPerBatch: number;
    };
    moon: {
        entries: Record<string, MoonLineSet>;
        fallbackByTrait: Record<FunTrait, MoonLineSet[]>;
        giftByTrait: Record<FunTrait, string>;
        giftBundles: Record<FunTrait, string>;
        minGuests: number;
        maxGuests: number;
        /** 首子出生後超過這麼多季才讀檔的舊存檔不再補辦 */
        lateSeasons: number;
    };
    victory: {
        templates: VictoryTemplate[];
        maxPerSeason: number;
        highlightWeight: number;
        rewardCapPerGeneralPerSeason: number;
        bundleId: string;
        grantKeyFmt: string;
    };
}

function obj(v: unknown): Record<string, unknown> {
    return typeof v === 'object' && v !== null ? v as Record<string, unknown> : {};
}
function text(v: unknown): string { return typeof v === 'string' ? v : ''; }
function num(v: unknown, fallback: number): number { return typeof v === 'number' && Number.isFinite(v) ? v : fallback; }

function lineSet(raw: unknown, keys: readonly string[]): Record<string, string> | null {
    const o = obj(raw);
    const out: Record<string, string> = {};
    for (const k of keys) {
        const s = text(o[k]);
        if (s === '' && k !== 'gift') return null;
        if (s !== '') out[k] = s;
    }
    return out;
}

/** 壞項目略過、整份壞掉回 null（資料檔可由企劃手改） */
export function normalizeStageLines(raw: unknown): FunStageLines | null {
    const src = obj(raw);
    if (src.schema !== 'fun-stage-lines.v1') return null;
    const recruitSrc = obj(src.recruit);
    const moonSrc = obj(src.moon);
    const victorySrc = obj(src.victory);
    const recruitEntries: Record<string, RecruitLineSet> = {};
    for (const [id, v] of Object.entries(obj(recruitSrc.entries))) {
        const s = lineSet(v, ['intro', 'os']);
        if (s) recruitEntries[id] = { intro: s.intro, os: s.os };
    }
    const moonEntries: Record<string, MoonLineSet> = {};
    for (const [id, v] of Object.entries(obj(moonSrc.entries))) {
        const s = lineSet(v, ['toast', 'os', 'gift']);
        if (s) moonEntries[id] = { toast: s.toast, os: s.os, ...(s.gift ? { gift: s.gift } : {}) };
    }
    const recruitFb = {} as Record<FunTrait, RecruitLineSet[]>;
    const moonFb = {} as Record<FunTrait, MoonLineSet[]>;
    const announce = {} as Record<FunTrait, string>;
    const giftByTrait = {} as Record<FunTrait, string>;
    const giftBundles = {} as Record<FunTrait, string>;
    for (const trait of FUN_TRAITS) {
        const rList = obj(recruitSrc.fallbackByTrait)[trait];
        recruitFb[trait] = (Array.isArray(rList) ? rList : []).map((v) => lineSet(v, ['intro', 'os'])).filter((s): s is Record<string, string> => s !== null).map((s) => ({ intro: s.intro, os: s.os }));
        const mList = obj(moonSrc.fallbackByTrait)[trait];
        moonFb[trait] = (Array.isArray(mList) ? mList : []).map((v) => lineSet(v, ['toast', 'os'])).filter((s): s is Record<string, string> => s !== null).map((s) => ({ toast: s.toast, os: s.os }));
        announce[trait] = text(obj(recruitSrc.announceByTrait)[trait]);
        giftByTrait[trait] = text(obj(moonSrc.giftByTrait)[trait]);
        giftBundles[trait] = text(obj(moonSrc.giftBundles)[trait]) || `BUNDLE_MOONPARTY_GIFT_${trait.toUpperCase()}`;
    }
    const templates: VictoryTemplate[] = [];
    for (const item of Array.isArray(victorySrc.templates) ? victorySrc.templates : []) {
        const t = obj(item);
        const band = ['bigWin', 'closeWin', 'win'].find((b) => b === t.resultBand);
        if (!text(t.id) || !text(t.textKey) || !band) continue;
        templates.push({
            id: text(t.id),
            resultBand: band as VictoryTemplate['resultBand'],
            traits: (Array.isArray(t.traits) ? t.traits : []).filter((x): x is FunTrait => FUN_TRAITS.includes(x as FunTrait)),
            genders: Array.isArray(t.genders) ? t.genders.filter((g): g is string => typeof g === 'string') : ['any'],
            textKey: text(t.textKey),
            ...(text(t.osKey) ? { osKey: text(t.osKey) } : {}),
            weight: num(t.weight, 1),
        });
    }
    const rules = obj(victorySrc.rules);
    const reward = obj(victorySrc.reward);
    const guest = obj(moonSrc.guestCount);
    return {
        recruit: { entries: recruitEntries, fallbackByTrait: recruitFb, announceByTrait: announce, maxIntroPerBatch: Math.max(1, num(obj(recruitSrc.rules).maxIntroPerBatch, 3)) },
        moon: {
            entries: moonEntries, fallbackByTrait: moonFb, giftByTrait, giftBundles,
            minGuests: Math.max(1, num(guest.min, 3)), maxGuests: Math.min(5, Math.max(1, num(guest.max, 5))),
            lateSeasons: Math.max(0, num(moonSrc.lateSeasons, 4)),
        },
        victory: {
            templates,
            maxPerSeason: Math.max(0, num(rules.maxPerSeason, 3)),
            highlightWeight: Math.max(1, num(rules.highlightWeight, 3)),
            rewardCapPerGeneralPerSeason: Math.max(1, num(rules.rewardCapPerGeneralPerSeason, 2)),
            bundleId: text(reward.bundleId) || 'BUNDLE_VICTORY_CHAT',
            grantKeyFmt: text(reward.grantKeyFmt) || 'fun03.{generalId}.{seasonNo}.{n}',
        },
    };
}

// ── 共用 ────────────────────────────────────────────────────────────────

export interface StageGeneral {
    id: string;
    name?: string;
    gender?: string;
    age?: number;
    personality?: { type: FunTrait };
}

export function stageTraitOf(g: Pick<StageGeneral, 'id' | 'personality'>): FunTrait {
    return g.personality?.type ?? popupTypeOfId(g.id);
}

/** 檔名風格 id（guan_yu）對資料表 id（guan-yu）：資料表一律用名冊 id（連字號） */
export function stageUnderscoreId(id: string): string {
    return id.replace(/-/g, '_');
}

export type StageTranslate = (key: string, ...args: string[]) => string;

export interface StageRenderEnv {
    translate: StageTranslate;
    /** 對玩家的稱謂（主公等，已本地化） */
    honor: string;
}

/** 代入槽位後的一句；查不到、有未填槽位回 null（不顯示鍵名） */
function renderLine(key: string, g: StageGeneral, env: StageRenderEnv, extra: Record<string, string> = {}): string | null {
    const raw = env.translate(key);
    if (!usableLineCandidate(raw, key)) return null;
    const ctx: FunSlotContext = {
        voice: { gender: g.gender, type: stageTraitOf(g), age: g.age },
        honor: env.honor,
        general: g.name ?? g.id,
        extra: { he: env.translate(`fun.pron.he.${voiceGenderOf(g.gender)}`), ...extra },
    };
    const filled = funFill(raw, ctx);
    return usableLine(filled, key) ? filled : null;
}

function usableLineCandidate(raw: string | null | undefined, key: string): raw is string {
    return typeof raw === 'string' && raw.length > 0 && raw !== key;
}

/** 這位武將可說話：成年、有 id */
export function canStageSpeak(g: StageGeneral): boolean {
    return g.id !== '' && (g.age === undefined || g.age >= FUN_ADULT_AGE);
}

// ── FUN-04 首次招募自我介紹 ──────────────────────────────────────────────

export interface RecruitIntroResult {
    generalId: string;
    introText: string;
    /** 主角內心 OS（不含「（心想）」前綴，前綴由畫面加） */
    osText: string;
    /** 這次用了「預告」那句（遊戲第一位被介紹者） */
    announced: boolean;
}

/** 這批新武將裡要播的人：新（沒聽過）、成年、最多 maxIntroPerBatch 位；其餘只顯示獲得面板 */
export function selectRecruitBatch(generals: readonly StageGeneral[], state: Readonly<FunState>, max: number): StageGeneral[] {
    const out: StageGeneral[] = [];
    for (const g of generals) {
        if (out.length >= max) break;
        if (!canStageSpeak(g) || state.recruitIntro[g.id] || out.some((o) => o.id === g.id)) continue;
        out.push(g);
    }
    return out;
}

export function recruitIntroFor(
    lines: FunStageLines, g: StageGeneral, state: Readonly<FunState>, env: StageRenderEnv,
): RecruitIntroResult | null {
    if (!canStageSpeak(g) || state.recruitIntro[g.id]) return null;
    const trait = stageTraitOf(g);
    const named = lines.recruit.entries[g.id];
    const fallbacks = lines.recruit.fallbackByTrait[trait] ?? [];
    const set = named ?? (fallbacks.length > 0 ? fallbacks[funHash(g.id) % fallbacks.length] : null);
    if (!set) return null;
    const introText = renderLine(set.intro, g, env);
    if (introText === null) return null;
    const announceKey = lines.recruit.announceByTrait[trait];
    const announced = !state.dualToneAnnounced && !!announceKey;
    const osText = renderLine(announced ? announceKey : set.os, g, env) ?? '';
    return { generalId: g.id, introText, osText, announced };
}

/** 播完後寫進存檔：記下這位聽過了；預告句播過就不再播 */
export function markRecruitIntroPlayed(state: Readonly<FunState>, generalId: string, announced: boolean): FunState {
    return {
        ...state,
        recruitIntro: { ...state.recruitIntro, [generalId]: true },
        dualToneAnnounced: state.dualToneAnnounced || announced,
    };
}

// ── FUN-02 滿月酒 ───────────────────────────────────────────────────────

export interface MoonChildInput {
    id: string;
    name?: string;
    gender?: string;
    fatherId?: string;
    motherId?: string;
    birthSeason?: number;
}

/** 玩家家族的子嗣：有父母紀錄與正的出生季數（開局幼苗的 birthSeason 為負，不算「首子」） */
export function isFamilyNewborn(c: Pick<MoonChildInput, 'fatherId' | 'motherId' | 'birthSeason'>): boolean {
    return !!(c.fatherId || c.motherId) && typeof c.birthSeason === 'number' && c.birthSeason >= 0;
}

/**
 * 滿月酒該不該辦：只有第一個孩子（出生季最早者）、孩子出生滿一季（季為最小單位，取下一個季初）、
 * 還沒辦過；超過 lateSeasons 季才進來的舊存檔不補辦。回傳該辦的孩子，否則 null。
 */
export function moonPartyChild(
    lines: FunStageLines, children: readonly MoonChildInput[], currentSeason: number, state: Readonly<FunState>,
): MoonChildInput | null {
    if (state.moonParty?.done) return null;
    const born = children.filter(isFamilyNewborn).slice().sort((a, b) => (a.birthSeason! - b.birthSeason!) || a.id.localeCompare(b.id));
    const first = state.moonParty ? born.find((c) => c.id === state.moonParty!.childId) ?? born[0] : born[0];
    if (!first) return null;
    const age = currentSeason - first.birthSeason!;
    if (age < 1 || age > lines.moon.lateSeasons) return null;
    return first;
}

export interface MoonGuestCandidate extends StageGeneral {
    friendship?: number;
    /** 與主角有血緣或結義 */
    kin?: boolean;
}

/**
 * 挑賓客 3～5 位：友誼高 > 血緣結義 > 有個別台詞 > 依 id 雜湊；不足 minGuests 時用家人（父母）補位。
 * 同一武將不重複；沒有任何人時回空陣列（不辦，下次回大廳再看）。
 */
export function pickMoonGuests(
    lines: FunStageLines, candidates: readonly MoonGuestCandidate[], family: readonly StageGeneral[], seed: string,
): string[] {
    const pool = candidates.filter((c) => canStageSpeak(c));
    pool.sort((a, b) => ((b.friendship ?? 0) - (a.friendship ?? 0))
        || (Number(!!b.kin) - Number(!!a.kin))
        || (Number(!!lines.moon.entries[b.id]) - Number(!!lines.moon.entries[a.id]))
        || (funHash(`${seed}|${a.id}`) - funHash(`${seed}|${b.id}`)));
    const picked = pool.slice(0, lines.moon.maxGuests).map((c) => c.id);
    for (const f of family) {
        if (picked.length >= lines.moon.minGuests) break;
        if (canStageSpeak(f) && !picked.includes(f.id)) picked.push(f.id);
    }
    return picked;
}

export interface MoonGuestBeat {
    guestId: string;
    toastText: string;
    osText: string;
    giftName: string;
    bundleId: string;
    grantKey: string;
}

export function moonGrantKey(childId: string, guestId: string): string {
    return `fun02.${childId}.${guestId}`;
}

export function moonGuestBeat(
    lines: FunStageLines, guest: StageGeneral, child: MoonChildInput, env: StageRenderEnv,
): MoonGuestBeat | null {
    const trait = stageTraitOf(guest);
    const named = lines.moon.entries[guest.id];
    const fallbacks = lines.moon.fallbackByTrait[trait] ?? [];
    const set = named ?? (fallbacks.length > 0 ? fallbacks[funHash(guest.id) % fallbacks.length] : null);
    if (!set) return null;
    const son = env.translate(voiceGenderOf(child.gender) === 'F' ? 'fun.child.daughter' : 'fun.child.son');
    const extra = { son, child: child.name ?? child.id };
    const toastText = renderLine(set.toast, guest, env, extra);
    if (toastText === null) return null;
    const osText = renderLine(set.os, guest, env, extra) ?? '';
    const giftKey = ('gift' in set && set.gift) ? set.gift : lines.moon.giftByTrait[trait];
    const giftRaw = giftKey ? env.translate(giftKey) : '';
    return {
        guestId: guest.id,
        toastText,
        osText,
        giftName: usableLineCandidate(giftRaw, giftKey ?? '') ? giftRaw : '',
        bundleId: lines.moon.giftBundles[trait],
        grantKey: moonGrantKey(child.id, guest.id),
    };
}

export function markMoonPartyDone(state: Readonly<FunState>, childId: string, guestIds: readonly string[]): FunState {
    return { ...state, moonParty: { childId, guestIds: guestIds.slice(0, 5), done: true } };
}

/** 事件時刻先算好賓客並寫入存檔（閃退重進同一批人、從頭重播但不重複入帳） */
export function recordMoonGuests(state: Readonly<FunState>, childId: string, guestIds: readonly string[]): FunState {
    return { ...state, moonParty: { childId, guestIds: guestIds.slice(0, 5), done: false } };
}

// ── FUN-03 勝仗搭話 ─────────────────────────────────────────────────────

export interface VictoryCandidate extends StageGeneral {
    /** 本場高光（擊殺最多／受傷最重／首功）權重 ×highlightWeight */
    highlight?: boolean;
}

export interface VictoryBattleInfo {
    seasonNo: number;
    resultBand: FunPendingVictoryChat['resultBand'];
}

/** 結算當下排一場搭話：挑人（連續兩場不同人）、受每季上限限制；回新狀態與待播資料，不符資格回 null */
export function queueVictoryChat(
    lines: FunStageLines, state: Readonly<FunState>, candidates: readonly VictoryCandidate[], info: VictoryBattleInfo, seed: string,
): FunState | null {
    const vc = state.victoryChat;
    const sameSeason = vc.dayNo === info.seasonNo;
    const used = sameSeason ? vc.dayCount : 0;
    if (used >= lines.victory.maxPerSeason) return null;
    const pool = candidates.filter((c) => canStageSpeak(c));
    if (pool.length === 0) return null;
    const exclude = pool.length > 1 && vc.lastTalkerId ? [vc.lastTalkerId] : [];
    const weighted = pool.map((c) => ({ id: c.id, weight: c.highlight ? lines.victory.highlightWeight : 1 }));
    const talker = funPickWeighted(weighted, seed, `fun03|${info.seasonNo}|${used}|${vc.lastTalkerId}`, exclude);
    if (!talker) return null;
    return {
        ...state,
        victoryChat: {
            lastTalkerId: talker.id,
            dayNo: info.seasonNo,
            dayCount: used + 1,
            pending: { talkerId: talker.id, resultBand: info.resultBand, seasonNo: info.seasonNo },
        },
    };
}

export interface VictoryChatResult {
    talkerId: string;
    text: string;
    osText: string;
    templateId: string;
}

/** 依戰況與說話者的性格、性別挑一句；缺該戰況的句子就退用相鄰戰況，仍沒有就回 null（不畫對話框） */
export function victoryChatLine(
    lines: FunStageLines, talker: StageGeneral, pending: Readonly<FunPendingVictoryChat>, env: StageRenderEnv, seed: string,
): VictoryChatResult | null {
    const trait = stageTraitOf(talker);
    const order: VictoryTemplate['resultBand'][] = pending.resultBand === 'bigWin' ? ['bigWin', 'win', 'closeWin']
        : pending.resultBand === 'closeWin' ? ['closeWin', 'win', 'bigWin'] : ['win', 'bigWin', 'closeWin'];
    for (const band of order) {
        const pool = lines.victory.templates.filter((t) => t.resultBand === band && funMatchesVoice(t, talker.gender, trait));
        const tried: string[] = [];
        for (let i = 0; i < pool.length; i += 1) {
            const t = funPickWeighted(pool.map((p) => ({ id: p.id, weight: p.weight })), seed, `fun03|${talker.id}|${pending.seasonNo}`, tried);
            if (!t) break;
            const tpl = pool.find((p) => p.id === t.id)!;
            const text = renderLine(tpl.textKey, talker, env);
            if (text !== null) return { talkerId: talker.id, text, osText: tpl.osKey ? renderLine(tpl.osKey, talker, env) ?? '' : '', templateId: tpl.id };
            tried.push(t.id);
        }
    }
    return null;
}

export function victoryGrantKey(lines: FunStageLines, generalId: string, seasonNo: number, n: number): string {
    return lines.victory.grantKeyFmt.split('{generalId}').join(generalId).split('{seasonNo}').join(String(seasonNo)).split('{n}').join(String(n));
}

export function clearVictoryPending(state: Readonly<FunState>): FunState {
    return { ...state, victoryChat: { ...state.victoryChat, pending: null } };
}

/** 戰況帶：全員平均血量比例高 ＝ 大勝；有人逼近倒下 ＝ 險勝；其餘平穩勝（沒帶血量資料就算平穩勝） */
export function victoryBandOf(hpRatios: readonly number[]): FunPendingVictoryChat['resultBand'] {
    if (hpRatios.length === 0) return 'win';
    const avg = hpRatios.reduce((a, b) => a + b, 0) / hpRatios.length;
    const min = Math.min(...hpRatios);
    if (min < 0.3) return 'closeWin';
    if (avg >= 0.8) return 'bigWin';
    return 'win';
}

// ── 全域資料表（開機載入一次；戰後結算在戰場端也要用，所以放這裡而不是畫面層）────────────────

let _stageLines: FunStageLines | null = null;

export function setStageLines(lines: FunStageLines | null): void {
    _stageLines = lines;
}

export function getStageLines(): FunStageLines | null {
    return _stageLines;
}
