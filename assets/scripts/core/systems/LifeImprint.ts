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
import { condenseLifeWhiteFactors } from './WhiteFactorTraits';

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

/** 回傳加上新印記與生平閱歷白因子的武將與新增名稱；沒有新項目時回傳原物件 */
export function withLifeImprints(general: GeneralConfig): { general: GeneralConfig; added: string[] } {
    const record = (general as { battleRecord?: BattleRecordLike }).battleRecord;
    const ownedGenes = [...(general.genes ?? [])];
    const owned = new Set(ownedGenes.map((gene) => gene.id));
    const fresh = LIFE_IMPRINTS.filter((def) => !owned.has(def.id) && def.reached(general, record));
    const addedNames: string[] = fresh.map((def) => def.displayName);
    const nextGenes: GeneralGeneConfig[] = [
        ...ownedGenes,
        ...fresh.map((def): GeneralGeneConfig => ({ id: def.id, displayName: def.displayName, type: 'white', level: 1, description: def.description })),
    ];

    const condensed = condenseLifeWhiteFactors(
        {
            str: statOf(general, 'str'),
            int: statOf(general, 'int'),
            lea: statOf(general, 'lea'),
            pol: statOf(general, 'pol'),
            cha: statOf(general, 'cha'),
        },
        {
            battles: (record?.wins ?? 0) + (record?.losses ?? 0) + (record?.draws ?? 0),
            wins: record?.wins ?? 0,
            duelsWon: record?.duelsWon ?? 0,
            governanceSeasons: record?.governanceSeasons ?? 0,
            diplomacyCount: record?.diplomacyCount ?? 0,
        },
    );

    let changed = fresh.length > 0;
    for (const white of condensed) {
        const idx = nextGenes.findIndex((g) => g.id === white.id);
        if (idx < 0) {
            nextGenes.push({
                id: white.id,
                displayName: white.name,
                type: 'white',
                level: white.level,
                description: '生平閱歷凝練之白因子，傳承後可折抵對應戰法或政令消耗。',
            });
            addedNames.push(white.name);
            changed = true;
        } else if ((nextGenes[idx].level ?? 1) < white.level) {
            nextGenes[idx] = { ...nextGenes[idx], level: white.level };
            changed = true;
        }
    }

    if (!changed) return { general, added: [] };
    return { general: { ...general, genes: nextGenes }, added: addedNames };
}

export function lifeImprintLine(name: string, imprints: readonly string[]): string {
    return `蓋棺論定：${name} 一生功業凝為${imprints.map((imprint) => `【${imprint}】`).join('')}，傳於後世！`;
}
