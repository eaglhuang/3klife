// @spec-source → 因子色彩職能標籤與卡片視覺契約規格書 (doc_spec_0321) §1、§3、§4（FATE-09、FATE-05，PROG-2-1947）
/**
 * GeneRoleTag — 七色因子對應職能標籤、主職能判定與 Design Token 表（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 藍 COMBAT_OFFICER、粉 VANGUARD_BERSERKER、綠 TACTICAL_STRATEGIST、金 SUPREME_COMMANDER、
 *   紫 NOBLE_SAGE、白 ELITE_COMMANDO、銀 CIVIL_GOVERNOR。
 * - 主職能：有金色因子 → 統帥三軍；否則取星級總和最高色；平手依 粉 > 藍 > 綠 > 紫 > 白 > 銀。
 * - UI 一律走 token，不在元件寫死色碼；hex 只作 token 的預設值。
 *
 * 既有 FactorInheritance.FactorColor 為 blue/pink/green/purple/white/red，尚無 gold/silver；
 * 'red' 對應哪個職能規格未寫，本檔不收 'red'（呼叫端略過），待裁決。
 * 暫定：卡片徽章、光暈與因子槽 UI 渲染另卡。
 * Unity 對照：像一張 ScriptableObject 色彩主題表 + 一個 static 判定函式。
 */

export type GeneRoleColor = 'blue' | 'pink' | 'green' | 'gold' | 'purple' | 'white' | 'silver';
export type GeneRoleTagId =
    | 'COMBAT_OFFICER' | 'VANGUARD_BERSERKER' | 'TACTICAL_STRATEGIST' | 'SUPREME_COMMANDER'
    | 'NOBLE_SAGE' | 'ELITE_COMMANDO' | 'CIVIL_GOVERNOR';

export const GENE_COLOR_ROLE: Readonly<Record<GeneRoleColor, GeneRoleTagId>> = {
    blue: 'COMBAT_OFFICER',
    pink: 'VANGUARD_BERSERKER',
    green: 'TACTICAL_STRATEGIST',
    gold: 'SUPREME_COMMANDER',
    purple: 'NOBLE_SAGE',
    white: 'ELITE_COMMANDO',
    silver: 'CIVIL_GOVERNOR',
};

export const GENE_ROLE_THEME_TOKENS: Readonly<Record<GeneRoleTagId, { token: string; hex: string; label: string }>> = {
    COMBAT_OFFICER: { token: 'color-gene-combat', hex: '#2E6BE6', label: '戰鬥武官' },
    VANGUARD_BERSERKER: { token: 'color-gene-vanguard', hex: '#E63956', label: '猛將先鋒' },
    TACTICAL_STRATEGIST: { token: 'color-gene-tactics', hex: '#28A745', label: '儒將智囊' },
    SUPREME_COMMANDER: { token: 'color-gene-supreme', hex: '#D4AF37', label: '統帥三軍' },
    NOBLE_SAGE: { token: 'color-gene-noble', hex: '#8A2BE2', label: '名流清貴' },
    ELITE_COMMANDO: { token: 'color-gene-commando', hex: '#E0E0E0', label: '特戰敢死' },
    CIVIL_GOVERNOR: { token: 'color-gene-civil', hex: '#A8B2C1', label: '執政民官' },
};

/** 平手仲裁順序（金色另走優先規則，不在此列） */
export const GENE_ROLE_TIE_ORDER: readonly GeneRoleColor[] = ['pink', 'blue', 'green', 'purple', 'white', 'silver'];

/** 主因子 ★4 以上才有呼吸光暈 */
export const HALO_MIN_STAR = 4;

export interface RoleGene {
    color: string;
    star: number;
}

function isRoleColor(color: string): color is GeneRoleColor {
    return Object.prototype.hasOwnProperty.call(GENE_COLOR_ROLE, color);
}

/** 主職能標籤；沒有可辨識色的因子時回 null。 */
export function primaryRoleTag(genes: readonly RoleGene[]): GeneRoleTagId | null {
    const known = genes.filter((g) => isRoleColor(g.color));
    if (known.some((g) => g.color === 'gold')) return 'SUPREME_COMMANDER';
    const totals = new Map<GeneRoleColor, number>();
    for (const g of known) totals.set(g.color as GeneRoleColor, (totals.get(g.color as GeneRoleColor) ?? 0) + Math.max(0, g.star));
    let best: GeneRoleColor | null = null;
    for (const color of GENE_ROLE_TIE_ORDER) {
        const total = totals.get(color);
        if (total === undefined) continue;
        if (best === null || total > (totals.get(best) ?? 0)) best = color;
    }
    return best ? GENE_COLOR_ROLE[best] : null;
}

/** 是否顯示呼吸光暈：任一可辨識色因子達 ★4。 */
export function hasRoleHalo(genes: readonly RoleGene[]): boolean {
    return genes.some((g) => isRoleColor(g.color) && g.star >= HALO_MIN_STAR);
}
