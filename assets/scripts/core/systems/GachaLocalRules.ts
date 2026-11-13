// @spec-source → 轉蛋系統.md §L；PROG-2-9020 本機轉蛋各池規則
import type { LocalGachaRollOptions, LocalGachaService } from '../services/LocalGachaService';
import { pickGachaCurrency, quoteGachaCost } from './GachaCurrency';
import type { GachaPoolRule, GachaSystem } from './GachaSystem';

export interface LocalGachaRuleOptions {
    rollOptions?: LocalGachaRollOptions;
    /** 預覽場景指定的靈玉單價；沒給時依規格單抽 150、十連 1500（銅錢符優先） */
    gemsCostPerPull?: number;
}

/** 名將池：扣靈玉或銅錢符，抽將入名冊 */
export function heroPoolRule(service: LocalGachaService, opts: LocalGachaRuleOptions = {}): GachaPoolRule {
    return {
        async pull(req) {
            const fixed = opts.gemsCostPerPull;
            const pick = fixed !== undefined
                ? { coin: 'gems' as const, cost: req.drawCount * fixed }
                : pickGachaCurrency('HERO', req.drawCount, { gems: service.getCurrencyAmount('gems'), bronze: service.getCurrencyAmount('bronze') });
            if (!pick) throw new Error(`靈玉或銅錢符不足，需要 ${quoteGachaCost(req.drawCount)}`);
            return service.performLocalGacha(req.poolId, req.drawCount, pick.cost, req.generals, opts.rollOptions ?? {}, pick.coin);
        },
    };
}

/** 紅顏池：扣召喚券，抽女性武將入名冊 */
export function beautyPoolRule(service: LocalGachaService): GachaPoolRule {
    return {
        async pull(req) {
            if (req.generals.length === 0) throw new Error('紅顏池目前沒有可抽的武將');
            return service.performPoolTicketSummon(req.poolId, req.drawCount, req.generals);
        },
    };
}

/** 支援卡池：扣支援券，只產生教官卡、不入名冊 */
export function mentorPoolRule(service: LocalGachaService): GachaPoolRule {
    return {
        async pull(req) {
            if (req.generals.length === 0) throw new Error('支援卡池目前沒有可抽的教官');
            return service.performSupportCardSummon(req.poolId, req.drawCount, req.generals);
        },
    };
}

/** 依池類型註冊本機規則；extraHeroPoolIds 給不在設定檔裡的舊池 id（常設池 GENERAL_STANDARD_01） */
export function registerLocalGachaRules(system: GachaSystem, service: LocalGachaService, opts: LocalGachaRuleOptions = {}, extraHeroPoolIds: readonly string[] = []): GachaSystem {
    const hero = heroPoolRule(service, opts);
    system.registerType('hero', hero).registerType('support', beautyPoolRule(service)).registerType('mentor', mentorPoolRule(service));
    for (const id of extraHeroPoolIds) system.registerPool(id, hero);
    return system;
}
