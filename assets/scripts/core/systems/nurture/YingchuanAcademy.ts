// @spec-source → ACAD_01_潁川書院_名士清談與策論牌組規格書.md (doc_spec_0303) §2 策論手牌與清談辯難、§3 專屬產出、§7.1 體力受挫與絕境頓悟（PROG-2-1903）
/**
 * YingchuanAcademy — 潁川書院專屬機制：策論手牌、清談大會、名士評審、體力風險（純邏輯，不依賴 cc）。
 *
 * - 練智力／政治／統率時抽 1 張策論牌（天時／地利／人和 × 1~3★），手牌上限 5 張；
 *   手牌滿時新牌暫放 pendingCard，玩家以 DISCARD:<index> 換牌或 DECLINE 放棄，再抽到就自動放棄舊的。
 * - 第 6、12、18、24、30、36 回合為清談大會：玩家以 DEBATE:<i>,<j>,<k> 出 3 張（手牌不足 3 張可出全部或 SKIP）。
 *   同氣相求 ×2.0、天人合一 ×2.5、其餘 ×1.3；點數依體力打 100／90／70 折。
 * - 體力 30~59 強行訓練 5% 額外扣 10 精力；0~29 有 35% 受挫（智力成長 -50%、記【心浮氣躁】）。
 *   體力 <20 仍清談：5% 背水立論（不受挫、得【十勝十敗】靈感），否則 35% 受挫。
 * - 結業時依 §3 條件發放【料敵機先】【十勝十敗】【潁水清流】。
 * - 規格未給的數字（牌品機率、清談成長換算、評審線、清談精力）集中在 YINGCHUAN_TUNING（暫定）。
 * - 教官羈絆（§7.2）與經典事件庫（§8）不在本檔，留待後續卡。
 *
 * Unity 對照：像掛在 AcademyTrainingEngine 上的一個 Strategy 物件，狀態存在快照的 gimmickStatePayload。
 */
import { addAcademyStatCapped } from './AcademyTrainingEngine';
import {
    ACADEMY_TACTIC_SLOTS,
    ACADEMY_TRAIT_SLOTS,
    AcademyId,
    AcademyStateSnapshot,
    AcademyStatKey,
    AcademyTrainResult,
    IAcademyGimmickHandler,
    IDeterministicRng,
} from './AcademyTypes';

export enum EssayCardCategory {
    SKY = 'SKY',
    EARTH = 'EARTH',
    PEOPLE = 'PEOPLE',
}

export interface EssayCard {
    id: string;
    name: string;
    category: EssayCardCategory;
    star: 1 | 2 | 3;
    debatePower: number;
}

export type YingchuanComboType = 'THREE_OF_KIND' | 'TRI_HARMONIC' | 'COMMON';

export interface YingchuanGimmickState {
    handCards: EssayCard[];
    pendingCard: EssayCard | null;
    debatePointsPool: number;
    masterEndorsements: string[];
    triHarmonicCount: number;
    inspirations: string[];
    negativeTraits: string[];
    debatePending: boolean;
    drawSerial: number;
}

export const YINGCHUAN_HAND_LIMIT = 5;
export const YINGCHUAN_DEBATE_TURNS: readonly number[] = [6, 12, 18, 24, 30, 36];
export const YINGCHUAN_DRAW_STATS: readonly AcademyStatKey[] = ['int', 'pol', 'lea'];
export const YINGCHUAN_STAR_POWER: Record<1 | 2 | 3, number> = { 1: 10, 2: 25, 3: 50 };

/** 每系三張牌，依 1★／2★／3★ 排列（§2.1 牌面；《陳平屯田策》2★、《星象分野考》3★ 見 §8） */
export const YINGCHUAN_CARD_NAMES: Record<EssayCardCategory, readonly [string, string, string]> = {
    [EssayCardCategory.SKY]: ['《六韜·天門》', '《論治亂盛衰之勢》', '《星象分野考》'],
    [EssayCardCategory.EARTH]: ['《管子·地員篇》', '《陳平屯田策》', '《河渠治水經》'],
    [EssayCardCategory.PEOPLE]: ['《名理學綱要》', '《論士林品藻策》', '《九府官箴》'],
};

