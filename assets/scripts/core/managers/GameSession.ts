// @spec-source → 遊戲時間系統.md (doc_spec_0034)、武將壽命系統.md (doc_spec_0018)、MVP遊戲驗證規格書.md (doc_spec_0045) §E #13 #14
/**
 * GameSession — 長局主迴圈（季度推進 + 增齡 + 存檔），純邏輯，不依賴 cc
 *
 * 一次 advanceSeason() 依序做：
 *   1. GameClock 推進 1 季（含模式輪轉、跨年判斷）
 *   2. 名冊中所有存活武將增齡、判定退役候選與死亡
 *   3. 年滿 5 歲的子嗣自動開獎（揭曉五維與初始因子，產生宿命建議）
 *   3.5 武將精力回補（出征 +25%、待命 +50%）
 *   3.6 母方待產倒數 −1；待產中的母方精力不回補（Pregnancy_Lock）
   4. 透過注入的名冊來源寫回名冊
 *   5. 若有掛 SeasonLifecycle（LegacyService）：死亡武將歸檔成英靈卡並移出名冊，
 *      再跑季結 / 年底資料壓縮與清掃
 *   6. 若有掛存檔服務，自動存檔（含進行中的培育會話）
 *   7. 廣播事件給 UI / 其他系統
 *
 * 退役是玩家的決定，不會自動發生：UI 收到 GeneralReachedRetirementAge 後讓玩家選，
 * 再呼叫 retireGeneral()。
 *
 * 名冊來源與事件匯流排都用介面注入，因此可以在 headless 測試直接跑完整迴圈。
 *
 * Unity 對照：像一個 DontDestroyOnLoad 的 GameManager 持有 TimeManager 與 SaveSystem，
 * 每季呼叫一次 AdvanceSeason()，再用 C# event 通知 UI 更新「第 N 年 M 季」。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { GameClock, GameTimeState, SeasonAdvanceResult } from '../systems/GameClock';
import { ageGeneralsOneSeason, AgingEvent, RandomSource } from '../systems/GeneralAging';
import type { LifecycleSettlement, SeasonLifecycle } from '../services/LegacyService';
import type { MentorCard } from '../models/MentorCard';
import { normalizeDeck, toggleDeckCard, DeckToggleOutcome } from '../services/PlayerDeckRules';
import { SeededRandom, LEGACY_RANDOM_SEED } from '../systems/SeededRandom';
import { createPlayerSaveSnapshot, PlayerSaveService, PlayerSaveSnapshot } from '../services/PlayerSaveService';
import type { NurtureState } from '../services/NurtureService';
import { awakenFactor, AwakeningFailReason, AwakeningTrigger, FactorAwakenedEvent } from '../systems/FactorAwakening';
import type { FactorDictionary } from '../systems/FactorInheritance';
import { unveilDueGenerals, UnveilingEvent, UnveilingGeneral } from '../systems/Unveiling';
import { advanceBreedingSeason, holdPregnancyVigor } from '../systems/BreedingSystem';
import {
    BattleResult,
    BattleSettlement,
    buildBattleConfig,
    checkDeployable,
    DeployCheck,
    listDeployable,
    recoverVitalityOneSeason,
    settleBattle,
} from '../systems/BattleRoster';

export const GAME_SESSION_EVENTS = {
    /** payload: SeasonAdvancedPayload */
    SeasonAdvanced: 'game-session-season-advanced',
    /** payload: AgingEvent（type = reached-retirement-age） */
    GeneralReachedRetirementAge: 'game-session-general-retirement-age',
    /** payload: AgingEvent（type = died） */
    GeneralDied: 'game-session-general-died',
    /** payload: UnveilingEvent（UI 在此播放血脈命鏡開獎演出，再讓玩家選宿命） */
    GeneralUnveiled: 'game-session-general-unveiled',
    /** payload: MentorCard */
    GeneralRetired: 'game-session-general-retired',
    /** payload: SpiritCard（每位死亡武將一張） */
    SpiritCardCreated: 'game-session-spirit-card-created',
    /** payload: BattleSettlement（戰後精力、戰績、功勳已寫回名冊） */
    BattleSettled: 'game-session-battle-settled',
    /** payload: string | null（出戰主將 id） */
    LeadGeneralChanged: 'game-session-lead-general-changed',
    /** payload: PlayerSaveSnapshot */
    Saved: 'game-session-saved',
    /** payload: GeneralConfig[]（本次新加入名冊的武將） */
    RosterChanged: 'game-session-roster-changed',
    /** payload: PlayerSaveSnapshot */
    Loaded: 'game-session-loaded',
    /** payload: string[]（新的出戰卡組） */
    DeckChanged: 'game-session-deck-changed',
    /** payload: FactorAwakenedEvent */
    FactorAwakened: 'game-session-factor-awakened',
} as const;

