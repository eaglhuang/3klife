// @spec-source → 史境天下風雲榜與年終頒獎典禮系統規格書 §8.2 大廳進場隊列順序；PROG-2-9613
/**
 * LobbyGuideQueue — 大廳導流通用隊列（純邏輯，不依賴 cc）。
 *
 * 職責：
 * 管理大廳所有主動引導與侍從頭頂驚嘆號/氣泡（晉升解鎖、紅娘叩門/春季說親、年終典禮等）。
 * 嚴格遵循大廳進場隊列優先順序：
 * 1. 年終典禮（annual-gala）
 * 2. 官職晉升詔書（officer-promotion）
 * 3. 結緣媒人說親（matchmaker）
 *
 * 保證同人同標記：所選的帶領武將在場時沿用，輪替不換人，標記與氣泡始終為同一人。
 */

export type GuidePriority = 'annual-gala' | 'officer-promotion' | 'matchmaker';

const PRIORITY_ORDER: Record<GuidePriority, number> = {
    'annual-gala': 1,
    'officer-promotion': 2,
    'matchmaker': 3,
};

export interface LobbyGuideItem {
    id: string;
    priority: GuidePriority;
    markStyle: string;         // 'promotion'（金色！）或自定義標記
    guideSpeech: string;       // 侍從/武將氣泡文案
    acceptLabel: string;       // 接受按鈕（例如「立即前往」、「立即相看」）
    declineLabel: string;      // 稍後按鈕（例如「稍後再議」）
    actionId: string;          // 導流動作或彈窗標識
    payload?: unknown;
    onAccept?: () => void;
    onDecline?: () => void;
}

export class LobbyGuideQueue {
    private _items: LobbyGuideItem[] = [];
    private _anchorGeneralId: string | null = null;

    /** 加入一項導流（若同 id 存在則更新） */
    public enqueue(item: LobbyGuideItem): void {
        const index = this._items.findIndex((i) => i.id === item.id);
        if (index >= 0) {
            this._items[index] = item;
        } else {
            this._items.push(item);
        }
        this._sort();
    }

    /** 移除指定導流 */
    public dequeue(id: string): LobbyGuideItem | undefined {
        const index = this._items.findIndex((i) => i.id === id);
        if (index < 0) return undefined;
        const [removed] = this._items.splice(index, 1);
        if (this._items.length === 0) {
            this._anchorGeneralId = null;
        }
        return removed;
    }

    /** 取得目前最高優先級的引導項 */
    public peek(): LobbyGuideItem | undefined {
        return this._items[0];
    }

    /** 是否有待引導項 */
    public get hasPending(): boolean {
        return this._items.length > 0;
    }

    /** 清空隊列 */
    public clear(): void {
        this._items = [];
        this._anchorGeneralId = null;
    }

    /** 取得所有待辦項目 */
    public getAll(): readonly LobbyGuideItem[] {
        return this._items;
    }

    /**
     * 綁定頭頂標記的武將（同人同標記）。
     * 若已選武將仍在在場清單中則沿用，否則選取在場第一位武將。
     */
    public bindAnchorGeneral(presentGenerals: readonly { id: string }[]): string | null {
        if (presentGenerals.length === 0 || !this.hasPending) {
            this._anchorGeneralId = null;
            return null;
        }
        const kept = presentGenerals.find((g) => g.id === this._anchorGeneralId);
        this._anchorGeneralId = (kept ?? presentGenerals[0]).id;
        return this._anchorGeneralId;
    }

    /** 目前綁定的武將 ID */
    public get anchorGeneralId(): string | null {
        return this._anchorGeneralId;
    }

    public setAnchorGeneralId(id: string | null): void {
        this._anchorGeneralId = id;
    }

    private _sort(): void {
        this._items.sort((a, b) => {
            const orderA = PRIORITY_ORDER[a.priority] ?? 99;
            const orderB = PRIORITY_ORDER[b.priority] ?? 99;
            return orderA - orderB;
        });
    }
}
