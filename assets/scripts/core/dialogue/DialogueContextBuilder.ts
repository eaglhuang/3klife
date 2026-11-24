// @spec-source → NPC人性化規格書 doc_spec_0176、武將台詞系統（PROG-2-9964）
/**
 * DialogueContextBuilder — 把「武將、說話對象、情境」推導成完整的中台 v2 台詞請求（純邏輯，不依賴 cc）。
 *
 * 規則（全部在 data/dialogue-mood-rules.json，程式不寫死）：
 *   心情 mood（10 種）＝ 武將自身心情 MindMood × 對「說話對象」的好感度分段 relationBucket × 情境 contextKey。
 *   推導順序：情境覆寫表 → 近期友誼事件餘溫（只對沒有覆寫的日常情境）→ 預設矩陣；最後套吃醋規則（旁觀者）。
 *   relationBucket：對玩家用玩家友誼；對其他武將用武將配對友誼。
 *   worldPhase：由各勢力領地占比推導。
 * 硬規則：任何一項推不出來（缺性格、缺心情、缺天下大勢、情境未登錄、場景不合）就回報缺什麼，不送請求、不硬湊。
 *
 * Unity 對照：像一個 RequestFactory.Build(ctx)，回傳 Result<Request, Missing[]>。
 */
import type { NpcDialogueRequest } from '../services/NpcDialogueService';

export const DIALOGUE_MOOD_RULES_JSON = 'data/dialogue-mood-rules';

export const DIALOGUE_MOODS = ['joy', 'anger', 'sorrow', 'fear', 'pride', 'calm', 'shy', 'jealous', 'grateful', 'wronged'] as const;
export type DialogueMood = typeof DIALOGUE_MOODS[number];
export const DIALOGUE_PERSONALITIES = ['Loyal', 'Brave', 'Wise', 'Playful'] as const;
export type DialoguePersonality = typeof DIALOGUE_PERSONALITIES[number];
export const DIALOGUE_WORLD_PHASES = ['unification', 'tripartite', 'crisis', 'chaos'] as const;
export type DialogueWorldPhase = typeof DIALOGUE_WORLD_PHASES[number];
export const DIALOGUE_SCENES = ['battlefield', 'court', 'camp', 'lobby', 'private'] as const;
export type DialogueScene = typeof DIALOGUE_SCENES[number];
export const DIALOGUE_INTERACTION_TYPES = [
    'greeting', 'daily_chat', 'battle_start', 'battle_victory', 'battle_defeat', 'gift', 'order', 'encounter', 'meeting',
    'memory_recall', 'keyword_topic', 'praised', 'rejected', 'request_reward', 'gift_received', 'farewell', 'comfort', 'other',
] as const;
export type MindMoodName = 'EAGER' | 'HIGH' | 'NORMAL' | 'LOW';
type Band = 'low' | 'mid' | 'high';

export interface MoodAdjust { mindMoods: MindMoodName[]; bands: Band[]; mood: DialogueMood }
export interface MoodOverrideRow { contexts: string[]; low: DialogueMood; mid: DialogueMood; high: DialogueMood; adjust: MoodAdjust[] }
export interface DialogueContextDef { interactionType: string; scenes: DialogueScene[]; requiresEventId?: boolean; avatarTalk?: boolean }

export interface DialogueRulesConfig {
    bucketMaxScores: number[];
    bands: Record<Band, number[]>;
    defaultMatrix: Record<MindMoodName, DialogueMood[]>;
    contextOverrides: MoodOverrideRow[];
    recentEvents: { withinSeasons: number; rules: Array<{ actionIds: string[]; mood: DialogueMood }> };
    jealousy: { contexts: string[]; minBucket: number; calmWhenWitnessBucketAtLeast: number; calmMood: DialogueMood };
    worldPhase: { unificationShare: number; tripartiteTopShare: number; tripartiteTopSum: number; crisisRivalShare: number; crisisRivalRatio: number };
    actionContexts: Record<string, string>;
    reaction: { burstWindowMs: number; maxPerBurst: number; minIntervalMs: number; sceneOverrides?: Record<string, string> };
    cache: { linesPerKey: number; failureCooldownMs: number };
    contexts: Record<string, DialogueContextDef>;
}

