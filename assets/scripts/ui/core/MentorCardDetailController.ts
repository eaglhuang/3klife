/**
 * MentorCardDetailController — 教官卡詳情畫面的狀態（MENT-13 cc 接線，純邏輯，不依賴 cc）
 *
 * 記住目前的卡與頁籤；頁籤切換與開關只改這裡的狀態，畫面端用 getView() 取得節點資料後套上去。
 *
 * Unity 對照：像一個 Panel 的 Presenter，持有目前的 ScriptableObject 與選中的 Tab 索引，
 * View 只負責 Bind 結果。
 */
import {
    buildMentorCardTabView,
    toMentorCardLayoutState,
    type MentorCardData,
    type MentorCardTab,
} from '../../core/systems/MentorCardTabs';

export interface MentorCardDetailView {
    /** 是否顯示整個面板 */
    open: boolean;
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    /** 目前頁籤；面板關閉時為 'effects' */
    activeTab: MentorCardTab;
}

export class MentorCardDetailController {
    private _card: MentorCardData | null = null;
    private _title = '';
    private _tab: MentorCardTab = 'effects';

    /** 開啟某張教官卡，預設回到支援效果頁 */
    open(card: MentorCardData, title: string): void {
        this._card = card;
        this._title = title;
        this._tab = 'effects';
    }

    close(): void {
        this._card = null;
        this._title = '';
        this._tab = 'effects';
    }

    selectTab(tab: MentorCardTab): void {
        this._tab = tab;
    }

    getView(): MentorCardDetailView {
        if (!this._card) {
            return { open: false, texts: {}, actives: {}, activeTab: 'effects' };
        }
        const tabView = buildMentorCardTabView(this._card, this._tab);
        const state = toMentorCardLayoutState(tabView, this._title);
        return { open: true, ...state, activeTab: tabView.activeTab };
    }
}
