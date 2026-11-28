// @spec-source → Q版社會總規格書 QSOC-01 第 4.4 節（切換流程）、第 7.2 節（收藏／最近走存檔 API）；PROG-2-10212
/**
 * SceneSwitchService — 任意場景直達、最近 8 筆、收藏 12 筆、大圖快取提示（純邏輯，不依賴 cc）
 *
 * 職責：驗證目標場景、更新「目前場景」、寫入最近與收藏、算切換總時間、決定要不要顯示佔位底圖＋施工中。
 * 不負責：實際載圖與淡入淡出（view 讀 transitionSec 播放）、場景內容（WP3）。
 * 存檔：走 LifeSceneStorePort（對應 QSOC-01 第 7.2 節的存檔 API）；目前只有記憶體假實作，
 *       之後換成共用存檔 API 的 adapter 不用改本檔。存檔失敗不影響切換。
 */
import type { SceneRegistry } from './SceneRegistry';

export interface RecentEntry {
    sceneId: string;
    /** 去過時的時段序號 0～6（可選） */
    slot?: number;
    /** 毫秒時間戳 */
    at: number;
}

export interface LifeSceneSaveState {
    recent: RecentEntry[];
    favorites: string[];
}

export interface LifeSceneStorePort {
    load(): Promise<LifeSceneSaveState | null>;
    save(state: LifeSceneSaveState): Promise<void>;
}

/** 假實作：只存在記憶體 */
export class InMemoryLifeSceneStore implements LifeSceneStorePort {
    public saved: LifeSceneSaveState | null = null;
    public saveCount = 0;

    public constructor(initial: LifeSceneSaveState | null = null) {
        this.saved = initial ? cloneState(initial) : null;
    }

    public async load(): Promise<LifeSceneSaveState | null> {
        return this.saved ? cloneState(this.saved) : null;
    }

    public async save(state: LifeSceneSaveState): Promise<void> {
        this.saved = cloneState(state);
        this.saveCount++;
    }
}

function cloneState(s: LifeSceneSaveState): LifeSceneSaveState {
    return { recent: s.recent.map((r) => ({ ...r })), favorites: [...s.favorites] };
}

export interface SceneSwitchOptions {
    slot?: number;
    now?: number;
    /** 找人跳轉的鏡頭對焦要求，原樣帶給 view */
    focus?: 'center' | 'actor' | 'none';
    focusGeneralId?: string;
}

export interface SceneSwitchResult {
    ok: boolean;
    reason?: 'unknown-scene';
    sceneId: string;
    fromSceneId: string | null;
    areaId?: string;
    /** 沒有美術：view 顯示通用佔位底圖＋「施工中」 */
    underConstruction: boolean;
    /** 淡出＋淡入總秒數（載入視為一幀內完成的佔位底圖） */
    transitionSec: number;
    /** 大圖是否已在快取（同區內切換不用重載） */
    areaCached: boolean;
    focus: 'center' | 'actor' | 'none';
    focusGeneralId?: string;
}

export interface SceneSwitchConfig {
    recentMax: number;
    favoritesMax: number;
    fadeOutSec: number;
    fadeInSec: number;
    /** 記憶體保留的大圖張數 */
    areaCacheSize: number;
}

export const DEFAULT_SWITCH_CONFIG: SceneSwitchConfig = {
    recentMax: 8,
    favoritesMax: 12,
    fadeOutSec: 0.25,
    fadeInSec: 0.25,
    areaCacheSize: 2,
};

export type SceneSwitchListener = (result: SceneSwitchResult) => void;

export class SceneSwitchService {
    private _current: string | null = null;
    private _recent: RecentEntry[] = [];
    private _favorites: string[] = [];
    /** 最近使用的大圖，最新在前 */
    private _areaCache: string[] = [];
    private readonly _listeners: SceneSwitchListener[] = [];
    private readonly _cfg: SceneSwitchConfig;

    public constructor(
        private readonly _registry: SceneRegistry,
        private readonly _store: LifeSceneStorePort = new InMemoryLifeSceneStore(),
        config: Partial<SceneSwitchConfig> = {},
    ) {
        this._cfg = { ...DEFAULT_SWITCH_CONFIG, ...config };
    }