/** 名冊來源；正式環境接 PlayerRosterService，測試接記憶體陣列 */
export interface RosterStore {
    getAll(): GeneralConfig[];
    replaceAll(generals: GeneralConfig[]): void;
}

/** 只需要 emit 的最小事件介面，正式環境傳入 EventSystem */
export interface SessionEventEmitter {
    emit(eventName: string, payload?: unknown): void;
}

export interface SeasonAdvancedPayload {
    advance: SeasonAdvanceResult;
    agingEvents: AgingEvent[];
    /** 本季新開獎的子嗣 */
    unveilings: UnveilingEvent[];
    /** 有掛 SeasonLifecycle 才有；包含本季新建的英靈卡與季結 / 年底排程結果 */
    lifecycle?: LifecycleSettlement;
}

/** 進行中的培育會話存取介面；正式環境為 NurtureService，讓存檔帶著培育進度 */
export interface NurtureStatePort {
    getState(): NurtureState;
    restoreState(state: NurtureState | null | undefined): void;
}

export interface AddGeneralsResult {
    added: GeneralConfig[];
    duplicates: GeneralConfig[];
}

export class InMemoryRosterStore implements RosterStore {
    private _generals: GeneralConfig[];

    constructor(initial: GeneralConfig[] = []) {
        this._generals = initial.map((general) => ({ ...general }));
    }

    getAll(): GeneralConfig[] {
        return this._generals.map((general) => ({ ...general }));
    }

    replaceAll(generals: GeneralConfig[]): void {
        this._generals = generals.map((general) => ({ ...general }));
    }
}

export class GameSession {
    private _clock = new GameClock();
    private _roster: RosterStore = new InMemoryRosterStore();
    private _save: PlayerSaveService | null = null;
    private _events: SessionEventEmitter | null = null;
    private _lifecycle: SeasonLifecycle | null = null;
    private _seeded: SeededRandom;
    private _random: RandomSource = () => this._seeded.next();
    /** 共用入口保持同一函式身分，讀檔恢復游標後既有服務會立即使用新狀態。 */
    public readonly randomSource: RandomSource = () => this._random();

    private _autoSave = true;
    private _nurture: NurtureStatePort | null = null;
    private _factorDictionary: FactorDictionary | undefined;
    private _deck: string[] = [];
    private _leadGeneralId: string | null = null;
    private _discoveryLevel = 1;

    constructor(seed: number = Math.floor(Math.random() * 4294967296)) {
        this._seeded = new SeededRandom(seed);
    }

    public get gameTime(): GameTimeState {
        return this._clock.state;
    }

    public get roster(): GeneralConfig[] {
        return this._roster.getAll();
    }

    /** 玩家出戰卡組（複本）；空陣列 = 尚未選卡，戰場端會退回預設卡組 */
    /** 玩家指定的出戰主將 id（可能已不能出戰，取用請走 resolveLeadGeneralId） */
    public get leadGeneralId(): string | null {
        return this._leadGeneralId;
    }

    public get deck(): string[] {
        return [...this._deck];
    }

    /** 因子覺醒用的玩家層級（決定能解鎖到哪個色階） */
    public get discoveryLevel(): number {
        return this._discoveryLevel;
    }

    public get hasSaveService(): boolean {
        return this._save !== null;
    }

    public setRosterStore(store: RosterStore): void {
        this._roster = store;
    }

    public setEventEmitter(emitter: SessionEventEmitter | null): void {
        this._events = emitter;
    }

    public setLifecycle(lifecycle: SeasonLifecycle | null): void {
        this._lifecycle = lifecycle;
    }

    public setSaveService(service: PlayerSaveService | null): void {
        this._save = service;
    }

    /** 測試替身：外部 callback 的內部狀態不納入存檔。 */
    public setRandomSource(random: RandomSource): void {
        this._random = random;
    }

    public setAutoSave(enabled: boolean): void {
        this._autoSave = enabled;
    }

    public setNurtureStatePort(port: NurtureStatePort | null): void {
        this._nurture = port;
    }

    /** 開獎的宿命建議要靠因子字典分武 / 文；沒有字典時只看五維 */
    public setFactorDictionary(dictionary: FactorDictionary | undefined): void {
        this._factorDictionary = dictionary;
    }

        /** 開新局：時鐘與卡組歸零，名冊不動（由開場流程決定初始武將） */
    public startNewGame(seed: number = Math.floor(Math.random() * 4294967296)): void {
        this._seeded = new SeededRandom(seed);
        this._clock = new GameClock();
        this._deck = [];
        this._leadGeneralId = null;
        this._discoveryLevel = 1;
    }

