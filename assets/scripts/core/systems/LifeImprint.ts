// @spec-source → 血統傳承G2二代傳承_功業回流與三代譜牒規格書.md §E #7 蓋棺論定與生平印記；PROG-2-1794
/**
 * LifeImprint — 武將退役或去世時，依生平成就凝練生平印記（白因子，純邏輯，不依賴 cc）
 *
 * 規格只點名【破虜】【治平】，沒給條件；門檻都是暫定。
 * 目前沒有逐將的施政紀錄，治平先看政治能力。
 *
 * Unity 對照：像一張成就判定 ScriptableObject，達成就往角色身上加一筆資料。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import type { BattleRecordLike } from './BattleRecordStats';
import { statOf } from './BreedingSystem';

const POLU_MIN_KILLS = 100;
const POLU_MIN_WINS = 10;
const ZHIPING_MIN_POL = 80;

interface LifeImprintDef {
    id: string;
    displayName: string;
    description: string;
    reached(general: GeneralConfig, record: BattleRecordLike | undefined): boolean;
}

export const LIFE_IMPRINTS: readonly LifeImprintDef[] = Object.freeze([
    {
        id: 'imprint_polu',
        displayName: '破虜',
        description: '生平戰功彪炳，凝練為家傳印記。',
        reached: (_general, record) => (record?.kills ?? 0) >= POLU_MIN_KILLS || (record?.wins ?? 0) >= POLU_MIN_WINS,
    },
    {
        id: 'imprint_zhiping',
        displayName: '治平',
        description: '生平治世有方，凝練為家傳印記。',
        reached: (general) => statOf(general, 'pol') >= ZHIPING_MIN_POL,
    },
]);

/** 回傳加上新印記的武將與新增的印記名；沒有新印記時回傳原物件 */
export function withLifeImprints(general: GeneralConfig): { general: GeneralConfig; added: string[] } {
    const record = (general as { battleRecord?: BattleRecordLike }).battleRecord;
    const owned = new Set((general.genes ?? []).map((gene) => gene.id));
    const fresh = LIFE_IMPRINTS.filter((def) => !owned.has(def.id) && def.reached(general, record));
    if (fresh.length === 0) return { general, added: [] };
    const genes: GeneralGeneConfig[] = fresh.map((def) => ({ id: def.id, displayName: def.displayName, type: 'white', level: 1, description: def.description }));
    return { general: { ...general, genes: [...(general.genes ?? []), ...genes] }, added: fresh.map((def) => def.displayName) };
}

export function lifeImprintLine(name: string, imprints: readonly string[]): string {
    return `蓋棺論定：${name} 一生功業凝為${imprints.map((imprint) => `【${imprint}】`).join('')}，傳於後世！`;
}
