// @spec-source → 重複名將分流彈窗與復生重練協議規格書 (doc_spec_0331) §1；DUP-01；PROG-2-2072；PROG-2-9260（設計稿版）
/**
 * DuplicatePullPopupController — 重複抽卡分流彈窗（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 抽卡結算拿到已持有的名將時，逐位詢問「復生重練／升星／血脈灌注」
 *   - 十連抽防疲勞：勾選「本次抽卡批次預設沿用此選擇」後，選一次就套用到剩下的重複卡
 *   - ask() 回傳 Promise，全部選完才 resolve，每位重複卡一筆選擇
 *   - 沒有可灌注的英靈卡時，灌注按鈕不能按；批次沿用灌注時這幾位改走復生（DUP-05；PROG-2-2073）
 *   - 轉蛋接線：splitOwnedDuplicates 先把已持有的重複卡留下，rebirthTargetsOf／infusionTargetsOf 依選擇分流
 *   - 設計稿版（PROG-2-9260）：每張卡顯示變化值、升星集滿時標「推薦」、史小境吐槽句、剩餘待處理數
 *
 * 所有 texts / actives / enabled / fills 的 key 都等於 duplicate-pull-popup-main.json 的節點 id，
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
    /** 字號（例如「常山子龍」），顯示在立繪底下 */
    title?: string;
    /** 稀有度標籤（SSR／SR／R）；缺欄位顯示 SSR */
    rarity?: string;
    /** 目前轉生次數（1~5）；缺欄位視為 1 */
    rebirthCount?: number;
}

export interface DuplicatePullChoice {
    id: string;
    route: DuplicatePullRoute;
}

export interface DuplicatePullPopupView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
    /** 進度條填滿比例（0~1），key ＝ 填色節點 id */
    fills: Record<string, number>;
    /** 目前這位的武將 id（立繪載入用，例如 zhao-yun）；沒有目前這位時為 null */
    portraitKey: string | null;
}

/** 史小境吐槽句資料（data/duplicate-pull-quips.json）；{name} 換成重複名將 */
export interface DuplicatePullQuips {
    general: readonly string[];
    starUpReady?: readonly string[];
}

/** 載不到資料檔時的保底句 */
export const DEFAULT_DUPLICATE_QUIPS: DuplicatePullQuips = {
    general: ['史小境：又是{name}？你們這緣分，月老看了都要排隊加號。'],
};

/** 規格書 §1 彈窗文案；{name} 換成目前這位重複名將 */
export const DUPLICATE_PULL_TEXTS = {
    title: '宿命牽引・名將重逢',
    subtitle: '已持有「{name}」本體，請選擇其精魄轉化路徑：',
    rebirth: {
        title: '復生重練',
        tagline: '青龍靈光／突破極限',
        bullets: ['重塑 20 歲巔峰之軀', '單項五維上限 +100', '英靈傳承卡完整嵌回'],
        deltaKey: '轉生次數',
        button: '選擇復生重練',
    },
    infusion: {
        title: '血脈灌注',
        tagline: '金鳳神芒／即時增強',
        bullets: ['專屬虎符戰鬥屬性提升', '宗族聲望 +50', '現役武將狀態完全保留'],
        deltaKey: '英靈卡傳承經驗',
        button: '選擇血脈灌注',
        unavailable: '未裝配英靈卡，無法灌注',
    },
    starUp: {
        title: '升星',
        tagline: '同名精魄／累積星級',
        bullets: ['這張卡計入同名卡', '集滿立即升 1 星', '★{next} 開放血脈奧義第 {next} 階'],
        deltaKeyRaise: '★{stars} → ★{next}　同名卡',
        deltaKeyHold: '★{stars}　同名卡',
        unavailableBody: '已達 ★5 或不在名冊，無法升星',
        button: '選擇升星',
        unavailable: '無法升星',
    },
    remain: '本次十連還有 {n} 位重複名將待處理',
    batchDefault: '本次抽卡批次預設沿用此選擇',
} as const;

/** 血脈灌注的傳承經驗（規格書 §3：英靈卡獲得 500 點傳承經驗值） */
export const DUPLICATE_INFUSION_VALUE = 500;

const REBIRTH_CAP = 5;

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

const bulletText = (lines: readonly string[]): string => lines.map((line) => `◆ ${line}`).join('\n');

const fillText = (template: string, values: Record<string, string | number>): string =>
    template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/** 升星卡投入這張後的變化：同名卡數、是否剛好集滿升星、進度條比例 */
export function starUpOutcome(progress: { stars: number; cards: number; need: number }): { stars: number; next: number; cards: number; need: number; raised: boolean; ratio: number } {
    const total = progress.cards + 1;
    const raised = total >= progress.need;
    const cards = Math.min(total, progress.need);
    return { stars: progress.stars, next: raised ? progress.stars + 1 : progress.stars, cards, need: progress.need, raised, ratio: progress.need > 0 ? cards / progress.need : 0 };
}


function starUpBody(entry: DuplicatePullEntry | null): string {
    const progress = entry?.starUp;
    if (!progress) return bulletText([DUPLICATE_PULL_TEXTS.starUp.unavailableBody]);
    const next = progress.stars + 1;
    return bulletText(DUPLICATE_PULL_TEXTS.starUp.bullets.map((line) => fillText(line, { next })));
}

export class DuplicatePullPopupController {
    private _queue: DuplicatePullEntry[] = [];
    private _choices: DuplicatePullChoice[] = [];
    private _batchDefault = false;
    private _resolve: ((choices: DuplicatePullChoice[]) => void) | null = null;
    private _quips: DuplicatePullQuips = DEFAULT_DUPLICATE_QUIPS;
    private readonly _quipCache = new Map<number, string>();