/** 名士評審：回合 → 主持人、印章、考評線（考評線暫定） */
export const YINGCHUAN_MASTERS: Record<number, { master: string; endorsement: string; threshold: number }> = {
    6: { master: '司馬徽', endorsement: 'SEAL_SIMA_HUI_INSIGHT', threshold: 60 },
    12: { master: '司馬徽', endorsement: 'SEAL_SIMA_HUI_INSIGHT', threshold: 60 },
    18: { master: '龐德公', endorsement: 'SEAL_PANG_DEGONG', threshold: 90 },
    24: { master: '龐德公', endorsement: 'SEAL_PANG_DEGONG', threshold: 90 },
    30: { master: '荀爽', endorsement: 'SEAL_XUN_SHUANG', threshold: 120 },
    36: { master: '荀爽', endorsement: 'SEAL_XUN_SHUANG', threshold: 120 },
};
export const YINGCHUAN_SEAL_TRI_HARMONIC = 'SEAL_MINGSHI_RECOGNITION';

export const TAC_LIAODI_JIXIAN = 'TAC_LIAODI_JIXIAN';
export const TAC_SHISHENG_SHIBAI = 'TAC_SHISHENG_SHIBAI';
export const TRT_YINGSHUI_QINGLIU = 'TRT_YINGSHUI_QINGLIU';
export const YINGCHUAN_NEGATIVE_RESTLESS = '心浮氣躁';

/** 暫定數值（規格未給，PROG-2-1903） */
export const YINGCHUAN_TUNING = {
    starWeights: [55, 30, 15] as readonly number[],
    debateGainDivisor: 2,
    debateEnergyCost: 10,
    tiredRiskPct: 5,
    tiredExtraEnergy: 10,
    exhaustedRiskPct: 35,
    setbackIntPct: 50,
    lastStandEnergyBelow: 20,
    lastStandPct: 5,
    liaodiIntMin: 85,
    liaodiTriHarmonicMin: 2,
    shishengIntMin: 92,
    qingliuPolMin: 80,
} as const;

const COMBO_PCT: Record<YingchuanComboType, number> = { THREE_OF_KIND: 200, TRI_HARMONIC: 250, COMMON: 130 };
const COMBO_TEXT: Record<YingchuanComboType, string> = {
    THREE_OF_KIND: '【同氣相求】：三論歸一，單系專研大突破！',
    TRI_HARMONIC: '【天人合一】：天時地利人和俱全，潁川特級大彩圈！',
    COMMON: '【通達事理】：理路明暢，平穩發揮。',
};
/** 同氣相求的主屬性（規格只說「智力或政治」，對應暫定） */
const CATEGORY_STAT: Record<EssayCardCategory, AcademyStatKey> = {
    [EssayCardCategory.SKY]: 'int',
    [EssayCardCategory.EARTH]: 'pol',
    [EssayCardCategory.PEOPLE]: 'pol',
};
const CATEGORIES: readonly EssayCardCategory[] = [EssayCardCategory.SKY, EssayCardCategory.EARTH, EssayCardCategory.PEOPLE];

export class YingchuanDebateResolver {
    /** 規格 §4：判定三張牌的連鎖類型；倍率另以百分比整數提供 */
    static evaluateCombo(selected: readonly EssayCard[]): { comboType: YingchuanComboType; multiplier: number; multiplierPct: number; description: string } {
        const unique = new Set(selected.map((c) => c.category)).size;
        const comboType: YingchuanComboType = selected.length === 3 && unique === 1 ? 'THREE_OF_KIND'
            : selected.length === 3 && unique === 3 ? 'TRI_HARMONIC' : 'COMMON';
        return { comboType, multiplier: COMBO_PCT[comboType] / 100, multiplierPct: COMBO_PCT[comboType], description: COMBO_TEXT[comboType] };
    }
}

