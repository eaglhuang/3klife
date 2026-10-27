// @spec-source → 官職系統.md (doc_spec_0014) F-2 階位表、H UI_OFFICER_EXP；D-2 rank-progress（PROG-2-1424）
/**
 * RankProgressText — 官職進度開窗的文字（純邏輯，不依賴 cc）
 *
 * 五個階位排成五列：標記（已達成／目前／未達成）、階位名、晉升門檻、主要解鎖。
 * 階位資料來自 officer-tiers.json 解析後的列；未載入時用內建備援（與資料檔一致，取自規格 F-2）。
 * 文案走語系表（ui.officer.rank.* / ui.officer.feature.*）；查不到時退回 zh-TW 預設，與 OfficerPermissionText 相同做法。
 *
 * 暫定（可逆）：解鎖代碼的中文名取自規格 F-2「主要解鎖」欄。
 *
 * Unity 對照：像 ViewModel 把 ScriptableObject 階位表轉成 List<string> 給五個 Text 顯示。
 */
import type { OfficerState } from '../../core/systems/OfficerState';
import type { OfficerTierRow } from '../../core/systems/OfficerTierTable';
import { officerDisplayOf } from '../../core/systems/OfficerDisplay';
import { fillBreedText, type BreedTextLookup } from './BreedingTexts';

/** 開窗固定列數，對應 layout 的 rankRow0~rankRow4 */
export const RANK_PROGRESS_ROW_COUNT = 5;

export type RankRowStatus = 'reached' | 'current' | 'locked';

export interface RankProgressRow {
    tier: number;
    status: RankRowStatus;
    /** 第一行：「▶ 郡守　260 EXP　目前」 */
    headline: string;
    /** 第二行：「解鎖：世界沙盤 S1」 */
    unlockLine: string;
}

export interface RankProgressView {
    title: string;
    expLine: string;
    closeLabel: string;
    rows: RankProgressRow[];
}

type RankTierSource = Pick<OfficerTierRow, 'tier' | 'title' | 'expToReach' | 'unlockedFeatures'>;

/** 資料檔未載入時的備援，與 officer-tiers.json 一致 */
export const RANK_PROGRESS_FALLBACK_TIERS: readonly RankTierSource[] = [
    { tier: 1, title: '鄉里義士', expToReach: 0, unlockedFeatures: ['HALL_BASIC_ENTRY', 'DOMESTIC_WALL_LOW'] },
    { tier: 2, title: '縣府佐官', expToReach: 100, unlockedFeatures: ['BOARD_DOMESTIC_FULL', 'BOARD_MILITARY_FULL'] },
    { tier: 3, title: '郡守', expToReach: 260, unlockedFeatures: ['WORLD_SANDTABLE_S1'] },
    { tier: 4, title: '州牧', expToReach: 520, unlockedFeatures: ['WORLD_SANDTABLE_S2', 'ALLIANCE_DOCS'] },
    { tier: 5, title: '霸府重臣', expToReach: 920, unlockedFeatures: ['WORLD_SANDTABLE_S3', 'ANTI_HEGEMONY_SUMMIT'] },
];

/** zh-TW 預設：語系表未載入或缺 key 時使用 */
export const RANK_PROGRESS_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.officer.rank.title': '官職進度',
    'ui.officer.rank.open': '階位總覽',
    'ui.officer.rank.close': '關閉',
    'ui.officer.rank.row': '{0} {1}　{2}{3}',
    'ui.officer.rank.need': '{0} EXP',
    'ui.officer.rank.current': '　目前',
    'ui.officer.rank.unlock': '解鎖：{0}',
    'ui.officer.rank.initial': '初始',
    'ui.officer.feature.hall_basic_entry': '大廳基本入口',
    'ui.officer.feature.domestic_wall_low': '內政牆低階任務',
    'ui.officer.feature.board_domestic_full': '內政牆完整開放',
    'ui.officer.feature.board_military_full': '軍事牆完整開放',
    'ui.officer.feature.world_sandtable_s1': '世界沙盤 S1',
    'ui.officer.feature.world_sandtable_s2': '世界沙盤 S2',
    'ui.officer.feature.world_sandtable_s3': '世界沙盤 S3',
    'ui.officer.feature.alliance_docs': '聯盟文書',
    'ui.officer.feature.anti_hegemony_summit': '反霸權會盟',
};

const STATUS_MARK: Readonly<Record<RankRowStatus, string>> = { reached: '✔', current: '▶', locked: '・' };

function rankText(lookup: BreedTextLookup, key: string, ...args: string[]): string {
    const localized = lookup(key, ...args);
    return localized === key ? fillBreedText(RANK_PROGRESS_TEXT_FALLBACK_ZH_TW[key] ?? key, args) : localized;
}

/** 官職頁「階位總覽」按鈕文字 */
export function rankProgressOpenLabel(lookup: BreedTextLookup = (key) => key): string {
    return rankText(lookup, 'ui.officer.rank.open');
}

/** 解鎖代碼轉顯示名；語系表與備援都沒有時直接顯示代碼 */
export function rankFeatureLabel(code: string, lookup: BreedTextLookup = (key) => key): string {
    return rankText(lookup, `ui.officer.feature.${code.toLowerCase()}`);
}

/** 組官職進度開窗的全部文字；tiers 為資料檔列，null 或空陣列時用備援 */
export function rankProgressViewOf(
    state: Readonly<OfficerState>,
    tiers: readonly RankTierSource[] | null = null,
    lookup: BreedTextLookup = (key) => key,
): RankProgressView {
    const source = (tiers && tiers.length > 0 ? tiers : RANK_PROGRESS_FALLBACK_TIERS)
        .slice()
        .sort((a, b) => a.tier - b.tier)
        .slice(0, RANK_PROGRESS_ROW_COUNT);
    const rows = source.map((row): RankProgressRow => {
        const status: RankRowStatus = row.tier < state.currentTier ? 'reached' : row.tier === state.currentTier ? 'current' : 'locked';
        const need = row.expToReach > 0 ? rankText(lookup, 'ui.officer.rank.need', String(row.expToReach)) : rankText(lookup, 'ui.officer.rank.initial');
        const currentTag = status === 'current' ? rankText(lookup, 'ui.officer.rank.current') : '';
        const unlocks = row.unlockedFeatures.map((code) => rankFeatureLabel(code, lookup)).join('、');
        return {
            tier: row.tier,
            status,
            headline: rankText(lookup, 'ui.officer.rank.row', STATUS_MARK[status], row.title, need, currentTag),
            unlockLine: rankText(lookup, 'ui.officer.rank.unlock', unlocks),
        };
    });
    return {
        title: rankText(lookup, 'ui.officer.rank.title'),
        closeLabel: rankText(lookup, 'ui.officer.rank.close'),
        expLine: officerDisplayOf(state as OfficerState, source.map((row) => ({ tier: row.tier, title: row.title }))).expLabel,
        rows,
    };
}
