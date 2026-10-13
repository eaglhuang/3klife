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
 * 虎符的唯一來源是 GameSession 的虎符結算（TallyDeathSettlement，PROG-2-0236）。
 * 本服務不產生、不保存虎符，避免兩套產卡規則並存。
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
import { isTallyEligible, TigerTallyGeneral } from '../systems/TigerTally';
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

export class LegacyError extends Error {}

/** 一季結算的結果，由 GameSession 放進 SeasonAdvancedPayload 廣播 */
export interface LifecycleSettlement {
    /** 本季死亡者的正式英靈卡；不包含一般角色的歸檔快照。 */
    spiritCards: SpiritCard[];
    /** 全部死亡者的快照；供需要生命週期資料的消費者使用。 */
    archivedSnapshots?: SpiritCard[];
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
}

type LegacyGeneral = BreedingGeneral & AgingGeneral & { retiredSeason?: number };

/**
 * 明確布林 isHistorical 直接採用，正式資料由 registry uid / is_virtual 產出；
 * 史實人物即使有父母資料也不取消史實資格。不使用 registry template_id。
 * 舊資料缺欄位時才沿用 GEN_ 模板 + general/famed/titled、無子嗣標記的推定。
 * 女性正式模板仍需官方 GEN_ 格式且無遊戲子嗣標記；明確 false 不關閉女性路徑。
 * 舊資料模板格式契約仍是暫定相容規則，不以名字、稀有度或沒有父母單獨推定。
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
        isHistorical: typeof identity.isHistorical === 'boolean'
            ? identity.isHistorical
            : !descendant && officialTemplate && historicalCategory,
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
    private _ready: Promise<void> | null = null;

    constructor(private readonly _adapter: DataStorageAdapter, options: LegacyServiceOptions = {}) {
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
        for (const id of deadIds) {
            const dead = roster.find((g) => g.id === id) as LegacyGeneral | undefined;
            if (!dead) continue;
            // archive 的既有預設行為不變。先保留已決定的標記，再建立快照並由本服務判資格。
            // 同 uid 重跑時 true/false 均保留；舊資料缺欄位不批次遷移，只處理這次死亡。
            const previous = await this._archiver.getSpiritCard(dead.id);
            const archived = await this._archiveDeath(dead, roster, deadIds, season, year);
            const identity = toTigerTallyGeneral(dead);
            // 已決定的標記優先保留；新死亡者只有在同模板尚無正式卡時才取得資格。
            // 查詢排除自己，快照與虎符仍照常產出，不處理舊檔中既有重複卡。
            const isSpiritRelic = previous?.isSpiritRelic ??
                (isTallyEligible(identity) &&
                    !await this._archiver.hasOtherSpiritRelic(dead.id, dead.templateId));
            const snapshot = await this._archiver.markSpiritRelic(archived.uid, isSpiritRelic);
            archivedSnapshots.push(snapshot);
            if (snapshot.isSpiritRelic === true) spiritCards.push(snapshot);
        }
        const nextRoster = roster.filter((g) => !deadIds.has(g.id));

        const seasonEnd = await this._scheduler.onSeasonEnd(season, year);
        const yearEnd = advance.yearEnded ? await this._scheduler.onYearEnd(year) : null;
        return { roster: nextRoster, settlement: { spiritCards, archivedSnapshots, seasonEnd, yearEnd } };
    }

    public getArchiver(): GeneralArchiver {
        return this._archiver;
    }

    public async getMentorCards(): Promise<MentorCard[]> {
        await this._ensureReady();
        return (await this._adapter.get<MentorCard[]>(STORE_MENTOR_CARDS)) ?? [];
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