const isMood = (v: unknown): v is DialogueMood => (DIALOGUE_MOODS as readonly string[]).includes(v as string);

/** 載入並檢查規則檔；壞資料回 null（呼叫端視為未載入，不送請求）。 */
export function normalizeDialogueRules(raw: unknown): DialogueRulesConfig | null {
    const src = raw as Partial<DialogueRulesConfig> | null;
    if (!src || typeof src !== 'object') return null;
    if (!Array.isArray(src.bucketMaxScores) || src.bucketMaxScores.length !== 4 || !src.bands || !src.defaultMatrix || !src.contexts) return null;
    for (const mm of ['EAGER', 'HIGH', 'NORMAL', 'LOW'] as const) {
        const row = src.defaultMatrix[mm];
        if (!Array.isArray(row) || row.length !== 5 || !row.every(isMood)) return null;
    }
    const rows = (src.contextOverrides ?? []).filter((r) => r && Array.isArray(r.contexts) && isMood(r.low) && isMood(r.mid) && isMood(r.high));
    return {
        bucketMaxScores: src.bucketMaxScores, bands: src.bands as DialogueRulesConfig['bands'], defaultMatrix: src.defaultMatrix as DialogueRulesConfig['defaultMatrix'],
        contextOverrides: rows.map((r) => ({ ...r, adjust: (r.adjust ?? []).filter((a) => isMood(a.mood)) })),
        recentEvents: { withinSeasons: src.recentEvents?.withinSeasons ?? 2, rules: (src.recentEvents?.rules ?? []).filter((r) => isMood(r.mood)) },
        jealousy: src.jealousy ?? { contexts: [], minBucket: 3, calmWhenWitnessBucketAtLeast: 3, calmMood: 'joy' },
        worldPhase: src.worldPhase as DialogueRulesConfig['worldPhase'],
        actionContexts: src.actionContexts ?? {},
        reaction: src.reaction ?? { burstWindowMs: 1500, maxPerBurst: 1, minIntervalMs: 8000 },
        cache: src.cache ?? { linesPerKey: 3, failureCooldownMs: 60000 },
        contexts: src.contexts as Record<string, DialogueContextDef>,
    };
}

/** 好感度（−100～100）換 relationBucket 0～4：≤−60→0、−59～−20→1、−19～19→2、20～59→3、≥60→4（門檻在規則檔） */
export function relationBucketOf(score: number, rules: Pick<DialogueRulesConfig, 'bucketMaxScores'>): number {
    const max = rules.bucketMaxScores;
    for (let i = 0; i < max.length; i++) if (score <= max[i]) return i;
    return max.length;
}

function bandOfBucket(bucket: number, rules: Pick<DialogueRulesConfig, 'bands'>): Band {
    if (rules.bands.low.includes(bucket)) return 'low';
    if (rules.bands.high.includes(bucket)) return 'high';
    return 'mid';
}

export interface WorldHolder { id: string; territories: number }

/**
 * 天下大勢：unification 一強獨大；tripartite 前三強各有分量且合占大半；crisis 最強對手遠勝玩家；其餘 chaos。
 * 沒有任何領地資料回 null（呼叫端要回報缺 worldPhase）。
 */
export function worldPhaseOf(holders: readonly WorldHolder[] | undefined, playerId: string, rules: Pick<DialogueRulesConfig, 'worldPhase'>): DialogueWorldPhase | null {
    const live = (holders ?? []).filter((h) => h.territories > 0);
    const total = live.reduce((s, h) => s + h.territories, 0);
    if (total <= 0) return null;
    const cfg = rules.worldPhase;
    const sorted = [...live].sort((a, b) => b.territories - a.territories);
    if (sorted[0].territories / total >= cfg.unificationShare) return 'unification';
    const top3 = sorted.slice(0, 3);
    if (top3.length === 3 && top3.every((h) => h.territories / total >= cfg.tripartiteTopShare) && top3.reduce((s, h) => s + h.territories, 0) / total >= cfg.tripartiteTopSum) return 'tripartite';
    const player = live.find((h) => h.id === playerId)?.territories ?? 0;
    const rival = sorted.find((h) => h.id !== playerId);
    if (rival && rival.territories / total >= cfg.crisisRivalShare && rival.territories >= Math.max(1, player) * cfg.crisisRivalRatio) return 'crisis';
    return 'chaos';
}

