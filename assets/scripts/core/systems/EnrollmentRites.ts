/**
 * 開蒙禮與加冠禮（G1 §E #3、#5、§F、§G、§H，PROG-2-1821）。
 * 兩次獨立形成檢定（q=0.0591）；沒形成就喚醒一個已有的沉睡因子；加冠禮另做兵種適性突破。
 * 暫定：形成的因子 1★ 且直接現身；適性突破只看祖輩有沒有更高階，不擲骰、不要求紅因子；
 * 子嗣沒有該兵種適性時視為 C 階；記號放在培育會話上，放棄重修會再辦一次。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import { APTITUDE_GRADES, TROOP_APTITUDE_LABEL_ZH, aptitudeGradeOf } from './AptitudeView';
import { awakenFactor, listAwakeningCandidates, type AwakeningTrigger, type FactorAwakenedEvent } from './FactorAwakening';

export type NurtureRiteKind = 'enrollment' | 'capping';

export const RITE_FORMATION_CHANCE = 0.0591;
/** 第 24 回合 = 16 歲 */
export const CAPPING_RITE_ROUND = 24;
const RITE_DEFAULT_APTITUDE = 'C';
const RITE_AWAKENING_TRIGGERS: readonly AwakeningTrigger[] = ['nurture-peek', 'mentor', 'sage'];

/** G1 §G 典禮句 */
export const RITE_CEREMONY_LINE: Readonly<Record<NurtureRiteKind, string>> = {
    enrollment: '今逢少主十二開蒙之期，延請名師授業，啟發宿慧！',
    capping: '棄爾幼志，順爾成德！列祖列宗在上，佑我麒麟兒！',
};

export type AncestorRelation = '父親' | '母親' | '祖父' | '祖母' | '外祖父' | '外祖母';

export interface RiteAncestor {
    relation: AncestorRelation;
    general: GeneralConfig;
}

export interface RiteOrigin {
    relation: AncestorRelation;
    ancestorName: string;
}

export interface RiteBreakthrough {
    troop: string;
    label: string;
    from: string;
    to: string;
}

export interface NurtureRiteResult {
    kind: NurtureRiteKind;
    general: GeneralConfig;
    /** 這次形成的新因子 */
    formed?: GeneralGeneConfig;
    /** 這次喚醒的沉睡因子 */
    awakening?: FactorAwakenedEvent;
    /** 形成或喚醒的因子來自哪位祖輩；找不到則省略 */
    origin?: RiteOrigin;
    breakthrough?: RiteBreakthrough;
}

export interface RiteContext {
    lookup: (id: string) => GeneralConfig | undefined;
    discoveryLevel: number;
    random: () => number;
}

type WithParents = GeneralConfig & { fatherId?: string; motherId?: string };

/** 雙親與四位祖父母，名冊裡找不到的略過 */
export function riteAncestorsOf(child: GeneralConfig, lookup: RiteContext['lookup']): RiteAncestor[] {
    const find = (id: string | undefined): WithParents | undefined => (id ? lookup(id) : undefined);
    const father = find((child as WithParents).fatherId);
    const mother = find((child as WithParents).motherId);
    const entries: Array<[AncestorRelation, GeneralConfig | undefined]> = [
        ['父親', father],
        ['母親', mother],
        ['祖父', find(father?.fatherId)],
        ['祖母', find(father?.motherId)],
        ['外祖父', find(mother?.fatherId)],
        ['外祖母', find(mother?.motherId)],
    ];
    const out: RiteAncestor[] = [];
    for (const [relation, general] of entries) {
        if (general) out.push({ relation, general });
    }
    return out;
}

/** 目前回合到期、這次培育還沒辦過的儀式 */
export function ritesDue(done: readonly NurtureRiteKind[], roundAfter: number): NurtureRiteKind[] {
    if (roundAfter < 1) return [];
    const due: NurtureRiteKind[] = [];
    if (!done.includes('enrollment')) due.push('enrollment');
    if (roundAfter >= CAPPING_RITE_ROUND && !done.includes('capping')) due.push('capping');
    return due;
}

function originOf(factorId: string | undefined, ancestors: readonly RiteAncestor[]): RiteOrigin | undefined {
    const holder = ancestors.find((a) => (a.general.genes ?? []).some((gene) => gene.id === factorId));
    return holder ? { relation: holder.relation, ancestorName: holder.general.name ?? holder.general.id ?? '' } : undefined;
}

