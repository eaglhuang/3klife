// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-9143
/**
 * 轉蛋結果「目前展示的武將」與提示橫幅（純邏輯，不依賴 cc）。
 *
 * 原因：以前入冊後把一整批武將的「應召而來」「名門」提示一次丟進 toast 佇列，
 * 畫面中央明明是孟獲，上方卻輪播呂玲綺的提示（使用者 11/17 回報）。
 * 規則：提示橫幅只跟「目前展示這位武將」綁定——展示（或點選切換到）誰，才跳出誰的提示，
 * 下方台詞也在這一刻才換上；沒換人就不重複跳。
 */
import type { GeneralUltimateSlotConfig } from '../../core/models/GeneralUnit';
import { famousClanLines } from '../../core/systems/FamousClan';
import { gachaFemaleLines } from '../../core/systems/FemaleSourcePresenter';
import { rebirthBreakthroughLine } from '../../core/systems/NumericalScriptLines';
import { rebirthVoiceLines } from '../../core/systems/Rebirth';
import { ultimateUnlockLines } from '../../core/systems/UltimateScriptLines';
import type { GachaLineTable } from './GachaLines';
import { formatGachaLine } from './GachaLines';

/** 展示提示橫幅的 toast key：換人時只收掉自己這條 */
export const GACHA_SHOWCASE_TOAST_KEY = 'gacha-showcase';

export interface ShowcaseGeneral { id: string; name: string; gender?: string; description?: string }

export interface ShowcaseBannerContext {
    /** 本次新入名冊的武將 id（重複持有不說「應召而來」） */
    addedIds: ReadonlySet<string>;
    /** 本次轉生結果（整批；內部只取展示武將自己的） */
    rebirths: ReadonlyArray<{ id: string; overflow: boolean; rebirthCount: number; attributeCap: number; mercenaryStatCap?: number }>;
    generalOf: (id: string) => { name: string; ultimateSlots?: readonly GeneralUltimateSlotConfig[] } | undefined;
    ultimateNameOf: (ultimateId: string) => string | undefined;
}

/**
 * 這位武將被展示時要跳的提示橫幅：女將登場、史實名門、轉生台詞、轉生突破、奧義覺醒。
 * 全部只取「這位」的，不會混進同批其他武將的提示。
 */
export function showcaseBannerLines(general: ShowcaseGeneral, ctx: ShowcaseBannerContext): string[] {
    const own = ctx.rebirths.filter((entry) => entry.id === general.id);
    const breakthrough = rebirthBreakthroughLine(own);
    return [
        ...(ctx.addedIds.has(general.id) ? [...gachaFemaleLines([general]), ...famousClanLines([general])] : []),
        ...rebirthVoiceLines(own, (id) => ctx.generalOf(id)?.name),
        ...(breakthrough ? [breakthrough] : []),
        ...ultimateUnlockLines(own, ctx.generalOf, ctx.ultimateNameOf),
    ];
}

/** 切換展示：同一位不重複觸發（回 true 才需要換畫面並跳提示） */
export function shouldSwitchShowcase(currentId: string | null, nextId: string): boolean {
    return currentId !== nextId;
}

/** 展示區下方台詞：台詞表優先，沒有退回武將描述，再沒有用通用句 */
export function showcaseDesc(general: ShowcaseGeneral, table: GachaLineTable): string {
    return formatGachaLine(table, general.id) ?? (general.description || '義薄雲天 · 威震華夏 · 萬世流芳');
}
