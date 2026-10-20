// @spec-source → 結緣系統（配種）.md (doc_spec_0028) §E #2 #3 #9 #10
/**
 * BreedingService — 結緣與名冊 / 血統圖的接線（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 從 RosterStore 取父母、呼叫 BreedingSystem.breed()
 *   - 寫回父母的精力 / 待產狀態，子嗣以 0 歲加入名冊
 *   - 把子嗣登記進 BloodlineGraph，讓下一代能查到 14 人祖譜
 *   - 讀檔後用 syncGraphFromRoster() 把名冊裡已出生的子嗣補回血統圖
 *
 * Unity 對照：像一個掛在 GameManager 底下的 BreedingService，
 * 依賴注入 IRosterRepository 與 BloodlineGraph，UI 只呼叫 Breed(fatherId, motherId)。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import type { RosterStore } from '../managers/GameSession';
import { BloodlineGraph } from './BloodlineGraph';
import { normalizeRosterRoles } from '../systems/RosterRoleLoad';
import {
    AffinityResolver,
    advanceBreedingSeason,
    breed,
    BreedingEligibility,
    BreedingGeneral,
    BreedingMode,
    BreedingResult,
    checkBreedingEligibility,
    EpBreakdown,
    FactorPoolEntry,
    previewBreedingEp,
    previewFactorPool,
    toPersonRecord,
} from '../systems/BreedingSystem';
import type { FactorColor, FactorDictionary } from '../systems/FactorInheritance';
import { femaleSourceConceptionMod, type FemaleSource } from '../systems/FemaleSource';
import { affinityResolverOf, conceptionModBetween, type HistoricalPairTable } from '../systems/HistoricalPairs';
import { generateVirtualAncestry, toRegistryEntries } from '../systems/VirtualAncestorGenerator';
import type { RandomSource } from '../systems/GeneralAging';

export interface BreedingServiceOptions {
    random?: RandomSource;
    dictionary?: FactorDictionary;
    /** 執行期才載入的因子字典（優先於 dictionary） */
    getDictionary?: () => FactorDictionary | undefined;
    enabledColors?: readonly FactorColor[];
    maxFactors?: number;
    isHistoricalPair?: AffinityResolver;
    /** 史實相性配對表（KIN-04）：未指定 isHistoricalPair 時由表推得契合，並提供宿敵受孕率倍率 */
    historicalPairs?: HistoricalPairTable;
    /** 惰性版本：建立服務時表尚未載入（ServiceLoader），每次配種 / 預覽時再取；優先於 historicalPairs */
    getHistoricalPairs?: () => HistoricalPairTable | undefined;
    /** 目前的 totalSeasonsElapsed，寫進子嗣的 birthSeason */
    currentSeason?: () => number;
    /** 季節受孕率倍率（TIME-08，冬季 +10%）；不傳視為 1 */
    seasonConceptionMod?: () => number;
    /** 季節受孕率倍率（TIME-08，冬季 +10%）；不傳視為 1 */
    seasonConceptionMod?: () => number;
    /** 子嗣 id 產生器；預設 child-{父}-{母}-{序號} */
    childIdFactory?: (father: GeneralConfig, mother: GeneralConfig, existingIds: Set<string>) => string;
    /** 依武將 uid 取母體來源（FEM-02 受孕率倍率）；沒有來源回傳 null */
    getFemaleSource?: (uid: string) => FemaleSource | null;
}

export class BreedingError extends Error {}

function defaultChildId(father: GeneralConfig, mother: GeneralConfig, existingIds: Set<string>): string {
    let n = 1;
    let id = `child-${father.id}-${mother.id}-${n}`;
    while (existingIds.has(id)) {
        n++;
        id = `child-${father.id}-${mother.id}-${n}`;
    }
    return id;
}

export class BreedingService {
    constructor(
        private readonly _roster: RosterStore,
        private readonly _graph: BloodlineGraph,
        private readonly _options: BreedingServiceOptions = {},
    ) {}

    /**
     * 初代名將（名冊沒有父母、血統圖也沒有祖先）補齊 14 位虛擬祖先（BLT-02）。
     * 生成結果以武將 id 為種子，讀檔後重建也一致；回傳這次補了幾位武將。
     */
    ensureFounderAncestry(ids?: readonly string[]): number {
        const wanted = ids ? new Set(ids) : null;
        let added = 0;
        for (const general of this._roster.getAll() as BreedingGeneral[]) {
            if (wanted && !wanted.has(general.id)) continue;
            if (general.fatherId || general.motherId) continue;
            const parents = this._graph.getParents(general.id);
            if (parents.father || parents.mother) continue;
            const ancestry = generateVirtualAncestry(general, {
                dictionary: this._options.getDictionary?.() ?? this._options.dictionary,
                coreFactorIds: this._graph.getPerson(general.id)?.gene_refs,
            });
            const { persons, links } = toRegistryEntries(ancestry, general.faction);
            if (!this._graph.hasPerson(general.id)) this._graph.upsertPerson(toPersonRecord(general));
            if (this._graph.registerFounderAncestry(general.id, persons, links)) added++;
        }
        return added;
    }

