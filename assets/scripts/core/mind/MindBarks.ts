// @spec-source → 武將心智提案 §2.7 大廳小人泡泡（PROG-2-9146）；離線模板為主（使用者 2026-11-17 裁決）
/**
 * 武將心智的離線台詞模板與挑句邏輯，純 TS，不依賴 cc。
 * 只負責「說」：說什麼由記憶與心情決定，模板索引由呼叫端傳入的 seed 決定，同輸入同輸出。
 * {self} 第一人稱由 SpeakerVoice 依性別＋性格＋年齡代入。{label} 代入事件名稱（任務名／出征），{n} 代入連敗回數，{partner} 代入搭檔名。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import { effectiveValence } from './MindRules';
import { voiceSlots } from './SpeakerVoice';
import {
    MIND_CONFIG,
    type MindEvent,
    type MindLedger,
    type MindLine,
    type MindMood,
} from './MindTypes';

type PerType = Readonly<Record<GeneralPersonalityType, readonly string[]>>;

/** 上回失手：引用玩家過去的決定 */
export const BARK_FAIL: PerType = {
    Brave: ['上回{label}失手，{self}還想再試！', '{label}那一仗敗了，不雪此恥誓不罷休！'],
    Wise: ['{label}之失，{self}思之再三，下回須先探明虛實。', '上回{label}不順，宜補足情報再行。'],
    Loyal: ['辱主公所託，{label}一事{self}願領罰，更願再試。', '{label}未能成事，{self}愧對主公。'],
    Playful: ['哎呀，{label}那回栽了，下次換個玩法！', '{label}出了岔子……不過{self}還想再玩一把。'],
};

/** 上回得手 */
export const BARK_SUCCESS: PerType = {
    Brave: ['{label}旗開得勝！下回儘管再派{self}！', '上回{label}痛快，{self}手還癢著呢。'],
    Wise: ['{label}之成，料敵在先，此法可再用。', '上回{label}得手，皆因算得準。'],
    Loyal: ['{label}幸不辱命，全賴主公信任。', '上回{label}能成，是主公知人善任。'],
    Playful: ['{label}那回贏得漂亮，還有更好玩的差事嗎？', '嘿，上回{label}真過癮，還有嗎？'],
};

/** 連敗（謹慎型要情報、衝動型想雪恥） */
export const BARK_STREAK_CAUTIOUS: readonly string[] = [
    '{label}連失 {n} 回，情報不足，{self}不敢輕進。',
    '{label}連敗 {n} 回了，先探明虛實再說吧。',
];
export const BARK_STREAK_REDEEM: readonly string[] = [
    '{label}連敗 {n} 回，{self}請再戰，不雪此恥誓不罷休！',
    '{label}栽了 {n} 回，這口氣{self}嚥不下！',
];

export const BARK_BOND: readonly string[] = [
    '與{partner}並肩幾回，默契十足，下回還想同往。',
    '有{partner}在旁，{self}心裡踏實。',
];

export const BARK_IDLE: PerType = {
    Brave: ['主公近來都不用{self}，刀都要生鏽了！'],
    Wise: ['主公近來少有差遣，莫非{self}有不當之處？'],
    Loyal: ['主公近來都不用{self}，莫非嫌棄？'],
    Playful: ['好久沒出門了，悶得發慌，有差事嗎？'],
};

export const BARK_MOOD: Readonly<Record<'EAGER' | 'HIGH' | 'LOW', PerType>> = {
    EAGER: {
        Brave: ['手癢難耐，主公有差事儘管派{self}！', '渾身是勁，來一場吧！'],
        Wise: ['時機成熟，{self}願為主公分憂。', '近來順遂，此時正宜進取。'],
        Loyal: ['願為主公效犬馬之勞，請儘管吩咐！', '{self}蒙主公器重，正想報效。'],
        Playful: ['有沒有好玩的差事？{self}閒不住啦！', '今天運氣好得很，快給{self}派點活！'],
    },
    HIGH: {
        Brave: ['近來順風順水，{self}精神得很。'],
        Wise: ['近來諸事順遂，心中安穩。'],
        Loyal: ['近來有主公照拂，{self}心中暖和。'],
        Playful: ['今天心情不錯，哼個小曲兒。'],
    },
    LOW: {
        Brave: ['唉，近來事事不順，悶得慌。'],
        Wise: ['近來諸事不順，{self}正自省。'],
        Loyal: ['近來未能為主公分憂，{self}心中不安。'],
        Playful: ['唉，最近手氣背，提不起勁。'],
    },
};

