// @spec-source → 武將人物介面規格補遺_2026-04-14 §1 性格圖騰（核心行為傾向：離線／晨報）（HUM-03，PROG-2-1932）
/**
 * OfflinePersonalityBehavior — 依四型性格挑一個離線行為，產生晨報日誌（純邏輯，不依賴 cc）。
 *
 * 行為池照規格表：
 * - 義氣 Loyal：尋訪在野武將、縮短招降時間、增加他將好感。
 * - 豪爽 Brave：找人喝酒提升屬性、市場消費觸發折扣、武力切磋。
 * - 睿智 Wise：內政優化、協助子嗣課程、自動完成每日任務。
 * - 貪玩 Playful：隨機遊歷撿回道具、觸發搞笑命運事件、意外發現。
 *
 * 暫定：各行為的實際效果數值與觸發機率規格未給；本卡只決定「做了哪件事」與晨報文案，效果結算另卡。
 * 暫定（PROG-2-2104）：每天第一次登入挑 1 位成年武將寫 1 則；武將資料沒有性格時，依具名名將表、再依最高屬性推導。
 * Unity 對照：像依角色 enum 查一張行為表，再用亂數挑一列。
 */
import type { GeneralPersonality, GeneralPersonalityType, GeneralRecentLog } from '../models/GeneralUnit';
import type { JournalEntryInput } from './JournalLog';

export type OfflineBehaviorId =
    | 'SEEK_RECRUIT' | 'SHORTEN_SURRENDER' | 'RAISE_AFFECTION'
    | 'DRINK_TRAINING' | 'MARKET_DISCOUNT' | 'SPAR'
    | 'DOMESTIC_TUNE' | 'TUTOR_CHILD' | 'AUTO_DAILY_TASK'
    | 'WANDER_LOOT' | 'COMIC_FATE' | 'SERENDIPITY';

interface BehaviorDef {
    id: OfflineBehaviorId;
    narrative: string;
}

export const OFFLINE_BEHAVIORS: Readonly<Record<GeneralPersonalityType, readonly BehaviorDef[]>> = {
    Loyal: [
        { id: 'SEEK_RECRUIT', narrative: '{Name} 四處尋訪在野豪傑，打聽到了新的人才消息。' },
        { id: 'SHORTEN_SURRENDER', narrative: '{Name} 親赴牢中曉以大義，俘虜的招降時間縮短了。' },
        { id: 'RAISE_AFFECTION', narrative: '{Name} 與同袍把酒談心，彼此情誼更深了。' },
    ],
    Brave: [
        { id: 'DRINK_TRAINING', narrative: '{Name} 找人痛飲一場，酒後切磋竟有所精進。' },
        { id: 'MARKET_DISCOUNT', narrative: '{Name} 在市集一擲千金，店家感其豪氣給了折扣。' },
        { id: 'SPAR', narrative: '{Name} 與營中好手比武切磋，打得難分難解。' },
    ],
    Wise: [
        { id: 'DOMESTIC_TUNE', narrative: '{Name} 連夜批閱公文，將內政條理整頓得井井有條。' },
        { id: 'TUTOR_CHILD', narrative: '{Name} 抽空指點子嗣課業，孩子們受益良多。' },
        { id: 'AUTO_DAILY_TASK', narrative: '{Name} 未等吩咐，已把今日例行事務辦妥。' },
    ],
    Playful: [
        { id: 'WANDER_LOOT', narrative: '{Name} 偷溜出城遊歷，回來時手裡多了件東西。' },
        { id: 'COMIC_FATE', narrative: '{Name} 遊玩時鬧出一場笑話，成了營中茶餘飯後的話題。' },
        { id: 'SERENDIPITY', narrative: '{Name} 閒逛時意外發現了一處不為人知的地方。' },
    ],
};

