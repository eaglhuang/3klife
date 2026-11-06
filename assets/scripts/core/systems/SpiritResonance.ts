// @spec-source → 英靈世家系統 §E-5 家族光效三階、§I SpiritCard.Resonance_Band／Glow_State（SPI-05，PROG-2-1928）
/**
 * SpiritResonance — 英靈卡共鳴階判定與家族加成封頂（純邏輯，不依賴 cc）。
 *
 * - 插在自身模板武將身上：SELF_RESONANCE（強光，完整加成）。
 * - 插在同家族成員身上：FAMILY_RESONANCE（暖光，加成高於一般卡但必須封頂）。
 * - 其他：ECHO_RESONANCE。
 *
 * 暫定：規格只定義 StrongGlow，WarmGlow／FaintGlow 為本卡命名；加成數值與封頂值規格未給，由呼叫端傳入。
 * Unity 對照：像依裝備者身分切換 enum，再由 enum 決定特效與數值上限。
 */

export type ResonanceBand = 'SELF_RESONANCE' | 'FAMILY_RESONANCE' | 'ECHO_RESONANCE';
export type GlowState = 'StrongGlow' | 'WarmGlow' | 'FaintGlow';

export interface ResonanceCard {
    General_Template_ID: string;
    Spirit_Family_Key: string;
}

export interface ResonanceWearer {
    templateId: string | null;
    familyKey: string | null;
}

const GLOW_OF: Record<ResonanceBand, GlowState> = {
    SELF_RESONANCE: 'StrongGlow',
    FAMILY_RESONANCE: 'WarmGlow',
    ECHO_RESONANCE: 'FaintGlow',
};

export function resonanceBandOf(card: Readonly<ResonanceCard>, wearer: Readonly<ResonanceWearer>): ResonanceBand {
    if (wearer.templateId && wearer.templateId === card.General_Template_ID) return 'SELF_RESONANCE';
    if (wearer.familyKey && wearer.familyKey === card.Spirit_Family_Key) return 'FAMILY_RESONANCE';
    return 'ECHO_RESONANCE';
}

export function glowStateOf(band: ResonanceBand): GlowState {
    return GLOW_OF[band];
}

/** 依共鳴階給加成：SELF 完整；FAMILY 取 min(家族加成, 封頂)；ECHO 用一般卡加成。 */
export function resonanceBonus(
    band: ResonanceBand, values: { full: number; family: number; familyCap: number; echo: number },
): number {
    if (band === 'SELF_RESONANCE') return values.full;
    if (band === 'FAMILY_RESONANCE') return Math.min(values.family, values.familyCap);
    return values.echo;
}
