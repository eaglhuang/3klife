// @spec-source → 武將壽命系統.md (doc_spec_0018) §M 名將死亡結算與身後傳承、教官系統（支援卡）.md (doc_spec_0027) §E #2
/**
 * LegacyService — 退役、死亡歸檔與季結資料生命週期的接線（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - retireGeneral：65 歲以上武將由玩家決定退役，轉成 MentorCard（教官傳承資料）；
 *     依規格退役「不」產生 SpiritCard
 *   - settleSeason：每季增齡後呼叫。死亡的武將交給 GeneralArchiver 產生歸檔快照，名將才標記正式英靈卡、
 *     寫入 L5 歸檔並從名冊移除；再呼叫 DataLifecycleScheduler 做季結／年底壓縮與清掃
 *
 * 這個類別不持有名冊：名冊由 GameSession 傳進來、改完回傳，因此和結緣（BreedingService）
 * 共用同一份 RosterStore 也不會互相覆寫。
 *
 * Unity 對照：像 GameManager 季結時依序呼叫 RetirementSystem.Process()、
 * RecordSystem.Archive()、SaveSystem.Compact()，每個步驟都用依賴注入的 Service。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import type { MentorCard } from '../models/MentorCard';
import type { SpiritCard } from '../models/SpiritCard';
import type { TigerTallyCard } from '../models/TigerTallyCard';
import { isTallyEligible, produceDeathTally, TigerTallyGeneral } from '../systems/TigerTally';
import type { DataStorageAdapter } from '../storage/DataStorageAdapter';
import type { GameTimeState, SeasonAdvanceResult } from '../systems/GameClock';
import {
    AgingEvent,
    AgingGeneral,
    GENERAL_STATUS_DEAD,
    RETIREMENT_AGE,
} from '../systems/GeneralAging';
import type { BreedingGeneral } from '../systems/BreedingSystem';
import { BranchCompactor } from './BranchCompactor';
import { BreedingQuotaEnforcer } from './BreedingQuotaEnforcer';
import { DataGrowthMonitor } from './DataGrowthMonitor';
import { DataLifecycleScheduler, SeasonEndResult, YearEndResult } from './DataLifecycleScheduler';
import { GeneralArchiver } from './GeneralArchiver';
import { PendingDeleteStore } from './PendingDeleteStore';
import { SeasonalRollup } from './SeasonalRollup';

export const STORE_MENTOR_CARDS = 'mentor_cards';
export const STORE_TIGER_TALLIES = 'tiger_tallies';

export class LegacyError extends Error {}

/** 一季結算的結果，由 GameSession 放進 SeasonAdvancedPayload 廣播 */
export interface LifecycleSettlement {
    /** 本季死亡者的正式英靈卡；不包含一般角色的歸檔快照。 */
    spiritCards: SpiritCard[];
    /** 全部死亡者的快照；供需要生命週期資料的消費者使用。 */
    archivedSnapshots?: SpiritCard[];
    /** 本季死亡產出的虎符；選填以相容既有 SeasonLifecycle 實作 */
    tigerTallies?: TigerTallyCard[];
    seasonEnd: SeasonEndResult | null;
    /** 只有跨年那一季才有 */
    yearEnd: YearEndResult | null;
}

export interface RetireResult {
    roster: GeneralConfig[];
    card: MentorCard;
}

export interface SettleResult {
    roster: GeneralConfig[];
    settlement: LifecycleSettlement;
}

/** GameSession 依賴的最小介面；測試可替換成假實作 */
export interface SeasonLifecycle {
    settleSeason(roster: GeneralConfig[], advance: SeasonAdvanceResult, events: AgingEvent[]): Promise<SettleResult>;
    retireGeneral(roster: GeneralConfig[], generalId: string, time: GameTimeState): Promise<RetireResult>;
}

export interface LegacyServiceOptions {
    scheduler?: DataLifecycleScheduler;
    archiver?: GeneralArchiver;
    /** 戰場／敘事尚未回寫分數時，預設使用 0 / 0。 */
    tallyScoreProvider?: (dead: GeneralConfig) => { deathBattleScore: number; legacyQualityScore: number };
}

type LegacyGeneral = BreedingGeneral & AgingGeneral & { retiredSeason?: number };

