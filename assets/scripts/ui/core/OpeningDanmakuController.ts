// @spec-source → 開場重新包裝規格書（方案 B：AI 武將搶先連線，doc_spec_1346）§4 彈幕層；PROG-2-10149
/**
 * OpeningDanmakuController — 開場彈幕層的固定槽位物件池（純邏輯，不依賴 cc）。
 *
 * 畫面層在版面檔裡預先放好 DANMAKU_SLOT_COUNT 個彈幕節點（danmakuSlot0～5），整個開場只重用這幾個節點，
 * 不會隨彈幕句數建立新節點（手機記憶體優先）。tick() 依時間把到點的 cue 放進空槽；
 * 槽位都滿時回收最早出現、沒被釘住的那一格。玩家點某格會「釘住」：延長停留並標記放大。
 * 輸出扁平 FlowView，key 與版面節點 id 一一對應。
 *
 * Unity 對照：像一個固定大小的 Object Pool＋字幕時間軸，Presenter 只讀 getFlowView()。
 */
import type { DanmakuCue } from '../../core/systems/OpeningDanmaku';

export interface DanmakuFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 固定槽位數（版面檔 danmakuSlot0～5） */
export const DANMAKU_SLOT_COUNT = 6;
/** 一句彈幕停留時間（毫秒） */
export const DANMAKU_LIFE_MS = 2600;
/** 被點選（釘住）後多停留的時間（毫秒） */
export const DANMAKU_PIN_EXTRA_MS = 2400;

interface Slot {
    text: string;
    /** 出現時刻（毫秒，軌道時間）；-1 表示空槽 */
    bornMs: number;
    expireMs: number;
    pinned: boolean;
    /** 每放進一句新彈幕就加一，畫面層據此知道要重播進場動畫 */
    serial: number;
}

export class OpeningDanmakuController {
    private _clockMs = 0;
    private _next = 0;
    private readonly _slots: Slot[];

    constructor(
        private readonly _cues: readonly DanmakuCue[],
        private readonly _slotCount: number = DANMAKU_SLOT_COUNT,
        private readonly _lifeMs: number = DANMAKU_LIFE_MS,
    ) {
        this._slots = Array.from({ length: _slotCount }, () => ({ text: '', bornMs: -1, expireMs: 0, pinned: false, serial: 0 }));
        // cue 依時間排序，tick 才能只往前掃
        this._cues = [..._cues].sort((a, b) => a.atMs - b.atMs);
        this._spawnDue();
    }

    public get slotCount(): number { return this._slotCount; }
    /** 軌道上最後一句 cue 的出現時間；沒有 cue 為 0 */
    public get lastCueMs(): number { return this._cues.length === 0 ? 0 : this._cues[this._cues.length - 1].atMs; }
    /** 全部 cue 都已放出且所有槽位都已退場 */
    public get finished(): boolean {
        return this._next >= this._cues.length && this._slots.every(slot => !this.isActive(slot));
    }

    /** 某槽目前顯示的狀態；畫面層用 serial 偵測新彈幕、pinned 決定放大 */
    public slotState(index: number): { active: boolean; pinned: boolean; serial: number } {
        const slot = this._slots[index];
        if (!slot) return { active: false, pinned: false, serial: 0 };
        return { active: this.isActive(slot), pinned: slot.pinned, serial: slot.serial };
    }

    /** 推進時間；回傳這一步新放出的 cue 數 */
    public tick(deltaMs: number): number {
        if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
        this._clockMs += deltaMs;
        return this._spawnDue();
    }

    /** 玩家點某一格彈幕：釘住並延長停留；空槽或已釘住回傳 false */
    public pin(index: number): boolean {
        const slot = this._slots[index];
        if (!slot || !this.isActive(slot) || slot.pinned) return false;
        slot.pinned = true;
        slot.expireMs += DANMAKU_PIN_EXTRA_MS;
        return true;
    }

    /** 立刻收掉所有彈幕並丟棄還沒出現的 cue（略過或換幕時用） */
    public clear(): void {
        this._next = this._cues.length;
        for (const slot of this._slots) {
            slot.text = '';
            slot.bornMs = -1;
            slot.pinned = false;
        }
    }

    public getFlowView(): DanmakuFlowView {
        const texts: Record<string, string> = {};
        const actives: Record<string, boolean> = {};
        this._slots.forEach((slot, i) => {
            const on = this.isActive(slot);
            texts[`danmakuText${i}`] = on ? slot.text : '';
            actives[`danmakuSlot${i}`] = on;
        });
        return { texts, actives, enabled: {} };
    }

    private isActive(slot: Slot): boolean {
        return slot.bornMs >= 0 && this._clockMs < slot.expireMs;
    }

    private _spawnDue(): number {
        let spawned = 0;
        while (this._next < this._cues.length && this._cues[this._next].atMs <= this._clockMs) {
            this._place(this._cues[this._next]);
            this._next++;
            spawned++;
        }
        return spawned;
    }

    private _place(cue: DanmakuCue): void {
        // 優先用空槽／已退場的槽；都滿了就回收最早出現且沒被釘住的槽；全被釘住時回收釘最久的那格
        let target = this._slots.findIndex(slot => !this.isActive(slot));
        if (target < 0) {
            let oldest = -1;
            this._slots.forEach((slot, i) => {
                if (slot.pinned) return;
                if (oldest < 0 || slot.bornMs < this._slots[oldest].bornMs) oldest = i;
            });
            target = oldest >= 0 ? oldest : this._slots.reduce((best, slot, i) => (slot.bornMs < this._slots[best].bornMs ? i : best), 0);
        }
        const slot = this._slots[target];
        slot.text = cue.text;
        slot.bornMs = this._clockMs;
        slot.expireMs = this._clockMs + this._lifeMs;
        slot.pinned = false;
        slot.serial++;
    }
}
