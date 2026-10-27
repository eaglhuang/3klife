// @spec-source → 留存系統.md §F「三國日報事件引擎」；§E #8「三國日報」、#9「插槽式敘事引擎」；§G 劇本（PROG-2-1169）
/**
 * DailyNewsEngine — 三國日報（純邏輯，不依賴 cc）
 *
 * 規則：每次登入取玩家前 24h 的行為 Log，依觸發表挑事件類型，
 * 以 [角色]+[情緒]+[行為]+[結果] 插槽模板拼出 1~3 條個人化日報。
 *
 * 照規格：觸發表、每次 1~3 條、復仇取回 5%~20%、代勞情緒「得意」、復仇情緒「憤怒」。
 * 暫定：其餘事件的情緒、代勞任務名、團購物品、特訓屬性與 +1~3、離線社交對象字串；
 *       同一次登入不重複出同類事件；24h 內沒有任何 Log 視為 IDLE_LONG。
 * 不做：結果只是文字，不發獎勵；不接 UI 與 Daily_News 存檔。
 *
 * Unity 對照：像登入時跑一次的 static 事件生成器，吃 Log 清單與亂數，回傳日報資料，不改輸入。
 */

import type { RandomSource } from './GeneralAging';

export type PlayerLogType =
    | 'BATTLE_WIN' | 'BATTLE_LOSE' | 'RESOURCE_LOW'
    | 'GACHA_FAIL' | 'GACHA_SUCCESS' | 'GENERAL_RETIRE'
    | 'GENERAL_BORN' | 'TALLY_UPGRADE' | 'DUEL_WIN' | 'DUEL_LOSE'
    | 'LOYALTY_DROP' | 'IDLE_LONG';

export type DailyNewsType =
    | 'COMFORT' | 'REVENGE' | 'AUTO_TASK' | 'OFFLINE_SOCIAL'
    | 'TRAINING' | 'GOSSIP' | 'SHOPPING';

export interface NarrativeSlot {
    character: string;
    emotion: string;
    action: string;
    result: string;
}

export interface DailyNewsItem extends NarrativeSlot {
    type: DailyNewsType;
}

export interface PlayerLogEntry {
    type: PlayerLogType;
    /** 發生時間（ms） */
    at: number;
    /** RESOURCE_LOW 等事件損失的資源名，例如「糧草」 */
    resource?: string;
}

export interface DailyNewsGeneral {
    name: string;
}

export const NEWS_TRIGGER_TABLE: Readonly<Record<PlayerLogType, readonly DailyNewsType[]>> = {
    BATTLE_LOSE: ['COMFORT', 'REVENGE'],
    RESOURCE_LOW: ['REVENGE', 'SHOPPING'],
    GACHA_FAIL: ['COMFORT', 'GOSSIP'],
    GACHA_SUCCESS: ['GOSSIP'],
    BATTLE_WIN: ['TRAINING', 'OFFLINE_SOCIAL'],
    GENERAL_RETIRE: ['COMFORT'],
    GENERAL_BORN: ['GOSSIP'],
    TALLY_UPGRADE: ['TRAINING'],
    DUEL_WIN: ['OFFLINE_SOCIAL'],
    DUEL_LOSE: ['COMFORT', 'REVENGE'],
    LOYALTY_DROP: ['COMFORT'],
    IDLE_LONG: ['AUTO_TASK', 'SHOPPING'],
};

export const DAILY_NEWS_COUNT = { min: 1, max: 3 } as const;
export const DAILY_NEWS_LOG_WINDOW_MS = 24 * 60 * 60 * 1000;
export const REVENGE_RECOVER_PCT = { min: 5, max: 20 } as const;
export const DEFAULT_LOST_RESOURCE = '糧草';

/** 各事件的情緒（AUTO_TASK、REVENGE 照規格，其餘暫定） */
export const DAILY_NEWS_EMOTION: Readonly<Record<DailyNewsType, string>> = {
    COMFORT: '擔憂',
    REVENGE: '憤怒',
    AUTO_TASK: '得意',
    OFFLINE_SOCIAL: '開心',
    TRAINING: '淡定',
    GOSSIP: '開心',
    SHOPPING: '開心',
};

/** 暫定字串池 */
export const AUTO_TASK_NAMES: readonly string[] = ['巡視城防', '整理軍糧', '操練新兵', '收取市稅'];
export const SHOPPING_ITEMS: readonly string[] = ['一壺好酒', '一把舊扇', '幾包乾糧', '一匹布料'];
export const TRAINING_STATS: readonly string[] = ['武力', '智力', '統率', '政治', '魅力'];
export const TRAINING_VALUE = { min: 1, max: 3 } as const;
export const OFFLINE_SOCIAL_OTHER_PLAYER = '另一位主公';

