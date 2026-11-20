// @spec-source → 劇情（演出）系統 Base 框架規格書 (doc_spec_1188) §3.1 story-def.v1、§3.2 演出指令；共用框架總綱 (doc_spec_1182) §12 STY-M；PROG-2-9208
/**
 * StoryConfig — 劇情內容層的設定型別與正規化（零依賴）。
 *
 * 一份劇本＝節點圖：scene（演出指令序列）、choice（選項）、branch（條件分支）、effects（後果）、end。
 * 歷史、培育、羈絆、任務、傳記劇情都是同一種資料，只差 kind 與觸發條件；新增劇情只加 JSON。
 * 演出指令（cue）只約定「cue 名稱＋自由欄位」：MVP 的 popup／say 之外，立繪、CG、鏡頭、轉場、音效、
 * 漫畫分格都只是新的 cue 名稱與演出模組，不必改這一層（介面可擴充）。文字一律是 i18n key，不內嵌文字。
 * 設定壞掉不丟錯：略過壞的劇本，其餘照常（資料檔可由企劃手改）；缺資料回空字串，不以模板句硬補。
 *
 * Unity 對照：像一組 Timeline／Dialogue Graph 的唯讀資產；本檔只描述資料，播放由客戶端演出層負責。
 */
import type { Condition } from '../foundation/Condition';

/** 演出指令：cue 決定由哪個演出模組播放，其餘欄位由該模組自訂（框架只帶著走） */
export interface StoryCue {
    cue: string;
    [field: string]: unknown;
}

/** 效果：kind 決定由誰套用。內建 reward（走 reward.claim）、flag（寫旗標）；其餘由宿主註冊 handler */
export interface StoryEffectDef {
    kind: string;
    [field: string]: unknown;
}

export interface StoryOptionDef {
    /** 選項 id，就是命令的 selectedOptionId／optionId */
    id: string;
    textKey: string | null;
    /** 選項可選條件；null＝永遠可選 */
    condition: Condition | null;
    next: string;
}

export interface StorySceneNode { type: 'scene'; cues: StoryCue[]; next: string }
export interface StoryChoiceNode {
    type: 'choice';
    options: StoryOptionDef[];
    /** true＝選項 id 由宿主在 trigger 時帶入（例如弱冠禮的三選一戰法，內容由訓練引擎決定），所有選項共用 hostNext */
    hostOptions: boolean;
    hostNext: string | null;
}
export interface StoryBranchNode { type: 'branch'; when: Condition; then: string; else: string }
export interface StoryEffectsNode { type: 'effects'; effects: StoryEffectDef[]; next: string }
export interface StoryEndNode { type: 'end' }
export type StoryNodeDef = StorySceneNode | StoryChoiceNode | StoryBranchNode | StoryEffectsNode | StoryEndNode;

export interface StoryTriggerDef {
    /** 觸發事件名（空字串＝不限）；story.available 用它篩選 */
    event: string;
    /** 觸發條件；null＝無條件 */
    when: Condition | null;
}

export interface StoryDef {
    id: string;
    /** 分類：system／growth／bond／quest／biography／history… 純標籤，不影響邏輯 */
    kind: string;
    trigger: StoryTriggerDef;
    /** 數字越大越先處理 */
    priority: number;
    /** 必中斷：排在所有非中斷劇本之前（例如學府打斷） */
    interrupt: boolean;
    skippable: boolean;
    /** false＝看過就不能再觸發（歷史劇情）；true＝每個 refId 各自一次（學府每次打斷都是新的） */
    repeatable: boolean;
    start: string;
    nodes: Record<string, StoryNodeDef>;
}

export interface StoryConfigV1 {
    schema: 'story-config.v1';
    stories: StoryDef[];
}

export const STORY_CONFIG_JSON = 'data/story-config';
export const DEFAULT_STORY_CONFIG: StoryConfigV1 = Object.freeze({ schema: 'story-config.v1', stories: [] });

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function cond(value: unknown): Condition | null {
    return isRecord(value) ? (value as unknown as Condition) : null;
}

function normalizeEffects(raw: unknown): StoryEffectDef[] | null {
    if (!Array.isArray(raw)) return null;
    const out: StoryEffectDef[] = [];
    for (const e of raw) {
        if (!isRecord(e)) return null;
        const kind = str(e.kind);
        if (!kind) return null;
        if (kind === 'reward' && !str(e.ref)) return null;
        if (kind === 'flag' && !str(e.set)) return null;
        out.push({ ...e, kind });
    }
    return out;
}