/**
 * 暫定模板契約：目前 generals.json 的 235 位武將皆有 GEN_ 大寫模板，無
 * isHistorical／父母／birthSeason；結緣子嗣則由 createChild 寫入父母與出生季。
 * 沒有明確史實旗標時，只將 GEN_ 模板 + general/famed/titled 分類且沒有子嗣
 * 標記的角色推定為史實；不以名字、稀有度或「沒有父母」單獨推定。
 * 女性正式模板亦須符合相同來源限制，再由 TigerTally 判斷女性名將分類。
 * 此格式契約不是人物登記表驗證：未來若模板規則改變或史實人物補上父母，
 * 需改用權威身份欄位；目前寧可漏判也不把遊戲子嗣或未知模板當名將。
 */
export function toTigerTallyGeneral(general: GeneralConfig): TigerTallyGeneral {
    const identity = general as BreedingGeneral & { uid?: string; isHistorical?: boolean; troopType?: string };
    const descendant = Boolean(identity.fatherId?.trim() || identity.motherId?.trim())
        || identity.birthSeason !== undefined;
    const templateId = general.templateId?.trim();
    const officialTemplate = Boolean(templateId && /^GEN_[A-Z0-9_]+$/.test(templateId));
    const historicalCategory = ['general', 'famed', 'titled'].includes(general.characterCategory ?? '');
    return {
        id: general.id,
        uid: identity.uid,
        templateId: !descendant && officialTemplate ? templateId : undefined,
        isHistorical: !descendant && (identity.isHistorical ?? (officialTemplate && historicalCategory)),
        characterCategory: general.characterCategory,
        gender: general.gender,
        troopType: identity.troopType,
    };
}

function isAlive(general: GeneralConfig): boolean {
    return general.status !== GENERAL_STATUS_DEAD;
}

export class LegacyService implements SeasonLifecycle {
    private readonly _scheduler: DataLifecycleScheduler;
    private readonly _archiver: GeneralArchiver;
    private readonly _tallyScoreProvider: LegacyServiceOptions['tallyScoreProvider'];
    private _ready: Promise<void> | null = null;

    constructor(private readonly _adapter: DataStorageAdapter, options: LegacyServiceOptions = {}) {
        this._tallyScoreProvider = options.tallyScoreProvider;
        // 不用各服務的 getInstance 單例：單例只認第一個 adapter，換存檔後端或跑多個測試會串到舊資料
        const pendingDelete = new PendingDeleteStore(_adapter);
        this._archiver = options.archiver ?? new GeneralArchiver(_adapter, pendingDelete);
        this._scheduler = options.scheduler ?? new DataLifecycleScheduler(
            _adapter,
            new SeasonalRollup(_adapter),
            pendingDelete,
            new BranchCompactor(_adapter),
            new DataGrowthMonitor(_adapter),
            new BreedingQuotaEnforcer(_adapter),
        );
    }

    /** 玩家決定讓 65 歲以上的武將退役，轉成教官傳承資料；武將留在名冊（仍會老、會死） */
    public async retireGeneral(roster: GeneralConfig[], generalId: string, time: GameTimeState): Promise<RetireResult> {
        await this._ensureReady();
        const target = roster.find((g) => g.id === generalId) as LegacyGeneral | undefined;
        if (!target) throw new LegacyError(`名冊中找不到 ${generalId}`);
        if (!isAlive(target)) throw new LegacyError(`${target.name} 已故，不能退役`);
        if (target.isMentorCard) throw new LegacyError(`${target.name} 已經退役`);
        if ((target.age ?? 0) < RETIREMENT_AGE) {
            throw new LegacyError(`${target.name} 尚未滿 ${RETIREMENT_AGE} 歲（目前 ${target.age ?? 0}），不能退役`);
        }

        const retired: LegacyGeneral = { ...target, isMentorCard: true, retiredSeason: time.totalSeasonsElapsed };
        const card: MentorCard = {
            uid: `mentor-${retired.id}`,
            sourceGeneralId: retired.id,
            name: retired.name,
            faction: String(retired.faction),
            retiredAge: retired.age ?? RETIREMENT_AGE,
            retiredSeason: time.totalSeasonsElapsed,
            retiredYear: time.currentYear,
            ep_snapshot: retired.ep ?? 0,
            gene_refs: (retired.genes ?? []).map((g) => g.id).filter((id): id is string => !!id),
            parentUids: [retired.fatherId ?? '', retired.motherId ?? ''],
            generalSnapshot: JSON.parse(JSON.stringify(retired)) as GeneralConfig,
        };

        const cards = await this.getMentorCards();
        await this._adapter.set(STORE_MENTOR_CARDS, [...cards.filter((c) => c.uid !== card.uid), card]);
        return { roster: roster.map((g) => (g.id === generalId ? retired : g)), card };
    }