export interface MoodInput {
    mindMood: MindMoodName;
    bucket: number;
    contextKey: string;
    /** 近期（窗內）對該對象最新的友誼事件 actionId；沒有就不傳 */
    recentActionId?: string | null;
    /** 旁觀者情境：玩家對別的武將示好；witnessBucket＝說話者對那位武將的 bucket */
    witness?: { witnessBucket: number };
}

/** 心情推導（純函式）。 */
export function deriveMood(input: MoodInput, rules: DialogueRulesConfig): DialogueMood {
    const { mindMood, bucket, contextKey } = input;
    const band = bandOfBucket(bucket, rules);
    let mood: DialogueMood | null = null;
    const row = rules.contextOverrides.find((r) => r.contexts.includes(contextKey));
    if (row) {
        mood = row[band];
        const hit = row.adjust.find((a) => a.mindMoods.includes(mindMood) && a.bands.includes(band));
        if (hit) mood = hit.mood;
    } else {
        const recent = input.recentActionId ? rules.recentEvents.rules.find((r) => r.actionIds.includes(input.recentActionId as string)) : undefined;
        mood = recent ? recent.mood : rules.defaultMatrix[mindMood][Math.max(0, Math.min(4, bucket))];
    }
    const j = rules.jealousy;
    if (input.witness && j.contexts.includes(contextKey) && bucket >= j.minBucket) {
        mood = input.witness.witnessBucket >= j.calmWhenWitnessBucketAtLeast ? j.calmMood : 'jealous';
    }
    return mood;
}

export type DialogueTarget = { kind: 'player' } | { kind: 'general'; id: string; name?: string };

/** 遊戲狀態來源（由 GameSession 轉接；測試用替身）。回 undefined 代表「查不到」，會被當成缺欄位。 */
export interface DialogueStateSource {
    personalityOf(generalId: string): string | undefined;
    mindMoodOf(generalId: string): string | undefined;
    /** 說話者對對象的好感度（−100～100） */
    friendshipOf(generalId: string, target: DialogueTarget): number | undefined;
    worldHolders(): readonly WorldHolder[] | undefined;
    playerHolderId(): string;
    /** 近期友誼事件 actionId（沒有回 null） */
    recentActionOf(generalId: string, target: DialogueTarget, withinSeasons: number): string | null;
}

export interface DialogueBuildInput {
    generalId: string;
    target?: DialogueTarget;
    contextKey: string;
    eventId?: string;
    scene?: string;
    keywordKeys?: string[];
    /** 旁觀吃醋：玩家剛對這位武將示好，說話者是旁觀者 */
    witnessRecipientId?: string;
    maxChars?: number;
    saveId?: string;
}

export interface DialogueBuildOk {
    ok: true;
    request: NpcDialogueRequest;
    /** 本機快取鍵（含所有分桶參數與對象） */
    cacheKey: string;
    mood: DialogueMood;
    relationBucket: number;
}
export interface DialogueBuildFail { ok: false; missing: string[]; invalid: string[] }
export type DialogueBuildResult = DialogueBuildOk | DialogueBuildFail;

export function dialogueCacheKey(r: { generalId: string; contextKey: string; eventId?: string; mood: string; relationBucket: number; worldPhase: string; scene: string; interactionType: string; target: DialogueTarget }): string {
    const t = r.target.kind === 'general' ? `g:${r.target.id}` : 'player';
    return [r.generalId, r.contextKey, r.eventId ?? '', r.mood, r.relationBucket, r.worldPhase, r.scene, r.interactionType, t].join('|');
}