/** 體力狀態折算（§7.1）：60~100 → 100%、30~59 → 90%、0~29 → 70% */
export function yingchuanStaminaPowerPct(energy: number): number {
    if (energy >= 60) return 100;
    if (energy >= 30) return 90;
    return 70;
}

export function yingchuanStateOf(state: AcademyStateSnapshot): YingchuanGimmickState {
    return state.gimmickStatePayload as unknown as YingchuanGimmickState;
}

export function isYingchuanDebateTurn(turn: number): boolean {
    return YINGCHUAN_DEBATE_TURNS.indexOf(turn) >= 0;
}

function drawCard(g: YingchuanGimmickState, rng: IDeterministicRng): EssayCard {
    const category = CATEGORIES[rng.nextInt(CATEGORIES.length, 'yc-card-category')];
    const star = (rng.pickWeighted(YINGCHUAN_TUNING.starWeights, 'yc-card-star') + 1) as 1 | 2 | 3;
    g.drawSerial += 1;
    return {
        id: `YC_${category}_${star}_${g.drawSerial}`,
        name: YINGCHUAN_CARD_NAMES[category][star - 1],
        category,
        star,
        debatePower: YINGCHUAN_STAR_POWER[star],
    };
}

function receiveCard(g: YingchuanGimmickState, card: EssayCard): void {
    if (g.handCards.length < YINGCHUAN_HAND_LIMIT) {
        g.handCards.push(card);
    } else {
        // 手牌已滿：新牌待玩家決定；前一張未決定的直接放棄
        g.pendingCard = card;
    }
}

function addTraitOnce(state: AcademyStateSnapshot, id: string): void {
    if (state.learnedTraits.indexOf(id) < 0 && state.learnedTraits.length < ACADEMY_TRAIT_SLOTS) state.learnedTraits.push(id);
}

function addTacticOnce(state: AcademyStateSnapshot, id: string): void {
    if (state.learnedTactics.indexOf(id) < 0 && state.learnedTactics.length < ACADEMY_TACTIC_SLOTS) state.learnedTactics.push(id);
}

function parseIndices(text: string): number[] | null {
    const parts = text.split(',').map((p) => Number(p.trim()));
    return parts.every((n) => Number.isInteger(n)) ? parts : null;
}

