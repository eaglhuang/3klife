// @spec-source → WBS v3 MERC-04（結義轉永久）、MERC-12（數值快照）；PM 暫定裁定 2026-10-13（結義點數=好感、generalId 取模板、數值對應）
/**
 * MercenaryRoster — 傭兵結義後寫入武將名冊的純邏輯計算，不依賴 cc。
 *
 * 流程：確認武將模板與傭兵 generalId 相符 → 倒數完成才能結義 → 好感扣結義點數 → 產出武將與冷卻。
 * 任何一步失敗都回傳原因且不改狀態；成功時回傳新的傭兵與冷卻，由呼叫端（GameSession）寫入名冊與存檔。
 *
 * 數值對應（PM 暫定）：str=STR、int=INT、luk=LUK、lea=round((POL+CHR)/2)。
 * Unity 對照：像把角色 ScriptableObject 模板複製一份，再把執行期數值覆寫進去，模板本身不動。
 */
import { GeneralConfig } from '../models/GeneralUnit';
import { bondMercenary, MercenaryRejectReason, MercenaryState } from './MercenaryBond';
import { BondRejectReason, BondStats, bondToPermanent } from './MercenaryBondPermanent';
import { PoolCooldown, startCooldownAfterBond } from './MercenaryDeparture';

export type RosterBondRejectReason = 'not-found' | 'general-mismatch' | MercenaryRejectReason | BondRejectReason;

export interface RosterBondResult {
    ok: boolean;
    reason?: RosterBondRejectReason;
    /** 只有 ok 時有值：寫入名冊的武將（模板複製後覆寫數值）。 */
    general?: GeneralConfig;
    /** 只有 ok 時有值：已結義（Bonded）且好感扣除結義點數後的傭兵。 */
    mercenary?: MercenaryState;
    /** 只有 ok 時有值：加入 30 天冷卻後的冷卻表。 */
    cooldowns?: PoolCooldown[];
    pointsSpent: number;
}

/** 依 PM 暫定的數值對應，把傭兵數值覆寫到武將模板上。 */
export function generalFromBondStats(template: Readonly<GeneralConfig>, stats: Readonly<BondStats>): GeneralConfig {
    return {
        ...template,
        str: stats.STR,
        int: stats.INT,
        luk: stats.LUK,
        lea: Math.round((stats.POL + stats.CHR) / 2),
    };
}

/**
 * 結義入名冊的計算。
 * - template：generals.json 中與傭兵 generalId 相符的武將模板。
 * - rarity：稀有度（R/SR/SSR/UR），由呼叫端決定來源。
 * - today：目前日序，用來計算 30 天冷卻。
 */
export function bondMercenaryToRoster(
    mercenary: Readonly<MercenaryState>,
    template: Readonly<GeneralConfig>,
    stats: Readonly<BondStats>,
    rarity: string,
    cooldowns: readonly PoolCooldown[],
    today: number,
): RosterBondResult {
    const reject = (reason: RosterBondRejectReason): RosterBondResult => ({ ok: false, reason, pointsSpent: 0 });
    if (mercenary.generalId !== template.id) return reject('general-mismatch');

    const bonded = bondMercenary({ ...mercenary });
    if (!bonded.ok) return reject(bonded.reason!);

    const points = bondToPermanent({ bondPoints: mercenary.affection ?? 0 }, rarity, 'points', stats);
    if (!points.ok) return reject(points.reason!);

    return {
        ok: true,
        pointsSpent: points.pointsSpent,
        general: generalFromBondStats(template, stats),
        mercenary: { ...bonded.state, affection: points.wallet.bondPoints },
        cooldowns: startCooldownAfterBond(mercenary.uid, today, cooldowns, template.id),
    };
}
