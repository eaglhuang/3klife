// @spec-source → docs/ 「UI 共用框架：主題系統與語系」章節（見 docs/cross-reference-index.md）
/**
 * ThemeService — UI 主題的執行期入口（純 TS，不依賴 cc）。
 *
 * 職責：持有登錄表與目前啟用的主題疊加、依 ThemeContext 自動解析、執行中切換並發事件讓畫面重套，
 * 切換時釋放「新主題用不到」的舊素材（手機記憶體優先）。
 * 不負責：載入圖片（由各畫面走 ResourceManager，路徑向 asset(key) 取）、字串翻譯（走 I18nSystem）。
 * Unity 對照：像 ThemeManager 單例；onThemeChanged ≈ 主題切換事件，release ≈ Addressables.Release。
 */
import {
    buildFamilyStyle, buildSkinStyle, mergeThemes, resolveActiveTheme,
    type ResolvedTheme, type ThemeAssetRef, type ThemeContext, type ThemeRegistry, type ThemeTokenValue,
} from './UIThemeResolver';
import type { SkinStyleTokens } from './ThemeSkinRestyle';

export interface ThemeChangeEvent {
    previousStack: string[];
    stack: string[];
    /** 本次釋放掉的舊素材 */
    releasedAssets: ThemeAssetRef[];
}

export type ThemeAssetReleaser = (asset: ThemeAssetRef) => void;

const assetId = (a: ThemeAssetRef): string => `${a.bundle ?? ''}::${a.path}`;

export class ThemeService {
    private _registry: ThemeRegistry | null = null;
    private _resolved: ResolvedTheme | null = null;
    private _skinStyle: SkinStyleTokens | null = null;
    private _familyStyles: SkinStyleTokens[] = [];
    private _handlers: Array<(e: ThemeChangeEvent) => void> = [];

    constructor(private readonly _releaseAsset: ThemeAssetReleaser = () => undefined) {}

    get ready(): boolean { return this._registry !== null; }
    get activeStack(): readonly string[] { return this._resolved?.stack ?? []; }

    /** 載入登錄表並啟用 default 主題（不發事件）。 */
    setRegistry(registry: ThemeRegistry): void {
        this._registry = registry;
        this._apply(mergeThemes(registry, []));
    }

    /** 依遊戲狀態（季節／日期／節慶／旗標）算出該疊哪些主題，規則全來自登錄表資料。 */
    resolveActiveTheme(ctx: ThemeContext): string[] {
        return this._registry ? resolveActiveTheme(this._registry, ctx) : [];
    }

    /** 執行中切換主題疊加（不含 default，default 自動墊底）；內容沒變不發事件。 */
    setTheme(stack: readonly string[]): ThemeChangeEvent | null {
        if (!this._registry || !this._resolved) return null;
        const next = mergeThemes(this._registry, stack);
        if (next.stack.join('|') === this._resolved.stack.join('|')) return null;
        const prev = this._resolved;
        this._apply(next);
        const keep = new Set(Object.values(next.assets).map(assetId));
        const released: ThemeAssetRef[] = [];
        for (const a of Object.values(prev.assets)) {
            if (keep.has(assetId(a)) || released.some(r => assetId(r) === assetId(a))) continue;
            this._releaseAsset(a);
            released.push(a);
        }
        const event: ThemeChangeEvent = { previousStack: prev.stack, stack: next.stack, releasedAssets: released };
        this._handlers.slice().forEach(h => h(event));
        return event;
    }

    /** 解析＋切換一次完成；每日換日、季節更替、活動開關時呼叫。 */
    refresh(ctx: ThemeContext): ThemeChangeEvent | null {
        return this.setTheme(this.resolveActiveTheme(ctx));
    }

    /** 語意 token；目前主題沒有時回退 default（合併時已墊底），仍沒有才回傳 fallback。 */
    token<T extends ThemeTokenValue = ThemeTokenValue>(key: string, fallback?: T): T | undefined {
        const v = this._resolved?.tokens[key];
        return (v === undefined ? fallback : v) as T | undefined;
    }

    asset(key: string): ThemeAssetRef | undefined { return this._resolved?.assets[key]; }

    /** 該 skin 是否要套主題樣式 */
    appliesToSkin(skinId: string): boolean {
        return this._registry?.styleBinding.appliesToSkins.includes(skinId) ?? false;
    }

    /** 目前主題對應的 skin 風格角色表（快取，主題切換時重建） */
    skinStyle(): SkinStyleTokens | null { return this._skinStyle; }

    /** 某個 skin 該套哪一組風格（大廳主風格或家族綁定，例如 settle 結算風格）；都不適用回 null。 */
    skinStyleFor(skinId: string): SkinStyleTokens | null {
        if (this.appliesToSkin(skinId)) return this._skinStyle;
        return this._familyStyles.find(f => f.appliesToSkins.includes(skinId)) ?? null;
    }

    /** 訂閱主題切換；回傳取消訂閱函式，請在畫面 onDestroy 呼叫。 */
    onThemeChanged(handler: (e: ThemeChangeEvent) => void): () => void {
        this._handlers.push(handler);
        return () => { this._handlers = this._handlers.filter(h => h !== handler); };
    }

    private _apply(resolved: ResolvedTheme): void {
        this._resolved = resolved;
        this._skinStyle = buildSkinStyle(resolved.tokens, this._registry!.styleBinding);
        const families = this._registry!.familyBindings ?? {};
        this._familyStyles = Object.keys(families).map(id => buildFamilyStyle(resolved.tokens, families[id], id));
    }
}