function resolveDebate(state: AcademyStateSnapshot, g: YingchuanGimmickState, indices: number[], rng: IDeterministicRng): void {
    const need = Math.min(3, g.handCards.length);
    const unique = new Set(indices);
    if (indices.length !== need || unique.size !== need || indices.some((i) => i < 0 || i >= g.handCards.length)) {
        throw new Error(`清談需從手牌選 ${need} 張不重複的牌`);
    }
    const selected = indices.map((i) => g.handCards[i]);
    g.handCards = g.handCards.filter((_, i) => !unique.has(i));
    const combo = YingchuanDebateResolver.evaluateCombo(selected);
    const energyBefore = state.energy;
    state.energy = Math.max(0, state.energy - YINGCHUAN_TUNING.debateEnergyCost);

    let setback = false;
    if (energyBefore < YINGCHUAN_TUNING.lastStandEnergyBelow && rng.chance(YINGCHUAN_TUNING.lastStandPct, 100, 'yc-last-stand')) {
        if (g.inspirations.indexOf(TAC_SHISHENG_SHIBAI) < 0) g.inspirations.push(TAC_SHISHENG_SHIBAI);
        state.chronicles.push({ turn: state.currentTurn, title: '背水立論', description: '心力憔悴仍登壇立論，悟得【十勝十敗】', highlightScore: 3 });
    } else if (energyBefore < 30 && rng.chance(YINGCHUAN_TUNING.exhaustedRiskPct, 100, 'yc-debate-setback')) {
        setback = true;
    }

    const rawPower = selected.reduce((sum, c) => sum + c.debatePower, 0);
    const power = Math.floor((rawPower * yingchuanStaminaPowerPct(energyBefore)) / 100);
    g.debatePointsPool += power;
    const comboPct = setback ? 100 : combo.multiplierPct;
    const gain = Math.floor((power * comboPct) / 100 / YINGCHUAN_TUNING.debateGainDivisor);

    if (combo.comboType === 'TRI_HARMONIC' && !setback) {
        addAcademyStatCapped(state.stats, 'int', gain);
        addAcademyStatCapped(state.stats, 'pol', gain);
        g.triHarmonicCount += 1;
        if (g.masterEndorsements.indexOf(YINGCHUAN_SEAL_TRI_HARMONIC) < 0) g.masterEndorsements.push(YINGCHUAN_SEAL_TRI_HARMONIC);
    } else {
        addAcademyStatCapped(state.stats, CATEGORY_STAT[majorityCategory(selected)], gain);
    }
    if (setback) markSetback(state, g, '清談受挫');

    const master = YINGCHUAN_MASTERS[state.currentTurn];
    if (master && power >= master.threshold && !setback) {
        if (g.masterEndorsements.indexOf(master.endorsement) < 0) g.masterEndorsements.push(master.endorsement);
        state.chronicles.push({ turn: state.currentTurn, title: `${master.master}評語`, description: `清談 ${power} 點，獲名士親筆評語`, highlightScore: 2 });
    }
    state.chronicles.push({ turn: state.currentTurn, title: '潁水清談', description: setback ? '心力不濟，辯難受挫' : combo.description, highlightScore: combo.comboType === 'TRI_HARMONIC' ? 2 : 1 });
    g.debatePending = false;
}

function majorityCategory(cards: readonly EssayCard[]): EssayCardCategory {
    let best = cards.length > 0 ? cards[0].category : EssayCardCategory.SKY;
    let bestCount = 0;
    for (const cat of CATEGORIES) {
        const count = cards.filter((c) => c.category === cat).length;
        if (count > bestCount) { best = cat; bestCount = count; }
    }
    return best;
}

function markSetback(state: AcademyStateSnapshot, g: YingchuanGimmickState, title: string): void {
    if (g.negativeTraits.indexOf(YINGCHUAN_NEGATIVE_RESTLESS) < 0) g.negativeTraits.push(YINGCHUAN_NEGATIVE_RESTLESS);
    state.chronicles.push({ turn: state.currentTurn, title, description: `心力憔悴，獲負面特質【${YINGCHUAN_NEGATIVE_RESTLESS}】`, highlightScore: 0 });
}

/** AUTO 代選：手牌依點數由高到低出 3 張 */
function autoDebateChoice(g: YingchuanGimmickState): string {
    const order = g.handCards.map((c, i) => ({ i, p: c.debatePower })).sort((a, b) => b.p - a.p || a.i - b.i);
    const picks = order.slice(0, 3).map((o) => o.i);
    return picks.length > 0 ? `DEBATE:${picks.join(',')}` : 'SKIP';
}

