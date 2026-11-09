// @spec-source → 重複名將分流彈窗與復生重練協議規格書 (doc_spec_0331) §1；DUP-01；PROG-2-2072
/**
 * DuplicatePullPopupController — 重複抽卡分流彈窗（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 抽卡結算拿到已持有的名將時，逐位詢問「復生重練／升星／血脈灌注」
 *   - 十連抽防疲勞：勾選「本次抽卡批次預設沿用此選擇」後，選一次就套用到剩下的重複卡
 *   - ask() 回傳 Promise，全部選完才 resolve，每位重複卡一筆選擇
 *   - 沒有可灌注的英靈卡時，灌注按鈕不能按；批次沿用灌注時這幾位改走復生（DUP-05；PROG-2-2073）
 *   - 轉蛋接線：splitOwnedDuplicates 先把已持有的重複卡留下，rebirthTargetsOf／infusionTargetsOf 依選擇分流
 *
 * 所有 texts / actives / enabled 的 key 都等於 duplicate-pull-popup-main.json 的節點 id，
 * tests/DuplicatePullPopup.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Choose / ToggleBatchDefault，畫面層拿 GetView() 一次刷新。
 */

export type DuplicatePullRoute = 'rebirth' | 'infusion' | 'starUp';

export interface DuplicatePullEntry {
    id: string;
    name: string;
    /** 有沒有可灌注的英靈卡；缺欄位視為有 */
    infusionAvailable?: boolean;
    /** 升星進度；缺欄位或 null 表示不能升星（已滿 ★5 或不在名冊） */
    starUp?: { stars: number; cards: number; need: number } | null;
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
        unavailable: '未裝配英靈卡，無法灌注',
    },
    starUp: {
        title: '升星',
        tagline: '同名精魄／累積星級',
        progress: '目前 ★{stars}，同名卡 {cards} / {need}',
        bullets: ['這張卡計入同名卡', '集滿後升 1 星', '★N 開放血脈奧義第 N 階'],
        button: '選擇升星',
        unavailableBody: '已達 ★5 或不在名冊，無法升星',
        unavailable: '無法升星',
    },
    batchDefault: '本次抽卡批次預設沿用此選擇',
} as const;

/** 血脈灌注的傳承經驗（規格書 §3：英靈卡獲得 500 點傳承經驗值） */
export const DUPLICATE_INFUSION_VALUE = 500;

const canInfuse = (entry: DuplicatePullEntry): boolean => entry.infusionAvailable !== false;
const canStarUp = (entry: DuplicatePullEntry): boolean => !!entry.starUp;

/** 轉蛋結果分成「抽卡前就已持有」與其餘；其餘照原本入冊（含同批第二張的轉生） */
export function splitOwnedDuplicates<T extends { id: string }>(generals: readonly T[], ownedIds: ReadonlySet<string>): { owned: T[]; rest: T[] } {
    const owned: T[] = [];
    const rest: T[] = [];
    for (const general of generals) (ownedIds.has(general.id) ? owned : rest).push(general);
    return { owned, rest };
}

/** 要走復生的重複卡：選了復生，或沒有選擇（彈窗中止時維持原本的轉生行為） */
export function rebirthTargetsOf<T extends { id: string }>(owned: readonly T[], choices: readonly DuplicatePullChoice[]): T[] {
    return owned.filter((general, index) => choices[index]?.id !== general.id || choices[index].route === 'rebirth');
}

/** 要走灌注的重複卡 */
export function infusionTargetsOf<T extends { id: string }>(owned: readonly T[], choices: readonly DuplicatePullChoice[]): T[] {
    return owned.filter((general, index) => choices[index]?.id === general.id && choices[index].route === 'infusion');
}

/** 要走升星的重複卡 */
export function starUpTargetsOf<T extends { id: string }>(owned: readonly T[], choices: readonly DuplicatePullChoice[]): T[] {
    return owned.filter((general, index) => choices[index]?.id === general.id && choices[index].route === 'starUp');
}

const bulletText = (lines: readonly string[]): string => lines.map((line) => `• ${line}`).join('\n');

function starUpBody(entry: DuplicatePullEntry | null): string {
    const progress = entry?.starUp;
    if (!progress) return bulletText([DUPLICATE_PULL_TEXTS.starUp.unavailableBody]);
    const head = DUPLICATE_PULL_TEXTS.starUp.progress
        .replace('{stars}', String(progress.stars))
        .replace('{cards}', String(progress.cards))
        .replace('{need}', String(progress.need));
    return bulletText([head, ...DUPLICATE_PULL_TEXTS.starUp.bullets]);
}

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
        const entry = this.current();
        if (route === 'infusion' && entry && !canInfuse(entry)) return false;
        if (route === 'starUp' && entry && !canStarUp(entry)) return false;
        const remaining = this._queue.slice(this._choices.length, this._batchDefault ? undefined : this._choices.length + 1);
        for (const next of remaining) this._choices.push({ id: next.id, route: this._routeFor(next, route) });
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
                dupInfusionLabel: entry && !canInfuse(entry) ? DUPLICATE_PULL_TEXTS.infusion.unavailable : DUPLICATE_PULL_TEXTS.infusion.button,
                dupStarUpTitle: DUPLICATE_PULL_TEXTS.starUp.title,
                dupStarUpTagline: DUPLICATE_PULL_TEXTS.starUp.tagline,
                dupStarUpBody: starUpBody(entry),
                dupStarUpLabel: entry && !canStarUp(entry) ? DUPLICATE_PULL_TEXTS.starUp.unavailable : DUPLICATE_PULL_TEXTS.starUp.button,
                dupBatchLabel: `${this._batchDefault ? '[✓]' : '[ ]'} ${DUPLICATE_PULL_TEXTS.batchDefault}`,
            },
            // 只剩一位時沒有「沿用」的意義，勾選列隱藏
            actives: { btnDupBatchDefault: total - this._choices.length > 1 },
            enabled: { btnDupRebirth: entry !== null, btnDupInfusion: entry !== null && canInfuse(entry), btnDupStarUp: entry !== null && canStarUp(entry) },
        };
    }

    /** 批次沿用時這位走不了選定路線就改走復生 */
    private _routeFor(entry: DuplicatePullEntry, route: DuplicatePullRoute): DuplicatePullRoute {
        if (route === 'infusion' && !canInfuse(entry)) return 'rebirth';
        if (route === 'starUp' && !canStarUp(entry)) return 'rebirth';
        return route;
    }

    private _finish(): void {
        const resolve = this._resolve;
        this._resolve = null;
        resolve?.([...this._choices]);
    }
}