    /** 指定出戰主將；必須是目前可出戰的名冊武將，否則回傳 false 且不變 */
    public async setLeadGeneral(generalId: string | null): Promise<boolean> {
        if (generalId !== null && !this.checkDeployable(generalId).eligible) {
            return false;
        }
        this._leadGeneralId = generalId;
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.LeadGeneralChanged, generalId);
        return true;
    }

    /** 進戰場的我軍主將：指定的主將還能出戰就用它，否則用 fallbackId（遭遇戰預設） */
    public resolveLeadGeneralId(fallbackId: string): string {
        const lead = this._leadGeneralId;
        return lead && this.checkDeployable(lead).eligible ? lead : fallbackId;
    }

    /** 戰場建立我軍主將時查詢：名冊內可出戰才回傳戰場用設定，否則 null（沿用內建 / JSON 武將） */
    public getBattleConfig(generalId: string, faction: GeneralConfig['faction']): GeneralConfig | null {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general || !this.checkDeployable(generalId).eligible) {
            return null;
        }
        return buildBattleConfig(general, faction);
    }

    public async setDiscoveryLevel(level: number): Promise<void> {
        this._discoveryLevel = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
        if (this._autoSave && this._save) {
            await this.save();
        }
    }

    /** 覺醒名冊中某位武將的鎖定因子；失敗回傳原因，成功才改名冊、存檔並廣播 */
    public async awakenFactor(
        generalId: string,
        factorId: string,
        trigger: AwakeningTrigger,
    ): Promise<{ ok: true; event: FactorAwakenedEvent } | { ok: false; reason: AwakeningFailReason }> {
        const roster = this._roster.getAll();
        const result = awakenFactor(roster.find((g) => g.id === generalId), factorId, trigger, this._discoveryLevel);
        if (!result.ok) {
            return result;
        }
        this._roster.replaceAll(roster.map((g) => (g.id === generalId ? result.general : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.FactorAwakened, result.event);
        return { ok: true, event: result.event };
    }

    /** 整組覆寫出戰卡組（以 catalogIds 過濾未知 ID、去重、截到上限）並自動存檔 */
    public async setDeck(ids: readonly string[], catalogIds?: readonly string[]): Promise<string[]> {
        this._deck = normalizeDeck(ids, catalogIds);
        await this._commitDeck();
        return this.deck;
    }

    /** 選卡 UI 點一張卡：在卡組內就移除，否則加入（滿了不變）；有變動才存檔並廣播 */
    public async toggleDeckCard(cardId: string, catalogIds: readonly string[]): Promise<DeckToggleOutcome> {
        const result = toggleDeckCard(this._deck, cardId, catalogIds);
        if (result.outcome === 'added' || result.outcome === 'removed') {
            this._deck = result.deck;
            await this._commitDeck();
        }
        return result.outcome;
    }

    public async advanceSeason(): Promise<SeasonAdvancedPayload> {
        const advance = this._clock.advanceSeason();
        const aging = ageGeneralsOneSeason(this._roster.getAll(), this._random);
        const unveil = unveilDueGenerals(aging.roster as UnveilingGeneral[], {
            season: advance.current.totalSeasonsElapsed,
            dictionary: this._factorDictionary,
        });
        const recovered = recoverVitalityOneSeason(unveil.roster, advance.current.totalSeasonsElapsed - 1);
        let roster: GeneralConfig[] = advanceBreedingSeason(holdPregnancyVigor(unveil.roster, recovered)).generals;
        let lifecycle: LifecycleSettlement | undefined;
        if (this._lifecycle) {
            const settled = await this._lifecycle.settleSeason(roster, advance, aging.events);
            roster = settled.roster;
            lifecycle = settled.settlement;
        }
        this._roster.replaceAll(roster);

        const payload: SeasonAdvancedPayload = { advance, agingEvents: aging.events, unveilings: unveil.events, lifecycle };
        if (this._autoSave && this._save) {
            await this.save();
        }

        this._emit(GAME_SESSION_EVENTS.SeasonAdvanced, payload);
        for (const event of unveil.events) {
            this._emit(GAME_SESSION_EVENTS.GeneralUnveiled, event);
        }
        for (const event of aging.events) {
            this._emit(
                event.type === 'died'
                    ? GAME_SESSION_EVENTS.GeneralDied
                    : GAME_SESSION_EVENTS.GeneralReachedRetirementAge,
                event,
            );
        }
        for (const card of lifecycle?.spiritCards ?? []) {
            this._emit(GAME_SESSION_EVENTS.SpiritCardCreated, card);
        }
        return payload;
    }

    /** 玩家讓 65 歲以上的武將退役，轉成教官傳承資料並立即存檔 */
    public async retireGeneral(generalId: string): Promise<MentorCard> {
        if (!this._lifecycle) {
            throw new Error('[GameSession] 尚未設定 SeasonLifecycle（setLifecycle）');
        }
        const result = await this._lifecycle.retireGeneral(this._roster.getAll(), generalId, this._clock.state);
        this._roster.replaceAll(result.roster);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.GeneralRetired, result.card);
        return result.card;
    }

    /**
     * 抽卡 / 招募入口：把新武將寫進名冊（以 id 去重）並自動存檔。
     * 已持有的武將不會重複加入，回傳 duplicates 供 UI 提示（之後可換算成碎片）。
     */
    public async addGenerals(generals: GeneralConfig[]): Promise<AddGeneralsResult> {
        const owned = new Set(this._roster.getAll().map((general) => general.id));
        const added: GeneralConfig[] = [];
        const duplicates: GeneralConfig[] = [];
        for (const general of generals) {
            if (!general || typeof general.id !== 'string') {
                continue;
            }
            if (owned.has(general.id)) {
                duplicates.push(general);
                continue;
            }
            owned.add(general.id);
            added.push({ ...general });
        }

        if (added.length > 0) {
            this._roster.replaceAll([...this._roster.getAll(), ...added]);
            if (this._autoSave && this._save) {
                await this.save();
            }
            this._emit(GAME_SESSION_EVENTS.RosterChanged, added);
        }
        return { added, duplicates };
    }

    /** 目前名冊中可以出戰的武將（排除死亡、退役教官、未畢業子嗣、精力不足、培育中） */
    public getDeployableGenerals(): GeneralConfig[] {
        return listDeployable(this._roster.getAll(), { nurturingIds: this._nurturingIds() });
    }

    public checkDeployable(generalId: string): DeployCheck {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) {
            return { eligible: false, reasons: [] };
        }
        return checkDeployable(general, { nurturingIds: this._nurturingIds() });
    }

    /**
     * 戰後結算：出戰武將扣精力、記戰績與功勳，寫回名冊並存檔。
     * 名冊裡找不到的 id（例如內建 demo 武將）略過；ongoing 不結算。
     */
    public async recordBattle(deployedIds: readonly string[], result: BattleResult): Promise<BattleSettlement> {
        const settlement = settleBattle(this._roster.getAll(), {
            deployedIds,
            result,
            season: this._clock.state.totalSeasonsElapsed,
        });
        if (settlement.entries.length === 0) {
            return settlement;
        }
        this._roster.replaceAll(settlement.roster);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.BattleSettled, settlement);
        return settlement;
    }

    public createSnapshot(now?: Date): PlayerSaveSnapshot {
        return createPlayerSaveSnapshot(this._clock.state, this._roster.getAll(), now, this._nurture?.getState(), this._deck, this._leadGeneralId, this._discoveryLevel, this._seeded.snapshot());
    }

    public async save(): Promise<PlayerSaveSnapshot> {
        const service = this._requireSave();
        const snapshot = this.createSnapshot();
        await service.save(snapshot);
        this._emit(GAME_SESSION_EVENTS.Saved, snapshot);
        return snapshot;
    }

    /** 讀取存檔並套用；沒有存檔時回傳 false，狀態維持不變 */
    public async load(): Promise<boolean> {
        const snapshot = await this._requireSave().load();
        if (!snapshot) {
            return false;
        }
        this._clock.restore(snapshot.gameTime);
        this._seeded.restore(snapshot.randomState ?? { algorithm: 'mulberry32-v1', state: LEGACY_RANDOM_SEED });
        this._roster.replaceAll(snapshot.roster);
        this._nurture?.restoreState(snapshot.nurture);
        this._deck = [...snapshot.deck];
        this._leadGeneralId = snapshot.leadGeneralId ?? null;
        this._discoveryLevel = snapshot.discoveryLevel;
        this._emit(GAME_SESSION_EVENTS.Loaded, snapshot);
        return true;
    }

    private async _commitDeck(): Promise<void> {
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.DeckChanged, this.deck);
    }

    private _nurturingIds(): string[] {
        return (this._nurture?.getState().sessions ?? []).map((session) => session.childId);
    }

    private _requireSave(): PlayerSaveService {
        if (!this._save) {
            throw new Error('[GameSession] 尚未設定存檔服務（setSaveService）');
        }
        return this._save;
    }

    private _emit(eventName: string, payload: unknown): void {
        this._events?.emit(eventName, payload);
    }
}
