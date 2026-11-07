// @spec-source → 重複名將分流彈窗與復生重練協議規格書 (doc_spec_0331) §1；DUP-01；PROG-2-2072
/**
 * DuplicatePullPopupController — 重複抽卡分流彈窗（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 抽卡結算拿到已持有的名將時，逐位詢問「復生重練／血脈灌注」
 *   - 十連抽防疲勞：勾選「本次抽卡批次預設沿用此選擇」後，選一次就套用到剩下的重複卡
 *   - ask() 回傳 Promise，全部選完才 resolve，每位重複卡一筆選擇
 *
 * 所有 texts / actives / enabled 的 key 都等於 duplicate-pull-popup-main.json 的節點 id，
 * tests/DuplicatePullPopup.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Choose / ToggleBatchDefault，畫面層拿 GetView() 一次刷新。
 */

export type DuplicatePullRoute = 'rebirth' | 'infusion';

export interface DuplicatePullEntry {
    id: string;
    name: string;
}

export interface DuplicatePullChoice {
    id: string;
    route: DuplicatePullRoute;
}

export interface DuplicatePullPopupView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 規格書 §1 彈窗文案；{name} 換成目前這位重複名將 */
export const DUPLICATE_PULL_TEXTS = {
    title: '宿命牽引・名將重逢',
    subtitle: '已持有「{name}」本體，請選擇其精魄轉化路徑：',
    rebirth: {
        title: '復生重練',
        tagline: '青龍靈光／突破極限',
        bullets: ['重新塑造 20 歲巔峰之軀', '轉生次數 +1（上限 5 轉）', '單項五維成長上限 +100', '完整嵌回既有英靈傳承卡'],
        button: '選擇復生重練',
    },
    infusion: {
        title: '血脈灌注',
        tagline: '金鳳神芒／即時增強',
        bullets: ['既有英靈卡獲得 500 經驗', '專屬虎符戰鬥屬性提升', '宗族聲望立即增加 50 點', '現役武將狀態完全保留'],
        button: '選擇血脈灌注',
    },
    batchDefault: '本次抽卡批次預設沿用此選擇',
} as const;

const bulletText = (lines: readonly string[]): string => lines.map((line) => `• ${line}`).join('\n');

export class DuplicatePullPopupController {
    private _queue: DuplicatePullEntry[] = [];
    private _choices: DuplicatePullChoice[] = [];
    private _batchDefault = false;
    private _resolve: ((choices: DuplicatePullChoice[]) => void) | null = null;

    /** 開始詢問；沒有重複卡時立即回傳空陣列。前一輪還沒選完時，前一輪以已選的部分結束。 */
    ask(entries: readonly DuplicatePullEntry[]): Promise<DuplicatePullChoice[]> {
        this.cancel();
        this._queue = [...entries];
        this._choices = [];
        this._batchDefault = false;
        if (this._queue.length === 0) return Promise.resolve([]);
        return new Promise((resolve) => { this._resolve = resolve; });
    }

    isOpen(): boolean {
        return this._resolve !== null;
    }

    current(): DuplicatePullEntry | null {
        return this.isOpen() ? this._queue[this._choices.length] ?? null : null;
    }

    toggleBatchDefault(): void {
        if (this.isOpen()) this._batchDefault = !this._batchDefault;
    }

    /** 選定目前這位；勾選批次預設時一併套用到剩下的。全部選完回傳 true（畫面該關閉）。 */
    choose(route: DuplicatePullRoute): boolean {
        if (!this.isOpen()) return true;
        const remaining = this._queue.slice(this._choices.length, this._batchDefault ? undefined : this._choices.length + 1);
        for (const entry of remaining) this._choices.push({ id: entry.id, route });
        if (this._choices.length < this._queue.length) return false;
        this._finish();
        return true;
    }

    /** 中止詢問（例如畫面掛不起來），以已選的部分結束 */
    cancel(): void {
        if (this.isOpen()) this._finish();
    }

    getView(): DuplicatePullPopupView {
        const entry = this.current();
        const total = this._queue.length;
        const position = Math.min(this._choices.length + 1, total);
        return {
            texts: {
                dupTitle: DUPLICATE_PULL_TEXTS.title,
                dupSubtitle: DUPLICATE_PULL_TEXTS.subtitle.replace('{name}', entry?.name ?? ''),
                dupPager: total > 1 ? `${position} / ${total}` : '',
                dupRebirthTitle: DUPLICATE_PULL_TEXTS.rebirth.title,
                dupRebirthTagline: DUPLICATE_PULL_TEXTS.rebirth.tagline,
                dupRebirthBody: bulletText(DUPLICATE_PULL_TEXTS.rebirth.bullets),
                dupRebirthLabel: DUPLICATE_PULL_TEXTS.rebirth.button,
                dupInfusionTitle: DUPLICATE_PULL_TEXTS.infusion.title,
                dupInfusionTagline: DUPLICATE_PULL_TEXTS.infusion.tagline,
                dupInfusionBody: bulletText(DUPLICATE_PULL_TEXTS.infusion.bullets),
                dupInfusionLabel: DUPLICATE_PULL_TEXTS.infusion.button,
                dupBatchLabel: `${this._batchDefault ? '[✓]' : '[ ]'} ${DUPLICATE_PULL_TEXTS.batchDefault}`,
            },
            // 只剩一位時沒有「沿用」的意義，勾選列隱藏
            actives: { btnDupBatchDefault: total - this._choices.length > 1 },
            enabled: { btnDupRebirth: entry !== null, btnDupInfusion: entry !== null },
        };
    }

    private _finish(): void {
        const resolve = this._resolve;
        this._resolve = null;
        resolve?.([...this._choices]);
    }
}
