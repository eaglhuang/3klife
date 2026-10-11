// @spec-source → 遊戲時間系統.md (doc_spec_0034)、武將壽命系統.md (doc_spec_0018)、MVP遊戲驗證規格書.md (doc_spec_0045) §E #13 #14
/**
 * GameSession — 長局主迴圈（季度推進 + 增齡 + 存檔），純邏輯，不依賴 cc
 *
 * 一次 advanceSeason() 依序做：
 *   1. GameClock 推進 1 季（含模式輪轉、跨年判斷）
 *   2. 名冊中所有存活武將增齡、判定退役候選與死亡
 *   3. 透過注入的名冊來源寫回名冊
 *   4. 若有掛存檔服務，自動存檔
 *   5. 廣播事件給 UI / 其他系統
 *
 * 名冊來源與事件匯流排都用介面注入，因此可以在 headless 測試直接跑完整迴圈。
 *
 * Unity 對照：像一個 DontDestroyOnLoad 的 GameManager 持有 TimeManager 與 SaveSystem，
 * 每季呼叫一次 AdvanceSeason()，再用 C# event 通知 UI 更新「第 N 年 M 季」。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { GameClock, GameTimeState, SeasonAdvanceResult } from '../systems/GameClock';
import { ageGeneralsOneSeason, AgingEvent, RandomSource } from '../systems/GeneralAging';
import { createPlayerSaveSnapshot, PlayerSaveService, PlayerSaveSnapshot } from '../services/PlayerSaveService';

export const GAME_SESSION_EVENTS = {
    /** payload: SeasonAdvancedPayload */
    SeasonAdvanced: 'game-session-season-advanced',
    /** payload: AgingEvent（type = reached-retirement-age） */
    GeneralReachedRetirementAge: 'game-session-general-retirement-age',
    /** payload: AgingEvent（type = died） */
    GeneralDied: 'game-session-general-died',
    /** payload: PlayerSaveSnapshot */
    Saved: 'game-session-saved',
    /** payload: PlayerSaveSnapshot */
    Loaded: 'game-session-loaded',
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
    private _random: RandomSource = Math.random;
    private _autoSave = true;

    public get gameTime(): GameTimeState {
        return this._clock.state;
    }

    public get roster(): GeneralConfig[] {
        return this._roster.getAll();
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

    public setSaveService(service: PlayerSaveService | null): void {
        this._save = service;
    }

    /** 測試用：注入可重現的亂數 */
    public setRandomSource(random: RandomSource): void {
        this._random = random;
    }

    public setAutoSave(enabled: boolean): void {
        this._autoSave = enabled;
    }

    /** 開新局：時鐘歸零，名冊不動（由開場流程決定初始武將） */
    public startNewGame(): void {
        this._clock = new GameClock();
    }

    public async advanceSeason(): Promise<SeasonAdvancedPayload> {
        const advance = this._clock.advanceSeason();
        const aging = ageGeneralsOneSeason(this._roster.getAll(), this._random);
        this._roster.replaceAll(aging.roster);

        const payload: SeasonAdvancedPayload = { advance, agingEvents: aging.events };
        if (this._autoSave && this._save) {
            await this.save();
        }

        this._emit(GAME_SESSION_EVENTS.SeasonAdvanced, payload);
        for (const event of aging.events) {
            this._emit(
                event.type === 'died'
                    ? GAME_SESSION_EVENTS.GeneralDied
                    : GAME_SESSION_EVENTS.GeneralReachedRetirementAge,
                event,
            );
        }
        return payload;
    }

    public createSnapshot(now?: Date): PlayerSaveSnapshot {
        return createPlayerSaveSnapshot(this._clock.state, this._roster.getAll(), now);
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
        this._roster.replaceAll(snapshot.roster);
        this._emit(GAME_SESSION_EVENTS.Loaded, snapshot);
        return true;
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
