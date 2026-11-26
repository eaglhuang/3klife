// @spec-source → PROG-2-10070 親子談話；PROG-2-10058 親子好感帳本
/**
 * ChildTalk — 親子談話的話題表與規則（純邏輯，不依賴 cc）
 *
 * 規則：每名孩子每年可談一次；話題依該孩子「累計談話次數」輪替（3 句搞笑話題），
 * 好感增量由話題資料決定（1～3，data/master/child-talk-config.json），程式不寫死數值。
 * 入帳在 GameSession.talkToChild（權威端）；UI 只送 childId，經 family.talkToChild 命令。
 */
import configData from '../../../resources/data/master/child-talk-config.json';

export interface ChildTalkTopic {
    id: string;
    /** 談話內容的 i18n key（現代口語講典故） */
    lineKey: string;
    /** 這句話題帶來的親子好感增量 */
    favorDelta: number;
}

export interface ChildTalkConfig {
    schemaVersion: number;
    topics: ChildTalkTopic[];
}

/** 好感增量資料上限（資料表的合理範圍，防誤填爆表） */
export const CHILD_TALK_FAVOR_DELTA_MIN = 1;
export const CHILD_TALK_FAVOR_DELTA_MAX = 3;

export function validateChildTalkConfig(raw: unknown): string[] {
    const errors: string[] = [];
    const cfg = raw as Partial<ChildTalkConfig> | null;
    if (!cfg || typeof cfg !== 'object') return ['根節點必須是物件'];
    if (cfg.schemaVersion !== 1) errors.push('schemaVersion 必須是 1');
    if (!Array.isArray(cfg.topics) || cfg.topics.length === 0) return [...errors, 'topics 必須是非空陣列'];
    const ids = new Set<string>();
    cfg.topics.forEach((t, i) => {
        const where = `topics[${i}]`;
        if (!t || typeof t.id !== 'string' || t.id === '') errors.push(`${where}.id 必須是非空字串`);
        else if (ids.has(t.id)) errors.push(`${where}.id 重複：${t.id}`);
        else ids.add(t.id);
        if (!t || typeof t.lineKey !== 'string' || t.lineKey === '') errors.push(`${where}.lineKey 必須是非空字串`);
        if (!t || !Number.isInteger(t.favorDelta) || t.favorDelta < CHILD_TALK_FAVOR_DELTA_MIN || t.favorDelta > CHILD_TALK_FAVOR_DELTA_MAX) {
            errors.push(`${where}.favorDelta 必須是 ${CHILD_TALK_FAVOR_DELTA_MIN}～${CHILD_TALK_FAVOR_DELTA_MAX} 的整數`);
        }
    });
    return errors;
}

/** 載入並驗證話題表；資料不合格丟例外（開機就看得到） */
export function loadChildTalkConfig(raw: unknown = configData): ChildTalkConfig {
    const errors = validateChildTalkConfig(raw);
    if (errors.length > 0) throw new Error(`child-talk-config 資料不合格：${errors.join('；')}`);
    const cfg = raw as ChildTalkConfig;
    return { schemaVersion: cfg.schemaVersion, topics: cfg.topics.map((t) => ({ ...t })) };
}

/** 依累計談話次數輪替話題（第 0 次用第 1 句，用完回頭） */
export function childTalkTopicFor(config: ChildTalkConfig, talkCount: number): ChildTalkTopic {
    const n = Number.isFinite(talkCount) ? Math.max(0, Math.floor(talkCount)) : 0;
    return config.topics[n % config.topics.length];
}
