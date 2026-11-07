// @spec-source → 名士預言系統.md §K 祖輩顯靈（ORAC-08，PROG-2-1981）
/**
 * SageApparitionLineage — 從名冊組出被占卜武將的祖先清單，交給 pickAncestorApparition（純邏輯，不依賴 cc）。
 * 順序：父、母，再父之父、父之母、母之父、母之母（近代在前）；名冊查不到的人跳過。
 * 父母關係讀子嗣身上的 fatherId／motherId（與 GameSession 其他血脈判定相同）。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { pickAncestorApparition, type AncestorApparition, type ApparitionAncestor } from './SageAncestorApparition';

type WithParents = GeneralConfig & { fatherId?: string | null; motherId?: string | null };

function parentsOf(general: WithParents | undefined, byId: ReadonlyMap<string, WithParents>): WithParents[] {
    if (!general) return [];
    return [general.fatherId, general.motherId]
        .map((id) => (id ? byId.get(id) : undefined))
        .filter((g): g is WithParents => !!g);
}

function toAncestor(g: WithParents): ApparitionAncestor {
    return { name: g.name, templateId: g.templateId ?? null, genes: g.genes, troopAptitude: g.troopAptitude };
}

export function apparitionAncestorsOf(general: Readonly<GeneralConfig> | undefined, roster: readonly GeneralConfig[]): ApparitionAncestor[] {
    const byId = new Map(roster.map((g) => [g.id, g as WithParents]));
    const parents = parentsOf(general as WithParents | undefined, byId);
    const grandparents = parents.flatMap((p) => parentsOf(p, byId));
    return [...parents, ...grandparents].map(toAncestor);
}

/** 被占卜武將的祖輩顯靈；沒有祖先或都沒命中回 null。 */
export function apparitionForDivination(general: Readonly<GeneralConfig> | undefined, roster: readonly GeneralConfig[]): AncestorApparition | null {
    return pickAncestorApparition(apparitionAncestorsOf(general, roster));
}
