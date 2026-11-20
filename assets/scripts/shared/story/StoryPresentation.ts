// @spec-source → 劇情（演出）系統 Base 框架規格書 (doc_spec_1188) §3.2 演出指令、§3.4 演出模組、§4 IPresentationPlayer 規則 1／3／4；PROG-2-9208
/**
 * StoryPresentation — 劇情演出 adapter 介面與單一佇列的播放器（零依賴；實際畫面由場景的 sink 提供）。
 *
 * 分工：伺服器端（StoryCommands）已先結算後果，回給客戶端的是「要播的演出指令＋要不要選」；
 * 這裡只負責照順序播放，所以演出被跳過、中斷、閃退重進都不影響結果（規格規則 1）。
 * MVP 只有一種內建 cue：popup（彈窗，可帶選項）；其他演出指令（say、portrait、cg、camera、transition、
 * sfx、bgm、comic…）日後只要寫一個 CueHandler 並 registerCue，不動劇本資料、不動伺服器、不動佇列。
 * 缺少 handler 的 cue 記 log 後略過，不阻擋流程（規則 3）。
 *
 * 佇列：單一優先序（必中斷者先、priority 大者先、同優先先進先出）；一次只播一筆，
 * 必中斷者插在所有「等待中」的非中斷演出前面，不強行砍掉正在播的那一筆。
 *
 * Unity 對照：像 Timeline 的 Track 註冊表加一條播放佇列；Sink 就是各 Track 的繫結物件。
 */
import type { StoryCue } from './StoryConfig';

/** 客戶端拿到、要播放的一段劇情（story.trigger／story.choose／story.pending 的回應 view） */
export interface StoryPlayView {
    storyId: string;
    instanceId: string;
    cues: StoryCue[];
    /** 要玩家選時有值；播完 cues 後呼叫 sink 問選項，回傳的選項 id 就是 selectedOptionId */
    choice: { choiceId: string; options: Array<{ id: string; textKey: string | null }> } | null;
    skippable: boolean;
}

/** 演出 handler 能用的最簡 UI 出口 */
export interface PopupSink {
    /** 彈窗顯示（標題／內文都是 i18n key）；有 options 時回傳玩家選的選項 id，沒有選項回 null */
    showPopup(popup: { titleKey: string | null; textKey: string | null; options: Array<{ id: string; textKey: string | null }> }): Promise<string | null>;
}

export interface CueContext {
    view: StoryPlayView;
    /** 這個 cue 之後是否緊接選項（popup 可以把選項畫在同一個彈窗裡） */
    options: Array<{ id: string; textKey: string | null }>;
}

export interface CueHandler {
    /** 播完（或被玩家跳過）才 resolve；若這個 cue 同時收了選項，回傳選到的選項 id，否則回 undefined */
    play(cue: StoryCue, ctx: CueContext): Promise<string | null | undefined>;
}

export interface IStoryPlayer {
    registerCue(cue: string, handler: CueHandler): void;
    /** 立刻播放並回傳玩家選的選項 id（沒有選項回 null） */
    play(view: StoryPlayView): Promise<string | null>;
    /** 進單一佇列，輪到時播放；回傳的 Promise 在播完後 resolve 選項 id */
    enqueue(view: StoryPlayView, priority: number, opts?: { interrupt?: boolean }): Promise<string | null>;
    readonly log: readonly string[];
}

/** 內建 popup：標題＋內文＋（若緊接選項）選項按鈕，全部交給 sink */
export function createPopupCue(sink: PopupSink): CueHandler {
    return {
        play: async (cue, ctx) => sink.showPopup({
            titleKey: typeof cue.titleKey === 'string' ? cue.titleKey : null,
            textKey: typeof cue.textKey === 'string' ? cue.textKey : null,
            options: ctx.options,
        }),
    };
}

interface QueueItem {
    view: StoryPlayView;
    priority: number;
    interrupt: boolean;
    seq: number;
    resolve: (optionId: string | null) => void;
}

export class StoryPlayer implements IStoryPlayer {
    private readonly _handlers = new Map<string, CueHandler>();
    private readonly _queue: QueueItem[] = [];
    private readonly _log: string[] = [];
    private _seq = 0;
    private _running = false;
    private readonly _sink: PopupSink | null;

    /** sink 給了就自動註冊內建 popup；沒給的話選項會被略過（回 null） */
    public constructor(sink: PopupSink | null = null) {
        this._sink = sink;
        if (sink) this.registerCue('popup', createPopupCue(sink));
    }

    public get log(): readonly string[] { return this._log; }

    public registerCue(cue: string, handler: CueHandler): void {
        this._handlers.set(cue, handler);
    }

    public async play(view: StoryPlayView): Promise<string | null> {
        const options = view.choice ? view.choice.options : [];
        let picked: string | null = null;
        for (let i = 0; i < view.cues.length; i++) {
            const cue = view.cues[i];
            const handler = this._handlers.get(cue.cue);
            if (!handler) {
                this._log.push(`[Story] 演出指令 ${cue.cue} 未註冊，略過（story ${view.storyId}）`);
                continue;
            }
            // 選項附在最後一個有 handler 的 cue 上；中間的 cue 不帶選項
            const isLast = view.cues.slice(i + 1).every((c) => !this._handlers.has(c.cue));
            try {
                const res = await handler.play(cue, { view, options: isLast ? options : [] });
                if (isLast && typeof res === 'string') picked = res;
            } catch (error) {
                this._log.push(`[Story] 演出指令 ${cue.cue} 播放失敗（結果已結算）：${error instanceof Error ? error.message : String(error)}`);
            }
        }
        if (picked === null && view.choice && view.choice.options.length > 0 && !this._sink) {
            this._log.push(`[Story] 沒有可顯示選項的出口，story ${view.storyId} 的選項未回傳`);
        }
        return picked;
    }

    public enqueue(view: StoryPlayView, priority: number, opts: { interrupt?: boolean } = {}): Promise<string | null> {
        return new Promise((resolve) => {
            this._queue.push({ view, priority, interrupt: opts.interrupt === true, seq: this._seq++, resolve });
            this._queue.sort((a, b) => {
                if (a.interrupt !== b.interrupt) return a.interrupt ? -1 : 1;
                if (a.priority !== b.priority) return b.priority - a.priority;
                return a.seq - b.seq;
            });
            void this._drain();
        });
    }

    private async _drain(): Promise<void> {
        if (this._running) return;
        this._running = true;
        try {
            for (let item = this._queue.shift(); item; item = this._queue.shift()) {
                let picked: string | null = null;
                try { picked = await this.play(item.view); } catch { /* play 自己已吞例外 */ }
                item.resolve(picked);
            }
        } finally {
            this._running = false;
        }
    }
}