    /** 把名冊中帶有父母資訊、但血統圖還沒有的武將登記回去（讀檔後呼叫）；初代名將順便補虛擬祖先 */
    syncGraphFromRoster(): number {
        this.ensureFounderAncestry();
        let added = 0;
        for (const general of this._roster.getAll() as BreedingGeneral[]) {
            if (!general.fatherId || !general.motherId) continue;
            const parents = this._graph.getParents(general.id);
            if (parents.father && parents.mother) continue;
            this._graph.registerChild(toPersonRecord(general), general.fatherId, general.motherId);
            added++;
        }
        return added;
    }

    checkEligibility(fatherId: string, motherId: string): BreedingEligibility {
        const { father, mother } = this._findPair(fatherId, motherId);
        return checkBreedingEligibility(father, mother, this._graph);
    }

    /** 結緣介面的 EP 預估（不改資料、不擲骰） */
    previewEp(fatherId: string, motherId: string): EpBreakdown {
        const { father, mother } = this._findPair(fatherId, motherId);
        return previewBreedingEp({
            father,
            mother,
            pedigree: this._graph,
            isHistoricalPair: this._historicalResolver(),
            rosterLookup: this._rosterLookup(),
        }).ep;
    }

    /** 名士預言用：子嗣可能繼承的因子池與機率（不改資料、不擲骰） */
    previewFactorPool(fatherId: string, motherId: string): FactorPoolEntry[] {
        const { father, mother } = this._findPair(fatherId, motherId);
        return previewFactorPool({
            father,
            mother,
            pedigree: this._graph,
            dictionary: this._options.getDictionary?.() ?? this._options.dictionary,
            enabledColors: this._options.enabledColors,
            rosterLookup: this._rosterLookup(),
        });
    }

    /** 執行結緣；精力無論成敗都會扣，受孕成功時子嗣加入名冊 */
    breed(fatherId: string, motherId: string, mode?: BreedingMode): BreedingResult {
        const roster = this._roster.getAll() as BreedingGeneral[];
        const { father, mother } = this._findPair(fatherId, motherId, roster);
        const ids = new Set(roster.map((g) => g.id));
        const historicalPairs = this._pairs();
        const childId = (this._options.childIdFactory ?? defaultChildId)(father, mother, ids);

        const result = breed({
            father,
            mother,
            mode,
            pedigree: this._graph,
            random: this._options.random ?? Math.random,
            childId,
            birthSeason: this._options.currentSeason?.(),
            dictionary: this._options.getDictionary?.() ?? this._options.dictionary,
            enabledColors: this._options.enabledColors,
            maxFactors: this._options.maxFactors,
            isHistoricalPair: this._historicalResolver(),
            rosterLookup: this._rosterLookup(roster),
            motherConceptionMod: femaleSourceConceptionMod(this._options.getFemaleSource?.(mother.id) ?? null),
            historicalConceptionMod: historicalPairs ? conceptionModBetween(historicalPairs, father.id, mother.id) : undefined,
            seasonConceptionMod: this._options.seasonConceptionMod?.(),
            seasonConceptionMod: this._options.seasonConceptionMod?.(),
        });
        if (result.outcome === 'blocked') return result;

        const next = roster.map((g) => (g.id === father.id ? result.father : g.id === mother.id ? result.mother : g));
        if (result.child) {
            next.push(normalizeRosterRoles([result.child])[0]);
            this._graph.registerChild(toPersonRecord(result.child), father.id, mother.id);
        }
        this._roster.replaceAll(next);
        return result;
    }

    /** 每季推進待產倒數；回傳本季待產結束的武將 id */
    advanceSeason(): string[] {
        const { generals, pregnancyEnded } = advanceBreedingSeason(this._roster.getAll() as BreedingGeneral[]);
        if (pregnancyEnded.length > 0 || generals.some((g) => (g.pregnancySeasonsLeft ?? 0) > 0)) {
            this._roster.replaceAll(generals);
        }
        return pregnancyEnded;
    }

    private _historicalResolver(): AffinityResolver | undefined {
        if (this._options.isHistoricalPair) return this._options.isHistoricalPair;
        const table = this._pairs();
        return table ? affinityResolverOf(table) : undefined;
    }

    private _pairs(): HistoricalPairTable | undefined {
        return this._options.getHistoricalPairs?.() ?? this._options.historicalPairs;
    }

    private _rosterLookup(roster: GeneralConfig[] = this._roster.getAll()): (uid: string) => GeneralConfig | undefined {
        const byId = new Map(roster.map((g) => [g.id, g]));
        return (uid) => byId.get(uid);
    }

    private _findPair(fatherId: string, motherId: string, roster: BreedingGeneral[] = this._roster.getAll()): { father: BreedingGeneral; mother: BreedingGeneral } {
        const father = roster.find((g) => g.id === fatherId);
        const mother = roster.find((g) => g.id === motherId);
        if (!father) throw new BreedingError(`名冊中找不到父方 ${fatherId}`);
        if (!mother) throw new BreedingError(`名冊中找不到母方 ${motherId}`);
        this.ensureFounderAncestry([father.id, mother.id]);
        return { father, mother };
    }
}