/** 討論來源 doc_spec_0102 點名的代表武將 */
export const NAMED_GENERAL_PERSONALITY: Readonly<Record<string, GeneralPersonalityType>> = {
    'guan-yu': 'Loyal', 'taishi-ci': 'Loyal',
    'zhang-fei': 'Brave', 'xu-chu': 'Brave',
    'zhuge-liang': 'Wise', 'sima-yi': 'Wise',
    'cao-zhi': 'Playful', 'xiao-qiao': 'Playful',
};

/** 暫定：沒有性格資料時，依最高屬性推導；同分取表中較前者 */
const STAT_PERSONALITY: ReadonlyArray<readonly ['cha' | 'str' | 'int' | 'luk', GeneralPersonalityType]> = [
    ['cha', 'Loyal'], ['str', 'Brave'], ['int', 'Wise'], ['luk', 'Playful'],
];

export const OFFLINE_BEHAVIOR_MIN_AGE = 15;
/** 比派遣、季度大事低，名額不夠時先讓位 */
export const OFFLINE_BEHAVIOR_JOURNAL_PRIORITY = 30;

type PersonalityStats = Partial<Record<'cha' | 'str' | 'int' | 'luk', number>>;

export interface OfflineBehaviorGeneral extends PersonalityStats {
    id: string;
    name?: string;
    age?: number;
    personality?: GeneralPersonality;
    stats?: PersonalityStats;
}

/** 武將的離線性格：明確設定 → 具名名將 → 最高屬性 */
export function offlinePersonalityOf(general: OfflineBehaviorGeneral): GeneralPersonalityType {
    if (general.personality?.type) return general.personality.type;
    const named = Object.prototype.hasOwnProperty.call(NAMED_GENERAL_PERSONALITY, general.id) ? NAMED_GENERAL_PERSONALITY[general.id] : undefined;
    if (named) return named;
    let best = STAT_PERSONALITY[0][1];
    let bestValue = -Infinity;
    for (const [key, type] of STAT_PERSONALITY) {
        const value = general[key] ?? general.stats?.[key] ?? 0;
        if (value > bestValue) {
            bestValue = value;
            best = type;
        }
    }
    return best;
}

/** 挑 1 位成年武將，組成一則晨報日誌；沒人可挑回傳 null */
export function offlineBehaviorJournalEntry(
    generals: readonly OfflineBehaviorGeneral[], random: () => number, sequence: number, timestamp: string,
): JournalEntryInput | null {
    const eligible = generals.filter((g) => (g.age ?? OFFLINE_BEHAVIOR_MIN_AGE) >= OFFLINE_BEHAVIOR_MIN_AGE);
    if (eligible.length === 0) return null;
    const r = random();
    const general = eligible[Math.min(eligible.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * eligible.length)))];
    const personality = offlinePersonalityOf(general);
    const log = offlineBehaviorLog(personality, pickOfflineBehavior(personality, random), general.name ?? general.id, timestamp);
    return {
        entryId: `OFFLINE_BEHAVIOR-${sequence}`,
        timestamp,
        category: 'GROWTH',
        relatedGeneralUids: [general.id],
        priority: OFFLINE_BEHAVIOR_JOURNAL_PRIORITY,
        summary: log.narrative,
    };
}

/** 依性格挑一個離線行為；random 回傳 [0,1)。 */
export function pickOfflineBehavior(personality: GeneralPersonalityType, random: () => number): OfflineBehaviorId {
    const pool = OFFLINE_BEHAVIORS[personality];
    const r = random();
    const index = Math.min(pool.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * pool.length)));
    return pool[index].id;
}

/** 把行為寫成晨報日誌（recentLog）。 */
export function offlineBehaviorLog(
    personality: GeneralPersonalityType, behavior: OfflineBehaviorId, name: string, timestamp: string,
): GeneralRecentLog {
    const def = OFFLINE_BEHAVIORS[personality].find((b) => b.id === behavior);
    const narrative = (def?.narrative ?? '{Name} 度過了平靜的一晚。').replace('{Name}', name);
    return { timestamp, narrative, impact: behavior };
}
