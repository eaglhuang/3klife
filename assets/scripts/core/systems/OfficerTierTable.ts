// @spec-source → 官職系統.md（F-2 階位表）；WBS OFC-01
/**
 * OfficerTierTable — 官職階位資料檔的驗證與安裝（純邏輯，不依賴 cc）
 *
 * 遊戲啟動時由 LobbyScene 讀 data/officer-tiers.json，交給這裡驗證；
 * 驗證通過才覆寫 OfficerState 的晉升門檻，失敗則保留內建備援並留下 issues。
 *
 * Unity 對照：像 ScriptableObject 資料表在 Awake 時做 OnValidate，
 * 格式錯就不套用，沿用上一版預設值。
 */
import { OFFICER_TIER_EXP_THRESHOLDS, OFFICER_TIER_MAX, OFFICER_TIER_MIN } from './OfficerState';
import type { QuestDifficultyCap } from './OfficerSnapshot';

export interface OfficerTierRow {
    tier: number;
    code: string;
    title: string;
    expToReach: number;
    questCap: QuestDifficultyCap;
    unlockedFeatures: string[];
}

export type ParseOfficerTierResult =
    | { ok: true; rows: OfficerTierRow[] }
    | { ok: false; issues: string[] };

const QUEST_CAPS: readonly QuestDifficultyCap[] = ['basic', 'normal', 'elite', 'advanced', 'hell'];

/** 驗證資料檔：5 階連續、代碼對上、門檻從 0 起嚴格遞增、任務上限合法、解鎖代碼為字串陣列 */
export function parseOfficerTierTable(raw: unknown): ParseOfficerTierResult {
    const issues: string[] = [];
    const tiers = raw && typeof raw === 'object' ? (raw as { tiers?: unknown }).tiers : undefined;
    if (!Array.isArray(tiers)) {
        return { ok: false, issues: ['缺少 tiers 陣列'] };
    }
    const expectedCount = OFFICER_TIER_MAX - OFFICER_TIER_MIN + 1;
    if (tiers.length !== expectedCount) {
        issues.push(`階位數應為 ${expectedCount}，實際 ${tiers.length}`);
    }
    const rows: OfficerTierRow[] = [];
    let previousExp = -1;
    tiers.forEach((entry, index) => {
        const row = (entry && typeof entry === 'object' ? entry : {}) as Partial<OfficerTierRow>;
        const tier = OFFICER_TIER_MIN + index;
        if (row.tier !== tier) issues.push(`第 ${index + 1} 筆 tier 應為 ${tier}`);
        if (row.code !== `OFFICER_TIER_${tier}`) issues.push(`階位 ${tier} 的 code 應為 OFFICER_TIER_${tier}`);
        if (typeof row.title !== 'string' || row.title.length === 0) issues.push(`階位 ${tier} 缺少 title`);
        if (typeof row.expToReach !== 'number' || !Number.isInteger(row.expToReach) || row.expToReach < 0) {
            issues.push(`階位 ${tier} 的 expToReach 必須是非負整數`);
        } else {
            if (index === 0 && row.expToReach !== 0) issues.push('階位 1 的 expToReach 必須是 0');
            if (index > 0 && row.expToReach <= previousExp) issues.push(`階位 ${tier} 的 expToReach 必須大於前一階`);
            previousExp = row.expToReach;
        }
        if (!QUEST_CAPS.includes(row.questCap as QuestDifficultyCap)) issues.push(`階位 ${tier} 的 questCap 不合法`);
        if (!Array.isArray(row.unlockedFeatures) || row.unlockedFeatures.some((f) => typeof f !== 'string')) {
            issues.push(`階位 ${tier} 的 unlockedFeatures 必須是字串陣列`);
        }
        rows.push({
            tier,
            code: String(row.code),
            title: String(row.title ?? ''),
            expToReach: Number(row.expToReach),
            questCap: row.questCap as QuestDifficultyCap,
            unlockedFeatures: Array.isArray(row.unlockedFeatures) ? row.unlockedFeatures.map(String) : [],
        });
    });
    return issues.length === 0 ? { ok: true, rows } : { ok: false, issues };
}

/** 驗證通過才覆寫晉升門檻；回傳是否套用 */
export function installOfficerTierTable(raw: unknown): ParseOfficerTierResult {
    const result = parseOfficerTierTable(raw);
    if (result.ok) {
        for (const row of result.rows) {
            OFFICER_TIER_EXP_THRESHOLDS[row.tier] = row.expToReach;
        }
    }
    return result;
}
