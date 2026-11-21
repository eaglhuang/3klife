// @spec-source → 劇情（演出）系統 Base 框架規格書 (doc_spec_1188) §2 演出佇列／已看紀錄／旗標、§3.5；共用框架總綱 (doc_spec_1182) §5.5 權威；PROG-2-9208
/**
 * StoryRules — 劇情狀態（中繼資料）與純規則（零依賴）。
 *
 * 狀態 StoryMeta 由權威端保存並隨存檔持久化：旗標、已看紀錄、等待選擇中的劇本（打斷佇列）、已完成實例紀錄（冪等）。
 * 打斷佇列只有一條單一優先序：必中斷者先、同組內 priority 大者先、同優先依觸發先後。
 * 佇列裡的劇本帶著自己停住的節點，被更優先的劇本插隊後處理完，會回到原來的節點繼續。
 */
import type { StoryCue } from './StoryConfig';

/** 已完成實例保留上限；超過丟最舊的（冪等只保證這個視窗內） */
export const STORY_DONE_LIMIT = 200;

/** 等待玩家選擇的劇本實例 */
export interface StoryInstance {
    /** `${storyId}:${refId}`；同一個實例重複 trigger 回原狀態 */
    instanceId: string;
    storyId: string;
    refId: string;
    /** 觸發序號（單調遞增），同優先時先觸發者先 */
    seq: number;
    priority: number;
    interrupt: boolean;
    /** 停住的選擇節點 id（＝choiceId） */
    nodeId: string;
    /** 宿主帶入的選項 id（hostOptions 節點用） */
    hostOptions: string[];
    /** 目前這一段累積、尚未被客戶端播放完的演出指令（重開自愈：重進後重新彈出） */
    cues: StoryCue[];
    /** 已做過的選擇：choiceId → optionId */
    choices: Record<string, string>;
}

export interface StoryDoneRecord {
    instanceId: string;
    storyId: string;
    choices: Record<string, string>;
    /** 完成當下回給客戶端的結果（重送回原結果用） */
    result: Record<string, unknown>;
}

export interface StorySeenRecord {
    /** 最後一次完成的時間（毫秒） */
    at: number;
    count: number;
    /** 最後一次實例的最後一個選項 id；沒有選項為 null */
    choice: string | null;
}

export interface StoryMeta {
    v: 1;
    seq: number;
    flags: Record<string, boolean>;
    seen: Record<string, StorySeenRecord>;
    queue: StoryInstance[];
    done: StoryDoneRecord[];
}

export function emptyStoryMeta(): StoryMeta {
    return { v: 1, seq: 0, flags: {}, seen: {}, queue: [], done: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strMap(value: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    if (isRecord(value)) {
        for (const [k, v] of Object.entries(value)) {
            if (typeof v === 'string') out[k] = v;
        }
    }
    return out;
}

function normalizeInstance(raw: unknown): StoryInstance | null {
    if (!isRecord(raw)) return null;
    const { instanceId, storyId, refId, nodeId } = raw;
    if (typeof instanceId !== 'string' || typeof storyId !== 'string' || typeof refId !== 'string' || typeof nodeId !== 'string') return null;
    const seq = typeof raw.seq === 'number' && Number.isInteger(raw.seq) && raw.seq >= 0 ? raw.seq : 0;
    const priority = typeof raw.priority === 'number' && Number.isFinite(raw.priority) ? raw.priority : 0;
    const cues = Array.isArray(raw.cues) ? raw.cues.filter((c): c is StoryCue => isRecord(c) && typeof c.cue === 'string') : [];
    const hostOptions = Array.isArray(raw.hostOptions) ? raw.hostOptions.filter((o): o is string => typeof o === 'string') : [];
    return {
        instanceId, storyId, refId, seq, priority, interrupt: raw.interrupt === true, nodeId,
        hostOptions, cues: cues.map((c) => ({ ...c })), choices: strMap(raw.choices),
    };
}

export function normalizeStoryMeta(raw: unknown): StoryMeta {
    if (!isRecord(raw)) return emptyStoryMeta();
    const flags: Record<string, boolean> = {};
    if (isRecord(raw.flags)) {
        for (const [k, v] of Object.entries(raw.flags)) {
            if (typeof v === 'boolean') flags[k] = v;
        }
    }
    const seen: Record<string, StorySeenRecord> = {};
    if (isRecord(raw.seen)) {
        for (const [k, v] of Object.entries(raw.seen)) {
            if (!isRecord(v)) continue;
            seen[k] = {
                at: typeof v.at === 'number' && Number.isFinite(v.at) ? v.at : 0,
                count: typeof v.count === 'number' && Number.isInteger(v.count) && v.count >= 1 ? v.count : 1,
                choice: typeof v.choice === 'string' ? v.choice : null,
            };
        }
    }
    const queue: StoryInstance[] = [];
    for (const q of Array.isArray(raw.queue) ? raw.queue : []) {
        const inst = normalizeInstance(q);
        if (inst) queue.push(inst);
    }
    const done: StoryDoneRecord[] = [];
    for (const d of Array.isArray(raw.done) ? raw.done : []) {
        if (!isRecord(d) || typeof d.instanceId !== 'string' || typeof d.storyId !== 'string' || !isRecord(d.result)) continue;
        done.push({ instanceId: d.instanceId, storyId: d.storyId, choices: strMap(d.choices), result: d.result });
    }
    const maxSeq = queue.reduce((m, q) => Math.max(m, q.seq), 0);
    const seq = typeof raw.seq === 'number' && Number.isInteger(raw.seq) && raw.seq >= 0 ? raw.seq : maxSeq;
    return { v: 1, seq: Math.max(seq, maxSeq), flags, seen, queue, done: done.slice(-STORY_DONE_LIMIT) };
}

/** 空白中繼資料不必寫進存檔（舊檔相容、存檔瘦身） */
export function isEmptyStoryMeta(meta: StoryMeta): boolean {
    return meta.seq === 0 && meta.queue.length === 0 && meta.done.length === 0
        && Object.keys(meta.flags).length === 0 && Object.keys(meta.seen).length === 0;
}

/** 單一優先序：必中斷先、priority 大者先、同優先先觸發者先 */
export function compareInstances(a: StoryInstance, b: StoryInstance): number {
    if (a.interrupt !== b.interrupt) return a.interrupt ? -1 : 1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.seq - b.seq;
}

/** 依優先序排好的佇列（不改原陣列）；第 0 個就是目前該處理的劇本 */
export function orderedQueue(queue: readonly StoryInstance[]): StoryInstance[] {
    return [...queue].sort(compareInstances);
}

export function instanceIdOf(storyId: string, refId: string): string {
    return `${storyId}:${refId}`;
}

/** story.seen 條件用的旗標名：條件語言寫 { "kind":"flag","key":"story.seen.<id>" } */
export const STORY_SEEN_FLAG_PREFIX = 'story.seen.';

/** 條件事實查詢用的旗標值：先看明確寫入的旗標，再看已看紀錄 */
export function flagValue(meta: StoryMeta, key: string): boolean {
    if (key.indexOf(STORY_SEEN_FLAG_PREFIX) === 0) {
        return meta.seen[key.slice(STORY_SEEN_FLAG_PREFIX.length)] !== undefined;
    }
    return meta.flags[key] === true;
}