export function buildDialogueRequest(input: DialogueBuildInput, source: DialogueStateSource, rules: DialogueRulesConfig | null): DialogueBuildResult {
    const missing: string[] = [];
    const invalid: string[] = [];
    if (!rules) return { ok: false, missing: ['rules'], invalid };
    const target: DialogueTarget = input.target ?? { kind: 'player' };
    const def = rules.contexts[input.contextKey];
    if (!input.generalId) missing.push('generalId');
    if (!input.contextKey) missing.push('contextKey');
    else if (!def) invalid.push('contextKey');
    if (target.kind === 'general' && !target.id) missing.push('interaction.targetId');
    if (def?.requiresEventId && !input.eventId) missing.push('interaction.eventId');

    const personality = source.personalityOf(input.generalId);
    if (!personality) missing.push('personality');
    else if (!(DIALOGUE_PERSONALITIES as readonly string[]).includes(personality)) invalid.push('personality');
    const mind = source.mindMoodOf(input.generalId);
    if (!mind) missing.push('mood');
    else if (!(['EAGER', 'HIGH', 'NORMAL', 'LOW'] as string[]).includes(mind)) invalid.push('mood');
    const score = source.friendshipOf(input.generalId, target);
    if (score === undefined || !Number.isFinite(score)) missing.push('relationBucket');
    const phase = worldPhaseOf(source.worldHolders(), source.playerHolderId(), rules);
    if (!phase) missing.push('worldPhase');

    let scene = input.scene ?? def?.scenes[0];
    if (!scene) missing.push('scene');
    else if (def && !def.scenes.includes(scene as DialogueScene)) invalid.push('scene');

    let witness: MoodInput['witness'];
    if (input.witnessRecipientId) {
        const ws = source.friendshipOf(input.generalId, { kind: 'general', id: input.witnessRecipientId });
        if (ws === undefined || !Number.isFinite(ws)) missing.push('witnessBucket');
        else witness = { witnessBucket: relationBucketOf(ws, rules) };
    }
    if (missing.length || invalid.length || !def || score === undefined || !phase || !scene) return { ok: false, missing, invalid };

    const bucket = relationBucketOf(score, rules);
    const mood = deriveMood({
        mindMood: mind as MindMoodName, bucket, contextKey: input.contextKey, witness,
        recentActionId: source.recentActionOf(input.generalId, target, rules.recentEvents.withinSeasons),
    }, rules);
    const interaction: Record<string, unknown> = { type: def.interactionType, targetKind: target.kind };
    if (input.eventId) interaction.eventId = input.eventId;
    if (target.kind === 'general') { interaction.targetId = target.id; if (target.name) interaction.targetName = target.name; }
    if (input.keywordKeys?.length) interaction.keywordKeys = input.keywordKeys;
    const request: NpcDialogueRequest = {
        generalId: input.generalId,
        contextKey: input.contextKey,
        selectedKeywordKeys: input.keywordKeys ?? [],
        speechContextMode: scene === 'battlefield' ? 'encounter_speech' : 'life_chat',
        maxChars: input.maxChars ?? 80,
        ...(input.saveId ? { saveId: input.saveId } : {}),
        schemaVersion: 2,
        personality: personality as string,
        mood,
        relationBucket: bucket,
        worldPhase: phase,
        scene,
        interaction,
    };
    const cacheKey = dialogueCacheKey({ generalId: input.generalId, contextKey: input.contextKey, eventId: input.eventId, mood, relationBucket: bucket, worldPhase: phase, scene, interactionType: def.interactionType, target });
    return { ok: true, request, cacheKey, mood, relationBucket: bucket };
}

/** 近期友誼事件記錄（記憶體；只留最近幾筆）：給「情緒餘溫」查詢。對象 key：玩家 'player'、武將 'g:<id>'。 */
export class DialogueEventLog {
    private _items: Array<{ generalId: string; targetKey: string; actionId: string; season: number }> = [];
    constructor(private readonly _limit = 200) {}

    public record(generalId: string, target: DialogueTarget, actionId: string, season: number): void {
        this._items.push({ generalId, targetKey: target.kind === 'general' ? `g:${target.id}` : 'player', actionId, season });
        if (this._items.length > this._limit) this._items.splice(0, this._items.length - this._limit);
    }

    public latest(generalId: string, target: DialogueTarget, nowSeason: number, withinSeasons: number): string | null {
        const key = target.kind === 'general' ? `g:${target.id}` : 'player';
        for (let i = this._items.length - 1; i >= 0; i--) {
            const it = this._items[i];
            if (it.generalId === generalId && it.targetKey === key && nowSeason - it.season <= withinSeasons) return it.actionId;
        }
        return null;
    }
}