function normalizeNode(raw: unknown): StoryNodeDef | null {
    if (!isRecord(raw)) return null;
    switch (raw.type) {
    case 'scene': {
        const next = str(raw.next);
        const cues = Array.isArray(raw.cues) ? raw.cues : null;
        if (!next || !cues || !cues.every((c) => isRecord(c) && str(c.cue))) return null;
        return { type: 'scene', cues: cues.map((c) => ({ ...(c as StoryCue) })), next };
    }
    case 'choice': {
        if (raw.hostOptions === true) {
            const hostNext = str(raw.next);
            return hostNext ? { type: 'choice', options: [], hostOptions: true, hostNext } : null;
        }
        if (!Array.isArray(raw.options) || raw.options.length === 0) return null;
        const seen = new Set<string>();
        const options: StoryOptionDef[] = [];
        for (const o of raw.options) {
            if (!isRecord(o)) return null;
            const id = str(o.id);
            const next = str(o.next);
            if (!id || !next || seen.has(id)) return null;
            seen.add(id);
            options.push({ id, textKey: str(o.textKey), condition: cond(o.condition), next });
        }
        return { type: 'choice', options, hostOptions: false, hostNext: null };
    }
    case 'branch': {
        const when = cond(raw.when);
        const thenId = str(raw.then);
        const elseId = str(raw.else);
        return when && thenId && elseId ? { type: 'branch', when, then: thenId, else: elseId } : null;
    }
    case 'effects': {
        const effects = normalizeEffects(raw.effects);
        const next = str(raw.next);
        return effects && next ? { type: 'effects', effects, next } : null;
    }
    case 'end':
        return { type: 'end' };
    default:
        return null;
    }
}

/** 節點所有指向的節點 id */
export function nodeTargets(node: StoryNodeDef): string[] {
    switch (node.type) {
    case 'scene': case 'effects': return [node.next];
    case 'choice': return node.hostOptions ? (node.hostNext ? [node.hostNext] : []) : node.options.map((o) => o.next);
    case 'branch': return [node.then, node.else];
    default: return [];
    }
}

function normalizeStory(raw: unknown): StoryDef | null {
    if (!isRecord(raw)) return null;
    const id = str(raw.id);
    const start = str(raw.start);
    if (!id || !start || !isRecord(raw.nodes)) return null;
    const nodes: Record<string, StoryNodeDef> = {};
    for (const [nodeId, rawNode] of Object.entries(raw.nodes)) {
        const node = normalizeNode(rawNode);
        if (!node) return null;
        nodes[nodeId] = node;
    }
    if (!nodes[start]) return null;
    // 所有指向都必須存在，壞圖整份丟掉（比執行到一半才發現好）
    for (const node of Object.values(nodes)) {
        if (nodeTargets(node).some((t) => !nodes[t])) return null;
    }
    const trigger = isRecord(raw.trigger) ? raw.trigger : {};
    const priority = typeof raw.priority === 'number' && Number.isFinite(raw.priority) ? raw.priority : 0;
    return {
        id,
        kind: str(raw.kind) ?? 'system',
        trigger: { event: str(trigger.event) ?? '', when: cond(trigger.when) },
        priority,
        interrupt: raw.interrupt === true,
        skippable: raw.skippable !== false,
        repeatable: raw.repeatable === true,
        start,
        nodes,
    };
}

export function normalizeStoryConfig(raw: unknown): StoryConfigV1 {
    if (!isRecord(raw) || !Array.isArray(raw.stories)) return DEFAULT_STORY_CONFIG;
    const seen = new Set<string>();
    const stories: StoryDef[] = [];
    for (const s of raw.stories) {
        const story = normalizeStory(s);
        if (!story || seen.has(story.id)) continue;
        seen.add(story.id);
        stories.push(story);
    }
    return { schema: 'story-config.v1', stories };
}

export function findStory(config: StoryConfigV1, storyId: string): StoryDef | null {
    return config.stories.find((s) => s.id === storyId) ?? null;
}

/**
 * 取劇本第一個 popup 演出指令的文字 key：畫面端只要「這份劇本顯示哪句話」，不必走伺服器。
 * 找不到回 null（呼叫端顯示空字串，不用模板句硬補）。
 */
export function storyPopupOf(config: StoryConfigV1, storyId: string): { titleKey: string | null; textKey: string | null } | null {
    const story = findStory(config, storyId);
    if (!story) return null;
    const visited = new Set<string>();
    let id: string | null = story.start;
    while (id && !visited.has(id)) {
        visited.add(id);
        const node: StoryNodeDef | undefined = story.nodes[id];
        if (!node) return null;
        if (node.type === 'scene') {
            const cue = node.cues.find((c) => c.cue === 'popup');
            if (cue) return { titleKey: str(cue.titleKey), textKey: str(cue.textKey) };
            id = node.next;
        } else if (node.type === 'effects') {
            id = node.next;
        } else {
            return null;
        }
    }
    return null;
}
