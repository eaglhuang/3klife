// @spec-source → 任務系統 Base 框架規格書 (doc_spec_1185) §3.1 quest-def.v1；PROG-2-9209
/**
 * QuestConfig — 任務定義設定（quest-config.v1）的正規化與查詢（零依賴純函式）。
 *
 * 讀入 JSON 時任何形狀不對都不丟錯：壞的定義整筆丟掉、缺值補預設，回傳可用的（可能是空的）設定。
 */
import type { Condition } from '../foundation/Condition';
import {
    DEFAULT_GATE_BLOCKS, QUEST_CONFIG_SCHEMA, QUEST_TIERS,
    type QuestConfigV1, type QuestDef, type QuestGateDef, type QuestOutcomeDef, type QuestSolver, type QuestTier,
} from './QuestTypes';

export const DEFAULT_QUEST_CONFIG: QuestConfigV1 = Object.freeze({ schema: QUEST_CONFIG_SCHEMA, defs: [] });

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function posInt(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

function normalizeGate(raw: unknown, total: number): QuestGateDef | null {
    if (!isRecord(raw)) return null;
    const id = str(raw.id);
    const at = posInt(raw.at);
    if (!id || at === null || at > total) return null;
    const blocks = Array.isArray(raw.blocks)
        ? raw.blocks.filter((b): b is string => typeof b === 'string' && b.length > 0)
        : [...DEFAULT_GATE_BLOCKS];
    return { id, at, blocks, clearWhen: isRecord(raw.clearWhen) ? (raw.clearWhen as unknown as Condition) : null };
}

function normalizeOutcome(raw: unknown): Record<QuestTier, QuestOutcomeDef> {
    const src = isRecord(raw) ? raw : {};
    const out = {} as Record<QuestTier, QuestOutcomeDef>;
    for (const tier of QUEST_TIERS) {
        const entry = src[tier];
        out[tier] = { reward: isRecord(entry) ? str(entry.reward) : null };
    }
    return out;
}

function normalizeDef(raw: unknown): QuestDef | null {
    if (!isRecord(raw)) return null;
    const id = str(raw.id);
    const taskKind = str(raw.taskKind);
    const total = posInt(raw.steps);
    if (!id || !taskKind || total === null) return null;
    const solver: QuestSolver = raw.solver === 'progress' ? 'progress' : 'steps';
    const actors = isRecord(raw.actors) ? raw.actors : {};
    const min = typeof actors.min === 'number' && Number.isInteger(actors.min) && actors.min >= 0 ? actors.min : 1;
    const max = typeof actors.max === 'number' && Number.isInteger(actors.max) && actors.max >= min ? actors.max : Math.max(min, 1);
    const gates: QuestGateDef[] = [];
    for (const g of Array.isArray(raw.gates) ? raw.gates : []) {
        const gate = normalizeGate(g, total);
        if (gate && !gates.some((x) => x.id === gate.id)) gates.push(gate);
    }
    gates.sort((a, b) => a.at - b.at);
    return {
        id, taskKind, solver, steps: total,
        actors: { min, max },
        acceptWhen: isRecord(raw.acceptWhen) ? (raw.acceptWhen as unknown as Condition) : null,
        gates,
        occupancy: str(raw.occupancy),
        countdownSeasons: posInt(raw.countdownSeasons),
        releaseOnPause: raw.releaseOnPause === true,
        outcome: normalizeOutcome(raw.outcome),
    };
}

export function normalizeQuestConfig(raw: unknown): QuestConfigV1 {
    if (!isRecord(raw)) return DEFAULT_QUEST_CONFIG;
    const defs: QuestDef[] = [];
    for (const d of Array.isArray(raw.defs) ? raw.defs : []) {
        const def = normalizeDef(d);
        if (def && !defs.some((x) => x.id === def.id)) defs.push(def);
    }
    return { schema: QUEST_CONFIG_SCHEMA, defs };
}

export function findQuestDef(config: QuestConfigV1, id: string): QuestDef | undefined {
    return config.defs.find((d) => d.id === id);
}

/** 載入後的交叉檢查：定義引用的獎勵套件必須存在。回傳錯誤字串清單（空陣列＝合格），不丟錯 */
export function checkQuestRewards(config: QuestConfigV1, hasBundle: (bundleId: string) => boolean): string[] {
    const errors: string[] = [];
    for (const def of config.defs) {
        for (const tier of QUEST_TIERS) {
            const bundle = def.outcome[tier].reward;
            if (bundle !== null && !hasBundle(bundle)) errors.push(`${def.id}.${tier}: 找不到獎勵套件 ${bundle}`);
        }
    }
    return errors;
}