    /** 從存檔載入最近與收藏（失敗或空存檔就用空清單）；不在註冊表內的舊 id 會被丟掉 */
    public async init(): Promise<void> {
        let state: LifeSceneSaveState | null = null;
        try {
            state = await this._store.load();
        } catch {
            state = null;
        }
        if (!state) return;
        this._recent = state.recent.filter((r) => this._registry.hasScene(r.sceneId)).slice(0, this._cfg.recentMax);
        this._favorites = state.favorites.filter((id) => this._registry.hasScene(id)).slice(0, this._cfg.favoritesMax);
    }

    public get currentSceneId(): string | null { return this._current; }
    public get recent(): readonly RecentEntry[] { return this._recent; }
    public get favorites(): readonly string[] { return this._favorites; }

    /** 切換總秒數＝淡出＋淡入；規格 0.5 秒，驗收上限 0.8 秒 */
    public get transitionSec(): number { return this._cfg.fadeOutSec + this._cfg.fadeInSec; }

    /** 預載建議：「最近」第 1 筆所在的大圖 */
    public get preloadAreaId(): string | undefined {
        const first = this._recent[0];
        return first ? this._registry.areaOf(first.sceneId) : undefined;
    }

    public get cachedAreas(): readonly string[] { return this._areaCache; }

    public onSwitch(listener: SceneSwitchListener): () => void {
        this._listeners.push(listener);
        return () => {
            const i = this._listeners.indexOf(listener);
            if (i >= 0) this._listeners.splice(i, 1);
        };
    }

    /** 任一場景直達任一場景；切換本身不耗任何東西（QSOC-01 4.4） */
    public switchTo(sceneId: string, options: SceneSwitchOptions = {}): SceneSwitchResult {
        const scene = this._registry.getScene(sceneId);
        const from = this._current;
        if (!scene) {
            return {
                ok: false, reason: 'unknown-scene', sceneId, fromSceneId: from, underConstruction: false,
                transitionSec: 0, areaCached: false, focus: 'none',
            };
        }
        const areaCached = this._areaCache.includes(scene.areaId);
        this._touchAreaCache(scene.areaId);
        this._current = sceneId;
        this._pushRecent({ sceneId, slot: options.slot, at: options.now ?? Date.now() });
        const result: SceneSwitchResult = {
            ok: true,
            sceneId,
            fromSceneId: from,
            areaId: scene.areaId,
            underConstruction: !scene.hasArt,
            transitionSec: this.transitionSec,
            areaCached,
            focus: options.focus ?? 'none',
            focusGeneralId: options.focusGeneralId,
        };
        this._persist();
        for (const l of [...this._listeners]) l(result);
        return result;
    }

    public isFavorite(sceneId: string): boolean {
        return this._favorites.includes(sceneId);
    }

    /** 收藏／取消收藏。已滿 12 個且要新增時回 'full'，不改動 */
    public toggleFavorite(sceneId: string): 'added' | 'removed' | 'full' | 'unknown-scene' {
        if (!this._registry.hasScene(sceneId)) return 'unknown-scene';
        const idx = this._favorites.indexOf(sceneId);
        if (idx >= 0) {
            this._favorites.splice(idx, 1);
            this._persist();
            return 'removed';
        }
        if (this._favorites.length >= this._cfg.favoritesMax) return 'full';
        this._favorites.push(sceneId);
        this._persist();
        return 'added';
    }

    public get favoritesMax(): number { return this._cfg.favoritesMax; }

    private _pushRecent(entry: RecentEntry): void {
        this._recent = [entry, ...this._recent.filter((r) => r.sceneId !== entry.sceneId)].slice(0, this._cfg.recentMax);
    }

    private _touchAreaCache(areaId: string): void {
        this._areaCache = [areaId, ...this._areaCache.filter((a) => a !== areaId)].slice(0, this._cfg.areaCacheSize);
    }

    private _persist(): void {
        // 存檔失敗不擋切換；adapter 自己負責重試與提示
        void this._store.save({ recent: this._recent, favorites: this._favorites }).catch(() => undefined);
    }
}