/** 祖輩有而子嗣沒有的因子各擲一次，最多形成一個 */
function rollFormation(child: GeneralConfig, ancestors: readonly RiteAncestor[], random: () => number): GeneralGeneConfig | undefined {
    const seen = (child.genes ?? []).map((gene) => gene.id);
    for (const ancestor of ancestors) {
        for (const gene of ancestor.general.genes ?? []) {
            if (!gene.id || seen.includes(gene.id)) continue;
            seen.push(gene.id);
            if (random() < RITE_FORMATION_CHANCE) return { ...gene, level: 1, isLocked: false };
        }
    }
    return undefined;
}

/** 星等最高的沉睡因子；同星取先到的，不耗亂數 */
function awakenStrongest(child: GeneralConfig, discoveryLevel: number) {
    const genes = child.genes ?? [];
    const levelOf = (factorId: string): number => genes.find((gene) => gene.id === factorId)?.level ?? 0;
    const candidates = listAwakeningCandidates(child, RITE_AWAKENING_TRIGGERS, discoveryLevel);
    if (candidates.length === 0) return undefined;
    const pick = candidates.reduce((best, c) => (levelOf(c.factorId) > levelOf(best.factorId) ? c : best));
    return awakenFactor(child, pick.factorId, pick.trigger, discoveryLevel);
}

/** 祖輩最高階、且高於子嗣的兵種往上升一階 */
export function riteBreakthroughOf(child: GeneralConfig, ancestors: readonly RiteAncestor[]): RiteBreakthrough | undefined {
    const rankOf = (raw: unknown): number => {
        const grade = aptitudeGradeOf(raw);
        return grade ? APTITUDE_GRADES.indexOf(grade) : APTITUDE_GRADES.length;
    };
    let bestTroop: string | undefined;
    let bestRank = APTITUDE_GRADES.length;
    for (const ancestor of ancestors) {
        const row = ancestor.general.troopAptitude ?? {};
        for (const troop of Object.keys(row)) {
            const rank = rankOf(row[troop]);
            const own = rankOf(child.troopAptitude?.[troop] ?? RITE_DEFAULT_APTITUDE);
            if (rank < own && rank < bestRank) {
                bestRank = rank;
                bestTroop = troop;
            }
        }
    }
    if (!bestTroop) return undefined;
    const from = String(child.troopAptitude?.[bestTroop] ?? RITE_DEFAULT_APTITUDE);
    return {
        troop: bestTroop,
        label: TROOP_APTITUDE_LABEL_ZH[bestTroop] ?? bestTroop,
        from,
        to: APTITUDE_GRADES[rankOf(from) - 1],
    };
}

/** 辦一次儀式 */
export function performNurtureRite(child: GeneralConfig, kind: NurtureRiteKind, context: RiteContext): NurtureRiteResult {
    const ancestors = riteAncestorsOf(child, context.lookup);
    let general: GeneralConfig = child;
    const result: NurtureRiteResult = { kind, general };
    const formed = rollFormation(general, ancestors, context.random);
    if (formed) {
        general = { ...general, genes: [...(general.genes ?? []), formed] };
        result.formed = formed;
        result.origin = originOf(formed.id, ancestors);
    } else {
        const awakened = awakenStrongest(general, context.discoveryLevel);
        if (awakened?.ok) {
            general = awakened.general;
            result.awakening = awakened.event;
            result.origin = originOf(awakened.event.factorId, ancestors);
        }
    }
    if (kind === 'capping') {
        const breakthrough = riteBreakthroughOf(general, ancestors);
        if (breakthrough) {
            general = { ...general, troopAptitude: { ...general.troopAptitude, [breakthrough.troop]: breakthrough.to } };
            result.breakthrough = breakthrough;
        }
    }
    result.general = general;
    return result;
}

/** G1 §H：UI_G1_AWAKEN_12、UI_G1_AWAKEN_16；加冠禮的因子句與沒有來源的句子為自擬 */
export function riteNoticeLines(childName: string, rite: NurtureRiteResult): string[] {
    const lines: string[] = [];
    const tag = rite.kind === 'enrollment' ? '開蒙覺醒' : '加冠覺醒';
    const factorName = rite.formed ? rite.formed.displayName ?? rite.formed.id : rite.awakening?.displayName;
    if (factorName) {
        lines.push(rite.origin
            ? `【${tag}】${childName} 展現了來自${rite.origin.relation} ${rite.origin.ancestorName} 的【${factorName}】資質！`
            : `【${tag}】${childName} 展現了血脈中的【${factorName}】資質！`);
    }
    if (rite.breakthrough) {
        lines.push(`【加冠大成】血脈共鳴！${childName} 的【${rite.breakthrough.label}】適性突破至 ${rite.breakthrough.to} 階！`);
    }
    return lines;
}
