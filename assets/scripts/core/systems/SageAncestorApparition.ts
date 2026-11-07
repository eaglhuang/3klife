// @spec-source → 名士預言系統.md §K 祖輩顯靈與認同感設計、§暫定裁決 1（ORAC-08，PROG-2-2059）
/**
 * SageAncestorApparition — 名士占卜時的祖輩顯靈補充台詞（純邏輯，不依賴 cc）
 *
 * 規格：父母血統矩陣命中特定祖先標籤時，附加顯靈式補充台詞；只做敘事包裝，不改名士偏見與準確率。
 * 祖先標籤兩類（暫定裁決 1）：
 * - 名將模板：templateId（GEN_<陣營>_<姓>_<名>）的姓氏在名門表內，例如「曹」「關」。
 * - 因子顏色＋兵種：祖先帶某色因子，且有 S 級兵種適性，例如「紅・騎兵」。
 * 祖先依呼叫端給的順序（近代在前）比對，第一位命中者顯靈；同一位祖先名將模板優先。
 *
 * 暫定（可逆）：名門表、S 級門檻與台詞文案為本卡擬定，待企劃替換。
 * Unity 對照：像一個 static 的文案選擇器，讀祖先資料回傳一句台詞，不碰占卜結果。
 */
import { normalizeFactorColor, type FactorColor } from './FactorInheritance';
import { FACTOR_COLOR_LABELS } from './FactorHexPanel';
import { TROOP_APTITUDE_LABEL_ZH } from './AptitudeView';

/** 名門姓氏表：templateId 的姓氏代碼 → 顯示用姓氏（排除一音多姓的代碼，例如 LU） */
export const APPARITION_FAMILY_LABELS: Readonly<Record<string, string>> = {
    CAO: '曹',
    LIU: '劉',
    SUN: '孫',
    GUAN: '關',
    ZHANG: '張',
    ZHAO: '趙',
    MA: '馬',
    ZHUGE: '諸葛',
    SIMA: '司馬',
    XIAHOU: '夏侯',
};

/** 兵種適性達此等級才算「兵種」祖先標籤 */
export const APPARITION_TROOP_GRADE = 'S';

export interface ApparitionAncestor {
    name: string;
    templateId?: string | null;
    genes?: ReadonlyArray<{ type?: string | null }>;
    troopAptitude?: Readonly<Record<string, string>>;
}

export type AncestorTag =
    | { kind: 'template'; family: string }
    | { kind: 'color-troop'; color: FactorColor; troop: string };

export interface AncestorApparition {
    ancestorName: string;
    tag: AncestorTag;
    line: string;
}

/** GEN_WEI_CAO_CAO → CAO；格式不符回傳 null */
function surnameCodeOf(templateId: string | null | undefined): string | null {
    const parts = (templateId ?? '').split('_');
    if (parts.length < 4 || parts[0] !== 'GEN') return null;
    return parts[2] || null;
}

/** 一位祖先身上的全部標籤：名將模板在前，再依因子順序 × 兵種適性順序列出顏色＋兵種 */
export function ancestorTagsOf(ancestor: Readonly<ApparitionAncestor>): AncestorTag[] {
    const tags: AncestorTag[] = [];
    const surname = surnameCodeOf(ancestor.templateId);
    const family = surname ? APPARITION_FAMILY_LABELS[surname] : undefined;
    if (family) tags.push({ kind: 'template', family });
    const troops = Object.entries(ancestor.troopAptitude ?? {})
        .filter(([code, grade]) => grade === APPARITION_TROOP_GRADE && TROOP_APTITUDE_LABEL_ZH[code])
        .map(([code]) => code);
    const colors: FactorColor[] = [];
    for (const gene of ancestor.genes ?? []) {
        const color = normalizeFactorColor(gene.type ?? undefined);
        if (color && !colors.includes(color)) colors.push(color);
    }
    for (const color of colors) {
        for (const troop of troops) tags.push({ kind: 'color-troop', color, troop });
    }
    return tags;
}

export function ancestorTagLabel(tag: AncestorTag): string {
    return tag.kind === 'template' ? `${tag.family}家` : `${FACTOR_COLOR_LABELS[tag.color]}・${TROOP_APTITUDE_LABEL_ZH[tag.troop]}`;
}

function apparitionLine(name: string, tag: AncestorTag): string {
    if (tag.kind === 'template') return `${name}之靈隱現：「${tag.family}家的血，終究流到這孩子身上。」`;
    return `${name}之靈低語：「此子${FACTOR_COLOR_LABELS[tag.color]}脈之中，藏著我${TROOP_APTITUDE_LABEL_ZH[tag.troop]}的本事。」`;
}

/** 依序找第一位命中標籤的祖先並給一句顯靈台詞；都沒命中回傳 null。不讀也不改占卜結果。 */
export function pickAncestorApparition(ancestors: ReadonlyArray<Readonly<ApparitionAncestor>>): AncestorApparition | null {
    for (const ancestor of ancestors) {
        const [tag] = ancestorTagsOf(ancestor);
        if (tag) return { ancestorName: ancestor.name, tag, line: apparitionLine(ancestor.name, tag) };
    }
    return null;
}