export const YINGCHUAN_GIMMICK: IAcademyGimmickHandler = {
    academyId: AcademyId.YINGCHUAN,

    initGimmickState(): Record<string, unknown> {
        const g: YingchuanGimmickState = {
            handCards: [], pendingCard: null, debatePointsPool: 0, masterEndorsements: [],
            triHarmonicCount: 0, inspirations: [], negativeTraits: [], debatePending: isYingchuanDebateTurn(1), drawSerial: 0,
        };
        return g as unknown as Record<string, unknown>;
    },

    onTurnStart(): void {
        // 清談大會由 onTurnEnd 預先標記，開場無事
    },

    onTrain(state: AcademyStateSnapshot, targetStat: AcademyStatKey, rng: IDeterministicRng): AcademyTrainResult {
        const g = yingchuanStateOf(state);
        const logs: string[] = [];
        let statBonusPct = 100;
        let extraEnergyCost = 0;
        if (state.energy < 30) {
            if (rng.chance(YINGCHUAN_TUNING.exhaustedRiskPct, 100, 'yc-train-setback')) {
                if (targetStat === 'int') statBonusPct = YINGCHUAN_TUNING.setbackIntPct;
                markSetback(state, g, '強行苦讀受挫');
                logs.push('setback');
            }
        } else if (state.energy < 60 && rng.chance(YINGCHUAN_TUNING.tiredRiskPct, 100, 'yc-train-tired')) {
            extraEnergyCost = YINGCHUAN_TUNING.tiredExtraEnergy;
            logs.push('tired');
        }
        if (YINGCHUAN_DRAW_STATS.indexOf(targetStat) >= 0) {
            const card = drawCard(g, rng);
            receiveCard(g, card);
            logs.push(`draw:${card.id}`);
        }
        return { statBonusPct, extraEnergyCost, gimmickLogs: logs };
    },

    onTurnEnd(state: AcademyStateSnapshot): void {
        // 下一回合是清談大會就先標記，玩家須先清談才能繼續訓練
        yingchuanStateOf(state).debatePending = isYingchuanDebateTurn(state.currentTurn + 1);
    },

    onInteract(state: AcademyStateSnapshot, optionId: string | undefined, rng: IDeterministicRng): void {
        const g = yingchuanStateOf(state);
        const option = optionId ?? '';
        if (option.startsWith('DISCARD:')) {
            const index = Number(option.slice('DISCARD:'.length));
            if (!g.pendingCard || !Number.isInteger(index) || index < 0 || index >= g.handCards.length) {
                throw new Error('沒有待收的新牌，或丟棄位置不合法');
            }
            g.handCards[index] = g.pendingCard;
            g.pendingCard = null;
        } else if (option === 'DECLINE') {
            g.pendingCard = null;
        } else if (option.startsWith('DEBATE:')) {
            if (!g.debatePending) throw new Error('本回合不是清談大會');
            const indices = parseIndices(option.slice('DEBATE:'.length));
            if (!indices) throw new Error(`清談選牌格式錯誤：${option}`);
            resolveDebate(state, g, indices, rng);
        } else if (option === 'SKIP') {
            if (!g.debatePending) throw new Error('本回合不是清談大會');
            if (g.handCards.length > 0) throw new Error('手中有牌時不能略過清談');
            g.debatePending = false;
        } else {
            throw new Error(`潁川書院不認得的互動：${option}`);
        }
    },

    blockingInteraction(state: AcademyStateSnapshot): string | null {
        return yingchuanStateOf(state).debatePending ? 'DEBATE' : null;
    },

    autoInteraction(state: AcademyStateSnapshot): string {
        return autoDebateChoice(yingchuanStateOf(state));
    },

    onGraduate(state: AcademyStateSnapshot): void {
        const g = yingchuanStateOf(state);
        if (g.masterEndorsements.indexOf(YINGCHUAN_MASTERS[36].endorsement) < 0) return;
        if (state.stats.int >= YINGCHUAN_TUNING.liaodiIntMin && g.triHarmonicCount >= YINGCHUAN_TUNING.liaodiTriHarmonicMin) {
            addTacticOnce(state, TAC_LIAODI_JIXIAN);
        }
        const hasSimaSeal = g.masterEndorsements.indexOf(YINGCHUAN_MASTERS[6].endorsement) >= 0;
        if (state.stats.int >= YINGCHUAN_TUNING.shishengIntMin && (hasSimaSeal || g.inspirations.indexOf(TAC_SHISHENG_SHIBAI) >= 0)) {
            addTacticOnce(state, TAC_SHISHENG_SHIBAI);
        }
        if (state.stats.pol >= YINGCHUAN_TUNING.qingliuPolMin) addTraitOnce(state, TRT_YINGSHUI_QINGLIU);
    },
};
