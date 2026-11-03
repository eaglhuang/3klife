// @spec-source → 大廳系統規格書 doc_spec_0002 E-6；UI-2-0147（UI-2-0123 子項）：幕府大廳主題套用
/**
 * LobbyHallThemeApplier — 把 resolveHallTheme 算出的主題翻成大廳各節點的顯示指令。
 *
 * 節點以 lobby-hall-screen 的語意 id（設計稿 data-ucuf-id）指名，實際操作交給注入的 view，
 * 這裡不 import cc；掛進 LobbyScene 時由 Cocos 端以 _ucufId 找節點後實作 view。
 * 只在主題內容改變時下指令，每幀呼叫也不會重設 Sprite。
 * Unity 對照：像一個 ThemePresenter，把 ScriptableObject 主題套到一組 GameObject 參照上。
 */
import type { HallTheme, HallTint } from '../../core/systems/HallTheme';

export const LOBBY_HALL_THEME_NODE_IDS = {
    background: 'lobby-hall-screen.hall-bg',
    nightTint: 'lobby-hall-screen.night-tint',
    seasonTint: 'lobby-hall-screen.season-tint',
    sunrays: 'lobby-hall-screen.sunrays',
    festivalDecor: 'lobby-hall-screen.festival-slot',
} as const;

export interface LobbyHallThemeView {
    setActive(nodeId: string, active: boolean): void;
    /** resources 底下的圖片路徑（不含副檔名）。 */
    setSprite(nodeId: string, path: string): void;
    setTint(nodeId: string, tint: Readonly<HallTint> & { blend?: string }): void;
}

export class LobbyHallThemeApplier {
    private _signature: string | null = null;

    constructor(private readonly _view: LobbyHallThemeView) {}

    /** 套用主題；內容與上次相同時不動作並回傳 false。 */
    apply(theme: Readonly<HallTheme>): boolean {
        const signature = JSON.stringify(theme);
        if (signature === this._signature) return false;
        this._signature = signature;

        const ids = LOBBY_HALL_THEME_NODE_IDS;
        const view = this._view;
        view.setSprite(ids.background, theme.backgroundPath);

        view.setActive(ids.nightTint, theme.nightTint !== null);
        if (theme.nightTint) view.setTint(ids.nightTint, theme.nightTint);

        view.setTint(ids.seasonTint, theme.seasonTint);
        view.setActive(ids.sunrays, theme.sunrays);

        // 節慶裝飾槽平時隱藏；有節慶裝飾才開（E-6：節慶槽位平時為空，由配置開啟）
        view.setActive(ids.festivalDecor, theme.decorPath !== null);
        if (theme.decorPath) view.setSprite(ids.festivalDecor, theme.decorPath);
        return true;
    }

    /** 畫面重建後呼叫，讓下一次 apply 一定會重下全部指令。 */
    reset(): void {
        this._signature = null;
    }
}