function pick<T>(list: readonly T[], random: RandomSource): T {
    return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

function intBetween(min: number, max: number, random: RandomSource): number {
    return min + Math.min(max - min, Math.floor(random() * (max - min + 1)));
}

/** 頭條：「三國日報 —— {Date}」，Date 為 YYYY-MM-DD（本地時間） */
export function dailyNewsTitle(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `三國日報 —— ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 前 24h 的 Log；一筆都沒有時視為 IDLE_LONG */
export function recentLogs(logs: readonly PlayerLogEntry[], now: number): PlayerLogEntry[] {
    const recent = logs.filter((log) => log.at <= now && now - log.at <= DAILY_NEWS_LOG_WINDOW_MS);
    return recent.length > 0 ? recent : [{ type: 'IDLE_LONG', at: now }];
}

/** 由 Log 推出的候選事件類型（去重，依 Log 出現順序） */
export function candidateNewsTypes(logs: readonly PlayerLogEntry[]): DailyNewsType[] {
    const types: DailyNewsType[] = [];
    for (const log of logs) {
        for (const type of NEWS_TRIGGER_TABLE[log.type] ?? []) {
            if (!types.includes(type)) types.push(type);
        }
    }
    return types;
}

export function buildNarrative(
    type: DailyNewsType,
    general: DailyNewsGeneral,
    others: readonly DailyNewsGeneral[],
    lostResource: string,
    random: RandomSource,
): NarrativeSlot {
    const name = general.name;
    const emotion = DAILY_NEWS_EMOTION[type];
    switch (type) {
        case 'REVENGE': {
            const pct = intBetween(REVENGE_RECOVER_PCT.min, REVENGE_RECOVER_PCT.max, random);
            return { character: name, emotion, action: `帶隊反搶昨日失去的${lostResource}`, result: `取回了 ${pct}% 的${lostResource}！` };
        }
        case 'AUTO_TASK':
            return { character: name, emotion, action: `自動幫你完成了「${pick(AUTO_TASK_NAMES, random)}」`, result: '主公日理萬機，小事就交給我吧。' };
        case 'OFFLINE_SOCIAL': {
            const other = others.length > 0 ? pick(others, random).name : '無名小將';
            return { character: name, emotion, action: `在路邊遇到了${OFFLINE_SOCIAL_OTHER_PLAYER}的 ${other}`, result: '切磋後獲得經驗！' };
        }
        case 'TRAINING': {
            const stat = pick(TRAINING_STATS, random);
            const value = intBetween(TRAINING_VALUE.min, TRAINING_VALUE.max, random);
            return { character: name, emotion, action: '離線期間自行練功', result: `${stat} +${value}！` };
        }
        case 'GOSSIP': {
            const other = others.length > 0 ? pick(others, random).name : '營中眾將';
            return { character: name, emotion, action: `和${other}在營中閒聊`, result: '傳出了一則趣聞。' };
        }
        case 'SHOPPING':
            return { character: name, emotion, action: '去市場淘寶', result: `帶回了${pick(SHOPPING_ITEMS, random)}。` };
        case 'COMFORT':
        default:
            return { character: name, emotion, action: '主動來營帳探望主公', result: '勝敗乃兵家常事，明日再戰。' };
    }
}

/**
 * 產生本次登入的日報（1~3 條，不超過候選類型數；名冊為空則回傳空陣列）。
 */
export function generateDailyNews(
    logs: readonly PlayerLogEntry[],
    generals: readonly DailyNewsGeneral[],
    now: number,
    random: RandomSource = Math.random,
): DailyNewsItem[] {
    if (generals.length === 0) return [];
    const recent = recentLogs(logs, now);
    const pool = candidateNewsTypes(recent);
    const lostResource = recent.find((log) => log.resource)?.resource ?? DEFAULT_LOST_RESOURCE;
    const count = Math.min(pool.length, intBetween(DAILY_NEWS_COUNT.min, DAILY_NEWS_COUNT.max, random));
    const news: DailyNewsItem[] = [];
    for (let i = 0; i < count; i++) {
        const type = pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0];
        const general = pick(generals, random);
        const others = generals.filter((g) => g !== general);
        news.push({ type, ...buildNarrative(type, general, others, lostResource, random) });
    }
    return news;
}
