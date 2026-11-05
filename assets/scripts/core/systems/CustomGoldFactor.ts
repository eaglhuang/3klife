// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §E #2、§F-1 Tier 3、§G、§H UI_G4_CUSTOM_GOLD_BORN；PROG-2-1799
/**
 * CustomGoldFactor — 傳奇後代退役時凝練家族專屬金因子（純邏輯，不依賴 cc）
 *
 * 暫定（可逆）：
 * - 六色系統沒有金色，機制上歸白色（與生平印記同），Lv20 才揭露。
 * - 命名規格只給 {GoldFactorName}，先用「武將名＋家學」；命名權未做。
 * - 星級沿用主藍因子；因子目前沒有實際加成，與生平印記相同。
 *
 * Unity 對照：等於執行期產生一筆 FactorDefinition，存進存檔後併回字典。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import type { ClanTier } from './ClanTier';
import { resolveFactorColor, type FactorDefinition, type FactorDictionary } from './FactorInheritance';

export const CUSTOM_GOLD_MIN_EP = 85;
export const CUSTOM_GOLD_MIN_BLUE_STAR = 4;
/** §F-1：天下高門才解鎖 */
export const CUSTOM_GOLD_CLAN_TIER: ClanTier = 3;
const CUSTOM_GOLD_ID_PREFIX = 'gold_clan_';

export function customGoldGeneOf(general: GeneralConfig | null | undefined): GeneralGeneConfig | null {
    return (general?.genes ?? []).find((gene) => (gene.id ?? '').startsWith(CUSTOM_GOLD_ID_PREFIX)) ?? null;
}

function mainBlueStar(general: GeneralConfig, dictionary: FactorDictionary | undefined): number {
    const stars = (general.genes ?? [])
        .filter((gene) => !!gene.id && resolveFactorColor(gene.id, dictionary, gene) === 'blue')
        .map((gene) => gene.level ?? 0);
    return stars.length > 0 ? Math.max(...stars) : 0;
}

export function canForgeCustomGold(general: GeneralConfig, dictionary: FactorDictionary | undefined, clanTier: ClanTier): boolean {
    if (clanTier < CUSTOM_GOLD_CLAN_TIER) return false;
    const carrier = general as GeneralConfig & { fatherId?: string; motherId?: string };
    if (!carrier.fatherId && !carrier.motherId) return false;
    if ((general.ep ?? 0) < CUSTOM_GOLD_MIN_EP) return false;
    return mainBlueStar(general, dictionary) >= CUSTOM_GOLD_MIN_BLUE_STAR;
}

/** 達標就回傳帶新因子的武將與字典定義；未達標或已有專屬因子回傳 null */
export function forgeCustomGold(
    general: GeneralConfig,
    dictionary: FactorDictionary | undefined,
    clanTier: ClanTier,
): { general: GeneralConfig; definition: FactorDefinition } | null {
    if (customGoldGeneOf(general) || !canForgeCustomGold(general, dictionary, clanTier)) return null;
    const definition: FactorDefinition = { id: `${CUSTOM_GOLD_ID_PREFIX}${general.id}`, displayName: `${general.name}家學`, color: 'white', maxLevel: 5 };
    const gene: GeneralGeneConfig = {
        id: definition.id,
        displayName: definition.displayName,
        type: 'white',
        level: mainBlueStar(general, dictionary),
        description: `${general.name} 凝練的宗脈家傳金因子，代代流傳。`,
    };
    return { general: { ...general, genes: [...(general.genes ?? []), gene] }, definition };
}

export function customGoldBornLine(name: string, ep: number, factorName: string): string {
    return `【開創家學】${name} 憑藉彪炳功業（EP ${ep}）與極境天賦，為家族凝練出傳世金因子：【${factorName}】！`;
}

/** 舊存檔沒有此欄位；壞資料整筆略過 */
export function normalizeCustomFactors(raw: unknown): FactorDefinition[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((def): def is FactorDefinition => !!def && typeof (def as FactorDefinition).id === 'string' && (def as FactorDefinition).id.startsWith(CUSTOM_GOLD_ID_PREFIX))
        .map((def) => ({ ...def }));
}

/** 回傳併入自創因子的新字典，不改動原字典；沒有自創因子就回傳原字典 */
export function mergeCustomFactors(base: FactorDictionary | undefined, custom: readonly FactorDefinition[]): FactorDictionary | undefined {
    if (custom.length === 0) return base;
    const merged: FactorDictionary = new Map(base ?? []);
    for (const def of custom) merged.set(def.id, def);
    return merged;
}
