// @spec-source → 兵種（虎符）系統.md (doc_spec_0012)；UI 規格補遺_2026-04-11 general-tally-summary (doc_ui_0030)；PROG-2-1344
/**
 * GeneralTallySummary — 人物頁「虎符戰記摘要」次卡的三行文字（純邏輯，不依賴 cc）
 *
 * - 虎符：品質、星級、TigerTallyScore 與分數帶（band 沿用品質門檻）。
 * - 兵種傾向：虎符綁定兵種的中文名；未綁定顯示「未綁定」。
 * - 近期戰績：勝敗與勝率；沒有戰績顯示「尚無戰績」。
 * - 只做摘要，不展開圖鑑或養成資訊。文案暫定（規格無字串 key）。
 *
 * Unity 對照：像角色面板 Presenter 的一個小 ViewModel，把背包與戰績表各取幾個欄位組成摘要。
 */
import { TroopType } from '../config/Constants';
import { resolveTroopDisplayName } from '../models/TroopUnit';
import { winRate, type BattleRecordLike } from './BattleRecordStats';
import { resolveTallyQuality } from './TigerTally';
import type { TalismanSlotView } from './TalismanSlotView';

/** 分數帶：沿用 resolveTallyQuality 的門檻 */
export const TALLY_SCORE_BANDS: Readonly<Record<'UR' | 'SSR' | 'SR' | 'R', string>> = {
    UR: '85+',
    SSR: '65-84',
    SR: '40-64',
    R: '0-39',
};

export interface GeneralTallySummary {
    tallyLine: string;
    troopLine: string;
    recordLine: string;
}

const TROOP_TYPES = new Set<string>(Object.values(TroopType));

function troopName(troopId: string | undefined): string {
    if (!troopId) return '未綁定';
    return TROOP_TYPES.has(troopId) ? resolveTroopDisplayName(troopId as TroopType) : troopId;
}

function recordLine(record: BattleRecordLike | null | undefined): string {
    const wins = record?.wins ?? 0;
    const losses = record?.losses ?? 0;
    if (wins + losses <= 0) return '近期戰績：尚無戰績';
    return `近期戰績：${wins} 勝 ${losses} 敗｜勝率 ${winRate(record)}%`;
}

export function buildGeneralTallySummary(slot: TalismanSlotView, record: BattleRecordLike | null = null): GeneralTallySummary {
    if (slot.state !== 'EQUIPPED') {
        return { tallyLine: '虎符：未裝備', troopLine: '兵種傾向：—', recordLine: recordLine(record) };
    }
    const t = slot.talisman;
    const band = resolveTallyQuality(t.TigerTallyScore);
    return {
        tallyLine: `虎符：${t.Quality} ${t.Star}★｜分數 ${t.TigerTallyScore}（${band} 帶 ${TALLY_SCORE_BANDS[band]}）`,
        troopLine: `兵種傾向：${troopName(t.Linked_Troop_ID)}`,
        recordLine: recordLine(record),
    };
}
