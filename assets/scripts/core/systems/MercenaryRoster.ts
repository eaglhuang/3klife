// @spec-source → WBS v3 MERC-04（結義轉永久）、MERC-12（數值快照）；PM 修正裁定 2026-10-13（好感滿 60 為門檻、費用從結義點數餘額扣、稀有度與數值由 generals.json 讀取，皆暫定）
/**
 * MercenaryRoster — 傭兵結義後寫入武將名冊的純邏輯計算，不依賴 cc。
 *
 * 流程：武將模板與 generalId 相符 → 試用倒數完成 → 好感滿 60（門檻，不扣） → 依模板稀有度查費用表扣結義點數 → 產出武將與冷卻。
 * 任何一步失敗都回傳原因且不改狀態；成功時回傳新的傭兵與冷卻，由呼叫端（GameSession）寫入名冊與存檔。
 *
 * 結義點數餘額來源（GCH-06 #164 存檔的 bondPoints）尚未接上，目前由呼叫端傳入。
 * Unity 對照：像把角色 ScriptableObject 模板複製一份再加入背包，模板本身不動。
 */
import { GeneralConfig, GeneralDetailRarityTier } from '../models/GeneralUnit';
import { AFFECTION_CAP } from './MercenaryAffection';
import { bondMercenary, MercenaryRejectReason, MercenaryState } from './MercenaryBond';
import { BondRarity, BondRejectReason, BondStats, bondToPermanent } from './MercenaryBondPermanent';
import { PoolCooldown, startCooldownAfterBond } from './MercenaryDeparture';

export type RosterBondRejectReason = 'not-found' | 'general-mismatch' | 'affection-not-full' | MercenaryRejectReason | BondRejectReason;

export interface RosterBondResult {
    ok: boolean;
    reason?: RosterBondRejectReason;
    /** 只有 ok 時有值：寫入名冊的武將（模板複製）。 */
    general?: GeneralConfig;
    /** 只有 ok 時有值：已結義（Bonded）的傭兵，好感不變。 */
    mercenary?: MercenaryState;
    /** 只有 ok 時有值：加入 30 天冷卻後的冷卻表。 */
    cooldowns?: PoolCooldown[];
    pointsSpent: number;
}

/** 暫定：稀有度分級對應（規格未定，待 PM 確認）。 */
export const RARITY_BY_TIER: Readonly<Record<GeneralDetailRarityTier, BondRarity>> = Object.freeze({
    common: 'R',
    rare: 'SR',
    epic: 'SSR',
    legendary: 'UR',
    mythic: 'UR',
});

/** 好感門檻：好感滿上限才能結義，且不扣好感。 */
export const AFFECTION_BOND_THRESHOLD = AFFECTION_CAP;

/** 取得模板的稀有度；無 rarityTier 或不認得時回傳 undefined。 */
export function rarityOfTemplate(template: Readonly<GeneralConfig>): BondRarity | undefined {
    const tier = template.rarityTier;
    return tier !== undefined && Object.prototype.hasOwnProperty.call(RARITY_BY_TIER, tier) ? RARITY_BY_TIER[tier] : undefined;
}

/**
 * 結義轉永久的數值快照（MERC-12）。GeneralConfig 沒有 POL/CHR，暫以 lea 代入（暫定）。
 */
export function statsOfTemplate(template: Readonly<GeneralConfig>): BondStats {
    return {
        STR: template.str ?? 0,
        INT: template.int ?? 0,
        POL: template.lea ?? 0,
        CHR: template.lea ?? 0,
        LUK: template.luk ?? 0,
    };
}

/**
 * 結義入名冊的計算。
 * - template：generals.json 中與傭兵 generalId 相符的武將模板（稀有度與五圍皆由此讀取）。
 * - bondPoints：目前結義點數餘額（來源待 GCH-06 接上）。
 * - today：目前日序，用來計算 30 天冷卻。
 */
export function bondMercenaryToRoster(
    mercenary: Readonly<MercenaryState>,
    template: Readonly<GeneralConfig>,
    bondPoints: number,
    cooldowns: readonly PoolCooldown[],
    today: number,
): RosterBondResult {
    const reject = (reason: RosterBondRejectReason): RosterBondResult => ({ ok: false, reason, pointsSpent: 0 });
    if (mercenary.generalId !== template.id) return reject('general-mismatch');

    const bonded = bondMercenary({ ...mercenary });
    if (!bonded.ok) return reject(bonded.reason!);

    if ((mercenary.affection ?? 0) < AFFECTION_BOND_THRESHOLD) return reject('affection-not-full');

    const rarity = rarityOfTemplate(template);
    if (!rarity) return reject('unknown-rarity');

    const points = bondToPermanent({ bondPoints }, rarity, 'points', statsOfTemplate(template));
    if (!points.ok) return reject(points.reason!);

    return {
        ok: true,
        pointsSpent: points.pointsSpent,
        general: { ...template },
        mercenary: { ...bonded.state },
        cooldowns: startCooldownAfterBond(mercenary.uid, today, cooldowns, template.id),
    };
}
