// @spec-source → 英靈世家系統.md §A-6 / §I-3 第 9 點 / §J 第 9 點；Data Schema 2-1 第 4a 點（Spirit_Archive_Snapshot）；PROG-2-0313（WBS SPI-03）
/**
 * SpiritArchiveSnapshot — 英靈死亡快照（純邏輯，不依賴 cc）
 *
 * 武將死亡時保存「當年強在哪裡」：英勇事蹟、最終屬性、最終技能、裝備與戰報參照，
 * 供英靈陳列室的展示列與詳情頁讀取。快照只讀、不回寫遊戲數值。
 *
 * 規格未定的部分採暫定預設（見 PROG-2-0313 任務卡）：
 *   - Spirit_ID 沿用魂卡 uid，不另開 id 體系
 *   - Display_Weight = 最終五圍合計 + 功勳，只作預設排序
 *   - 武將模型目前沒有裝備欄位，裝備快照暫為空陣列
 *
 * Unity 對照：類似死亡時把角色的 Stats / Skills 序列化成一份唯讀的 ScriptableObject，
 * 之後 UI 只拿來顯示，不會再改它。
 */
import { BATTLE_MILESTONES, BattleRecordLike, milestoneDisplayName } from './BattleRecordStats';

export interface SpiritSnapshotStats {
    str: number;
    int: number;
    lea: number;
    pol: number;
    luk: number;
}

/** Spirit_Archive_Snapshot 欄位（與 Data Schema 2-1 第 4a 點一致） */
export interface SpiritArchiveSnapshot {
    Spirit_ID: string;
    Death_Season: number;
    Heroic_Deeds_Summary: string[];
    Final_Stats_Snapshot: SpiritSnapshotStats;
    Final_Skills_Snapshot: string[];
    Final_Equipment_Snapshot: string[];
    Battle_Record_Ref: string;
    Legacy_Quote: string;
    Display_Weight: number;
}

/** 建立快照時讀取的武將欄位（只取需要的，避免綁死整個 GeneralUnit） */
export interface SpiritSnapshotSource {
    id: string;
    str?: number;
    int?: number;
    lea?: number;
    pol?: number;
    luk?: number;
    skillId?: string;
    battlePrimarySkillId?: string;
    introLine?: string;
    /** 目前武將模型沒有此欄位；若未來補上裝備清單，會直接帶入快照 */
    equipment?: string[];
    battleRecord?: BattleRecordLike;
}

export interface SpiritSnapshotContext {
    /** 死亡季（DeathContext.season） */
    season: number;
}

/** 戰報參照：L5 歸檔層中該武將完整資料的位置 */
export const ARCHIVE_L5_REF_PREFIX = 'generals_archive_l5:';

function finiteOrZero(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values) {
        if (!value || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
    }
    return out;
}

/** 英勇事蹟摘要：戰績有場次才列出，里程碑依 BATTLE_MILESTONES 順序顯示中文名 */
export function summarizeHeroicDeeds(record: BattleRecordLike | undefined): string[] {
    if (!record) return [];
    const lines: string[] = [];
    const battles = finiteOrZero(record.wins) + finiteOrZero(record.losses) + finiteOrZero(record.draws);
    if (battles > 0) {
        lines.push(`出征 ${battles} 場：勝 ${finiteOrZero(record.wins)} / 負 ${finiteOrZero(record.losses)}`);
    }
    if (finiteOrZero(record.kills) > 0) lines.push(`擊殺敵軍 ${finiteOrZero(record.kills)}`);
    if (finiteOrZero(record.merit) > 0) lines.push(`功勳 ${finiteOrZero(record.merit)}`);
    const reached = new Set(record.milestones ?? []);
    for (const milestone of BATTLE_MILESTONES) {
        if (reached.has(milestone.id)) lines.push(`里程碑：${milestoneDisplayName(milestone.id)}`);
    }
    return lines;
}

/** 技能快照：主技能與戰鬥主技能去重，缺值略過 */
export function snapshotSkills(general: SpiritSnapshotSource): string[] {
    return uniqueNonEmpty([general.skillId, general.battlePrimarySkillId]);
}

/** 展示權重（暫定）：最終五圍合計 + 功勳，越強越靠前 */
export function computeDisplayWeight(stats: SpiritSnapshotStats, record: BattleRecordLike | undefined): number {
    const statTotal = stats.str + stats.int + stats.lea + stats.pol + stats.luk;
    return statTotal + finiteOrZero(record?.merit);
}

/** 建立一筆英靈死亡快照。缺的欄位給安全預設，不丟錯。 */
export function buildSpiritArchiveSnapshot(
    general: SpiritSnapshotSource,
    context: SpiritSnapshotContext,
): SpiritArchiveSnapshot {
    const stats: SpiritSnapshotStats = {
        str: finiteOrZero(general.str),
        int: finiteOrZero(general.int),
        lea: finiteOrZero(general.lea),
        pol: finiteOrZero(general.pol),
        luk: finiteOrZero(general.luk),
    };
    return {
        Spirit_ID: general.id,
        Death_Season: context.season,
        Heroic_Deeds_Summary: summarizeHeroicDeeds(general.battleRecord),
        Final_Stats_Snapshot: stats,
        Final_Skills_Snapshot: snapshotSkills(general),
        Final_Equipment_Snapshot: [...(general.equipment ?? [])],
        Battle_Record_Ref: `${ARCHIVE_L5_REF_PREFIX}${general.id}`,
        Legacy_Quote: general.introLine ?? '',
        Display_Weight: computeDisplayWeight(stats, general.battleRecord),
    };
}

/**
 * 快照完整度（0~1）：英勇事蹟、屬性、技能三項中有內容的比例。
 * 展示列同權重時用來決定先後（規格 §I-3 / 陳列室第 6 點）。
 */
export function snapshotCompleteness(snapshot: SpiritArchiveSnapshot): number {
    const { Final_Stats_Snapshot: stats } = snapshot;
    const hasStats = stats.str + stats.int + stats.lea + stats.pol + stats.luk > 0;
    const filled = [
        snapshot.Heroic_Deeds_Summary.length > 0,
        hasStats,
        snapshot.Final_Skills_Snapshot.length > 0,
    ].filter(Boolean).length;
    return filled / 3;
}

/**
 * 陳列室預設排序（規格 Data Schema 4c）：Display_Weight DESC, Death_Season DESC, Spirit_ID ASC。
 * 權重相同時再以完整度 DESC 補強（規格 §I-3 第 6 點）。回傳新陣列，不改原陣列。
 */
export function sortSnapshotsForDisplay(snapshots: readonly SpiritArchiveSnapshot[]): SpiritArchiveSnapshot[] {
    return [...snapshots].sort((a, b) =>
        (b.Display_Weight - a.Display_Weight)
        || (b.Death_Season - a.Death_Season)
        || (snapshotCompleteness(b) - snapshotCompleteness(a))
        || (a.Spirit_ID < b.Spirit_ID ? -1 : a.Spirit_ID > b.Spirit_ID ? 1 : 0));
}