    /** 季結：死亡歸檔 → 從名冊移除 → 資料生命週期排程 */
    public async settleSeason(roster: GeneralConfig[], advance: SeasonAdvanceResult, events: AgingEvent[]): Promise<SettleResult> {
        await this._ensureReady();
        const { season, year } = { season: advance.previous.currentSeason, year: advance.previous.currentYear };

        const deadIds = new Set(events.filter((e) => e.type === 'died').map((e) => e.generalId));
        const spiritCards: SpiritCard[] = [];
        const archivedSnapshots: SpiritCard[] = [];
        const tigerTallies: TigerTallyCard[] = [];
        for (const id of deadIds) {
            const dead = roster.find((g) => g.id === id) as LegacyGeneral | undefined;
            if (!dead) continue;
            // archive 的既有預設行為不變。先保留已決定的標記，再建立快照並由本服務判資格。
            // 同 uid 重跑時 true/false 均保留；舊資料缺欄位不批次遷移，只處理這次死亡。
            const previous = await this._archiver.getSpiritCard(dead.id);
            const archived = await this._archiveDeath(dead, roster, deadIds, season, year);
            const identity = toTigerTallyGeneral(dead);
            const snapshot = await this._archiver.markSpiritRelic(
                archived.uid, previous?.isSpiritRelic ?? isTallyEligible(identity),
            );
            archivedSnapshots.push(snapshot);
            if (snapshot.isSpiritRelic === true) spiritCards.push(snapshot);
            const scores = this._tallyScoreProvider?.(dead) ?? { deathBattleScore: 0, legacyQualityScore: 0 };
            // 虎符使用累計季數；currentSeason 是每年重複的 1～4，不能用作產物身份。
            const tally = produceDeathTally(
                identity, scores.deathBattleScore, scores.legacyQualityScore,
                advance.previous.totalSeasonsElapsed,
            );
            if (tally) {
                const stored = await this.getTigerTallies();
                await this._adapter.set(STORE_TIGER_TALLIES, [...stored.filter((c) => c.uid !== tally.uid), tally]);
                tigerTallies.push(tally);
            }
        }
        const nextRoster = roster.filter((g) => !deadIds.has(g.id));

        const seasonEnd = await this._scheduler.onSeasonEnd(season, year);
        const yearEnd = advance.yearEnded ? await this._scheduler.onYearEnd(year) : null;
        return { roster: nextRoster, settlement: { spiritCards, archivedSnapshots, tigerTallies, seasonEnd, yearEnd } };
    }

    public getArchiver(): GeneralArchiver {
        return this._archiver;
    }

    public async getMentorCards(): Promise<MentorCard[]> {
        await this._ensureReady();
        return (await this._adapter.get<MentorCard[]>(STORE_MENTOR_CARDS)) ?? [];
    }

    public async getTigerTallies(): Promise<TigerTallyCard[]> {
        await this._ensureReady();
        return (await this._adapter.get<TigerTallyCard[]>(STORE_TIGER_TALLIES)) ?? [];
    }

    private async _archiveDeath(
        dead: LegacyGeneral,
        roster: GeneralConfig[],
        deadIds: Set<string>,
        season: number,
        year: number,
    ): Promise<SpiritCard> {
        const hasLivingDescendants = (roster as LegacyGeneral[]).some(
            (g) => isAlive(g) && !deadIds.has(g.id) && (g.fatherId === dead.id || g.motherId === dead.id),
        );
        const snapshot = {
            ...dead,
            faction: String(dead.faction),
            parentUids: [dead.fatherId ?? '', dead.motherId ?? ''] as [string, string],
            deathYear: year,
        } as unknown as Parameters<GeneralArchiver['archive']>[0];
        return this._archiver.archive(
            snapshot,
            { battleId: '', cause: 'age', season, year },
            { hasLivingDescendants },
            { season, year },
        );
    }

    /** 第一次存取時才初始化後端（例如開啟 IndexedDB），之後重用同一個 Promise */
    private _ensureReady(): Promise<void> {
        if (!this._ready) {
            this._ready = this._adapter.init().catch((error) => {
                this._ready = null;
                throw error;
            });
        }
        return this._ready;
    }
}
