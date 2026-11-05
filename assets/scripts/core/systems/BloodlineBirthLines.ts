// @spec-source → 血統理論系統.md §G 祖輩顯靈、血脈共鳴，§H UI_ANCESTOR_GHOST、UI_WILD_GENE；留存系統.md §G 世代傳承；PROG-2-1775、PROG-2-1778
/**
 * BloodlineBirthLines — 子嗣出生時的血統提示句（純邏輯，不依賴 cc）。
 *
 * 暫定（可逆）：
 * - 規格的「雙方祖先皆為北境之民」要有地域資料，目前沒有，改寫成不提地名的句子。
 * - 顯靈只算真實祖先（nameOf 對虛擬祖先回傳 null），只挑一位：世代最遠的因子來源，同世代取第一個查得到姓名的祖先。
 * - 句子不提因子名：子嗣因子出生時還是鎖定狀態。
 * - 世代傳承句放在出生時：子嗣的因子存檔沒有記來源祖先，覺醒當下查不到是誰傳的；曾祖輩用這句取代顯靈句。
 *
 * Unity 對照：像一個把結算結果轉成顯示字串的靜態 Formatter。
 */
import { bloodFatigueBirthLines, normalizeBloodFatigue, type BloodFatigueOutcome } from './BloodFatigue';
import { outcrossMedicLine, synergyWeddingLine } from './BondingStoryLines';
import { highEpLine } from './NumericalScriptLines';
import type { InheritedFactor } from './FactorInheritance';

export const BLOODLINE_RESONANCE_LINE = '雙方祖先血脈相通，血脈共鳴已達極致！';
export const WILD_GENE_LINE = '血脈中蘊含未知的基因突變！';
const GREAT_GRANDPARENT_GENERATION = 3;

export function ancestorGhostLine(name: string): string {
    return `${name} 的英靈顯現！${name}虛影：「此子血脈中有我的影子！」`;
}

export function generationLegacyLine(descendant: string, ancestor: string): string {
    return `驚人發現！${descendant} 身上顯現了曾祖 ${ancestor} 的因子！`;
}

/** 繼承自祖輩以上、世代最遠且查得到姓名的祖先；沒有回傳 null */
function farthestAncestor(factors: readonly InheritedFactor[], nameOf: (uid: string) => string | null): { name: string; generation: number } | null {
    const distant = factors.filter((factor) => factor.generation >= 2).sort((a, b) => b.generation - a.generation);
    for (const factor of distant) {
        for (const uid of factor.sourceUids) {
            const name = nameOf(uid);
            if (name) return { name, generation: factor.generation };
        }
    }
    return null;
}

interface BirthParent {
    name: string;
    bloodFatigue?: number;
    genes?: ReadonlyArray<{ id?: string; displayName?: string }>;
}

/** G3 §G 醫官句；外婚且親代有微躁才提，先天不足時不說胎象康健 */
function medicLine(outcome: BloodFatigueOutcome | undefined, father: BirthParent | undefined, mother: BirthParent | undefined): string | null {
    if (!outcome || outcome.inbred || outcome.before === 0 || outcome.frail || !father || !mother) return null;
    const fatherCarries = normalizeBloodFatigue(father.bloodFatigue) > 0;
    const motherCarries = normalizeBloodFatigue(mother.bloodFatigue) > 0;
    if (fatherCarries && motherCarries) return outcrossMedicLine('雙親', null);
    return fatherCarries ? outcrossMedicLine(father.name, mother.name) : outcrossMedicLine(mother.name, father.name);
}

export function bloodlineBirthLines(
    result: { ep?: { resonance: number; ep?: number }; factors?: readonly InheritedFactor[]; child?: { name: string }; bloodFatigue?: BloodFatigueOutcome; father?: BirthParent; mother?: BirthParent; lineageSynergyFactorId?: string },
    nameOf: (uid: string) => string | null,
): string[] {
    const factors = result.factors ?? [];
    const lines: string[] = [];
    const ancestor = farthestAncestor(factors, nameOf);
    if (ancestor) {
        lines.push(ancestor.generation >= GREAT_GRANDPARENT_GENERATION && result.child
            ? generationLegacyLine(result.child.name, ancestor.name)
            : ancestorGhostLine(ancestor.name));
    }
    if ((result.ep?.resonance ?? 0) > 0) lines.push(BLOODLINE_RESONANCE_LINE);
    if (factors.some((factor) => factor.wildGene)) lines.push(WILD_GENE_LINE);
    const highEp = highEpLine(result.ep?.ep);
    if (highEp) lines.push(highEp);
    const synergyGene = result.father?.genes?.find((gene) => gene.id === result.lineageSynergyFactorId);
    if (result.lineageSynergyFactorId && synergyGene) lines.push(synergyWeddingLine(synergyGene.displayName ?? result.lineageSynergyFactorId));
    const medic = medicLine(result.bloodFatigue, result.father, result.mother);
    if (medic) lines.push(medic);
    if (result.bloodFatigue) lines.push(...bloodFatigueBirthLines(result.bloodFatigue));
    return lines;
}