/** 簡單可重現的字串雜湊（FNV-1a），seed 與武將 id 混合後取索引 */
export function mindHash(seed: number, key: string): number {
    let h = 0x811c9dc5 ^ (seed >>> 0);
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d) >>> 0;
    h ^= h >>> 12;
    return h >>> 0;
}

function pick<T>(list: readonly T[], hash: number): T {
    return list[hash % list.length];
}

function fill(template: string, vars: Readonly<Record<string, string>>): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => vars[key] ?? whole);
}

export interface BarkInput {
    generalId: string;
    type: GeneralPersonalityType;
    mood: MindMood;
    events: readonly MindEvent[];
    ledger?: Readonly<MindLedger>;
    now: number;
    seed: number;
    nameOf?: (generalId: string) => string | undefined;
    /** 性別（'男'／'女'）；缺值視為男，決定第一人稱 */
    gender?: string;
    /** 年齡；未滿 16 歲自稱「我」 */
    age?: number;
}

/** 最近可引用的記憶：近 N 季、重要度夠、有名稱；挑有效衝擊絕對值最大者（同分取較新）。 */
export function quotableEvent(events: readonly MindEvent[], now: number): MindEvent | null {
    let best: MindEvent | null = null;
    let bestScore = 0;
    for (const e of events) {
        const milestone = e.weight >= MIND_CONFIG.milestoneWeight;
        if (!milestone && now - e.season > MIND_CONFIG.memoryQuoteSeasons) continue;
        if (e.weight < MIND_CONFIG.memoryQuoteMinWeight) continue;
        const quotable = (e.label && (e.kind === 'TASK_DONE' || e.kind === 'BATTLE_RESULT' || e.kind === 'DUEL') && e.valence !== 0)
            || (e.kind === 'BOND_FORMED' && !!e.partnerId);
        if (!quotable) continue;
        const score = Math.abs(effectiveValence(e, now));
        if (best === null || score > bestScore || (score === bestScore && e.season >= best.season)) {
            best = e;
            bestScore = score;
        }
    }
    return best;
}

const NONE: MindLine = { text: '', source: 'NONE', reasonCodes: [] };

/**
 * 依「記憶 → 連敗 → 冷落 → 心情」挑一句：有可引用的事件時 70% 說記憶（引用玩家過去的決定），
 * 否則依心情說；心情普通又沒故事時回空字串，呼叫端退回一般閒聊。
 */
export function selectBark(input: Readonly<BarkInput>): MindLine {
    const voice = voiceSlots({ gender: input.gender, type: input.type, age: input.age });
    const h = mindHash(input.seed, input.generalId);
    const ref = quotableEvent(input.events, input.now);
    const useMemory = ref !== null && (h % 1000) / 1000 < MIND_CONFIG.memoryBarkChance;
    const idle = (input.ledger?.idleSeasons ?? 0) >= MIND_CONFIG.idleThresholdSeasons;
    if (ref && useMemory) {
        if (ref.kind === 'BOND_FORMED') {
            const partner = input.nameOf?.(ref.partnerId as string);
            if (partner) {
                return { text: fill(pick(BARK_BOND, h >>> 4), { ...voice, partner }), source: 'BOND', reasonCodes: [`BOND:${ref.partnerId}`], eventId: ref.id };
            }
        } else {
            const label = ref.label as string;
            const tagStat = ref.tags.map(t => input.ledger?.byTag[t]).find(s => s && s.streakLoss >= MIND_CONFIG.streakLossLine);
            const reasons = [`${ref.kind}:${ref.outcome ?? 'NONE'}`, ...(ref.reason ? [ref.reason] : [])];
            if (ref.valence < 0 && tagStat) {
                const redeem = input.type === 'Brave' || input.type === 'Playful';
                const list = redeem ? BARK_STREAK_REDEEM : BARK_STREAK_CAUTIOUS;
                return { text: fill(pick(list, h >>> 4), { ...voice, label, n: String(tagStat.streakLoss) }), source: 'STREAK', reasonCodes: [...reasons, 'STREAK_LOSS'], eventId: ref.id };
            }
            const table = ref.valence < 0 ? BARK_FAIL : BARK_SUCCESS;
            return { text: fill(pick(table[input.type], h >>> 4), { ...voice, label }), source: 'MEMORY', reasonCodes: reasons, eventId: ref.id };
        }
    }
    if (idle) return { text: fill(pick(BARK_IDLE[input.type], h >>> 4), voice), source: 'IDLE', reasonCodes: ['IDLE_SEASONS'] };
    if (input.mood === 'NORMAL') return NONE;
    return { text: fill(pick(BARK_MOOD[input.mood][input.type], h >>> 4), voice), source: 'MOOD', reasonCodes: [`MOOD:${input.mood}`] };
}