    constructor(private readonly _random: () => number = Math.random) {}

    /** 換上資料檔的吐槽句；空資料維持保底句 */
    setQuips(quips: DuplicatePullQuips | null | undefined): void {
        if (quips && quips.general.length > 0) this._quips = quips;
    }

    /** 開始詢問；沒有重複卡時立即回傳空陣列。前一輪還沒選完時，前一輪以已選的部分結束。 */
    ask(entries: readonly DuplicatePullEntry[]): Promise<DuplicatePullChoice[]> {
        this.cancel();
        this._queue = [...entries];
        this._choices = [];
        this._batchDefault = false;
        this._quipCache.clear();
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

    /** 這位的吐槽句：每位只抽一次，重繪不會跳字；剛好能集滿升星時優先用 starUpReady 句庫 */
    private _quipFor(entry: DuplicatePullEntry | null): string {
        if (!entry) return '';
        const index = this._choices.length;
        const cached = this._quipCache.get(index);
        if (cached !== undefined) return cached;
        const ready = entry.starUp ? starUpOutcome(entry.starUp).raised : false;
        const special = this._quips.starUpReady ?? [];
        const pool = ready && special.length > 0 ? special : this._quips.general;
        const line = fillText(pool[Math.min(pool.length - 1, Math.floor(this._random() * pool.length))] ?? '', { name: entry.name });
        this._quipCache.set(index, line);
        return line;
    }

    getView(): DuplicatePullPopupView {
        const entry = this.current();
        const total = this._queue.length;
        const position = Math.min(this._choices.length + 1, total);
        const remaining = Math.max(0, total - this._choices.length - 1);
        const T = DUPLICATE_PULL_TEXTS;
        const infuseOk = entry !== null && canInfuse(entry);
        const starOk = entry !== null && canStarUp(entry);
        const rebirthNow = Math.min(REBIRTH_CAP, Math.max(1, Math.floor(entry?.rebirthCount ?? 1)));
        const rebirthNext = Math.min(REBIRTH_CAP, rebirthNow + 1);
        const outcome = entry?.starUp ? starUpOutcome(entry.starUp) : null;
        const stars = entry?.starUp?.stars ?? REBIRTH_CAP;
        return {
            texts: {
                dupTitle: T.title,
                dupSubtitle: T.subtitle.replace('{name}', entry?.name ?? ''),
                dupPager: total > 1 ? `${position} / ${total}` : '',
                dupQuip: this._quipFor(entry),
                dupRarity: entry?.rarity ?? 'SSR',
                dupHeroName: entry?.name ?? '',
                dupHeroSub: [entry?.title?.replace(/^【|】$/g, ''), `★${stars}`, `轉生 ${rebirthNow} 次`].filter((part) => !!part).join('　'),
                dupRebirthTitle: T.rebirth.title,
                dupRebirthTagline: T.rebirth.tagline,
                dupRebirthDeltaK: T.rebirth.deltaKey,
                dupRebirthDeltaV: `${rebirthNow} → ${rebirthNext} / ${REBIRTH_CAP}`,
                dupRebirthBody: bulletText(T.rebirth.bullets),
                dupRebirthLabel: T.rebirth.button,
                dupInfusionTitle: T.infusion.title,
                dupInfusionTagline: T.infusion.tagline,
                dupInfusionDeltaK: T.infusion.deltaKey,
                dupInfusionDeltaV: `+${DUPLICATE_INFUSION_VALUE}`,
                dupInfusionBody: bulletText(T.infusion.bullets),
                dupInfusionLabel: infuseOk ? T.infusion.button : T.infusion.unavailable,
                dupInfusionReason: T.infusion.unavailable,
                dupStarUpTitle: T.starUp.title,
                dupStarUpTagline: T.starUp.tagline,
                dupStarUpDeltaK: outcome ? fillText(outcome.raised ? T.starUp.deltaKeyRaise : T.starUp.deltaKeyHold, { stars: outcome.stars, next: outcome.next }) : T.starUp.unavailable,
                dupStarUpDeltaV: outcome ? `${outcome.cards - 1} → ${outcome.cards} / ${outcome.need}` : '—',
                dupStarUpBody: starUpBody(entry),
                dupStarUpLabel: starOk ? T.starUp.button : T.starUp.unavailable,
                dupStarUpReason: T.starUp.unavailableBody,
                dupBatchLabel: T.batchDefault,
                dupBatchCheck: this._batchDefault ? '✓' : '',
                dupRemain: fillText(T.remain, { n: remaining }),
            },
            // 只剩一位時沒有「沿用」的意義，勾選列隱藏；灌注／升星不可用時整張卡變灰並顯示原因；集滿可升星的升星卡標「推薦」
            actives: {
                btnDupBatchDefault: total - this._choices.length > 1,
                dupPagerBg: total > 1,
                dupRemain: remaining > 0,
                dupInfusionDim: !infuseOk,
                dupInfusionBtnCover: !infuseOk,
                dupInfusionReason: !infuseOk,
                dupStarUpDim: !starOk,
                dupStarUpBtnCover: !starOk,
                dupStarUpReason: !starOk,
                dupStarUpRecommend: starOk && !!outcome?.raised,
            },
            enabled: { btnDupRebirth: entry !== null, btnDupInfusion: infuseOk, btnDupStarUp: starOk },
            fills: { dupStarUpBarFill: outcome?.ratio ?? 0 },
            portraitKey: entry ? entry.id : null,
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
