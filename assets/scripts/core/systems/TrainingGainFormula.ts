// @spec-source → 育成與戰鬥公式基準手冊 §2.1 屬性增長總公式；WBS FORM-01（PROG-2-1290）
/**
 * TrainingGainFormula — 培育單次屬性增長的總公式與各乘區（純邏輯，不依賴 cc，不擲骰）。
 *
 * 總公式：獲得屬性值 = (Base + Σ教官加值) × (1 + Gr) × M_Morale × M_Training × M_Friendship × M_Crowd
 *
 * - 加法區：Base 與教官加值直接相加。
 * - 資質 Gr：武將成長率，0.2 = +20%。
 * - M_Morale = 1 + 基礎運勢係數 × (1 + Σ教官運勢效果提升)，預設基礎運勢係數 0.2。
 * - M_Training = 1 + Σ教官陪伴效果提升（加法後乘入）。
 * - M_Friendship = Π(1 + 觸發傾囊相授的教官加成)，全公式唯一的連乘區。
 * - M_Crowd = 1 + 5% × 未觸發傾囊的閒雜角色人數（暫定：以加法計，「額外 +5%」每人一次）。
 *
 * 暫定：本模組只算公式，尚未接進 NurtureSystem.computeStatGain（接線屬 FORM-02，待使用者裁決）。
 *
 * Unity 對照：像一條 Shader 的乘法鏈，加法區先加在一起，再一個個乘上各自的 Multiplier，
 * 只有傾囊相授那一段用 Π 做連乘，其他區都是 1 + 加總 的形式。
 */

/** 預設基礎運勢係數（手冊 §2.1：預設最佳運勢為 0.2） */
export const DEFAULT_BASE_MORALE = 0.2;

/** 每位未觸發傾囊的閒雜角色在同一格帶來的人數補正（手冊 §2.1） */
export const CROWD_BONUS_PER_EXTRA = 0.05;

export interface TrainingGainInput {
    /** 設施等級給的基礎值（例：Lv5 騎術營 15 STR） */
    base: number;
    /** 各教官卡的固定加值（加法區） */
    cardBonuses: readonly number[];
    /** 武將資質 Gr，0.2 = +20% */
    generalGrowth: number;
    /** 目前基礎運勢係數，缺省為 DEFAULT_BASE_MORALE */
    baseMorale?: number;
    /** 各教官的運勢效果提升（加總後放大基礎運勢） */
    moraleBoosts: readonly number[];
    /** 各教官的陪伴效果提升（加總，加法後乘入） */
    trainingBoosts: readonly number[];
    /** 觸發傾囊相授的教官專屬加成（各自乘入，連乘） */
    friendshipBursts: readonly number[];
    /** 未觸發傾囊的閒雜角色人數 */
    extraCrowd: number;
}

export interface TrainingGainBreakdown {
    additive: number;
    growth: number;
    morale: number;
    training: number;
    friendship: number;
    crowd: number;
    gain: number;
}

function sum(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

/** 依手冊 §2.1 算出屬性獲得值，並回傳各乘區，方便畫面與測試對照。不取整、不擲骰。 */
export function trainingGainBreakdown(input: TrainingGainInput): TrainingGainBreakdown {
    const additive = input.base + sum(input.cardBonuses);
    const growth = 1 + input.generalGrowth;
    const baseMorale = input.baseMorale ?? DEFAULT_BASE_MORALE;
    const morale = 1 + baseMorale * (1 + sum(input.moraleBoosts));
    const training = 1 + sum(input.trainingBoosts);
    const friendship = input.friendshipBursts.reduce((product, burst) => product * (1 + burst), 1);
    const crowd = 1 + CROWD_BONUS_PER_EXTRA * input.extraCrowd;
    const gain = additive * growth * morale * training * friendship * crowd;
    return { additive, growth, morale, training, friendship, crowd, gain };
}
