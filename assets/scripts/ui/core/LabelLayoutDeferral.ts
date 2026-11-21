// @spec-source → 見 docs/cross-reference-index.md
// PROG-2-9801：Label 強制即時排版（updateRenderData(true)）的延後機制
import { Label } from 'cc';

/**
 * 引擎的 Label.font／cacheMode 設定器與 CompositePanel 的刷新遍歷都會呼叫 updateRenderData(true)，
 * 立刻跑一次完整排版（SHRINK 要做縮字二分搜尋、逐次 measureText，還要重畫字貼圖）。
 * 一個標籤套樣式時會連續觸發 2～3 次、掛載後又被遍歷再強制一次，實測人物介紹頁同一標籤同一幀排版 4 次。
 *
 * 固定外框（SHRINK／CLAMP）的標籤節點尺寸不會被排版結果改動，排版只影響字貼圖與實際字級，
 * 所以延後到引擎每幀的髒標記刷新（UIRendererManager）跑一次，畫面結果相同。
 * NONE／RESIZE_HEIGHT 會依內容改節點尺寸，呼叫端可能立刻讀尺寸，維持強制即時。
 */

interface LabelInternals {
    _flushAssembler?: () => void;
    _applyFontTexture?: () => void;
    _markForUpdateRenderData?: (enable?: boolean) => void;
    renderData?: { vertDirty: boolean } | null;
}

let deferring: Label | null = null;
let patched = false;

/** 外框固定（排版不改節點尺寸）的標籤 */
export function hasFixedBox(label: Label): boolean {
    const overflow = label.overflow;
    return overflow === Label.Overflow.SHRINK || overflow === Label.Overflow.CLAMP;
}

/** 與 updateRenderData(true) 相同的前置（重建 renderData、字型貼圖、標髒），但不立刻排版 */
function markLazily(label: Label): boolean {
    const inner = label as unknown as LabelInternals;
    if (typeof inner._flushAssembler !== 'function' || typeof inner._markForUpdateRenderData !== 'function') return false;
    inner._flushAssembler();
    if (inner.renderData) inner.renderData.vertDirty = true;
    inner._applyFontTexture?.();
    inner._markForUpdateRenderData(true);
    return true;
}

function patchUpdateRenderData(): void {
    if (patched) return;
    const proto = Label?.prototype as unknown as { updateRenderData?: (this: Label, force?: boolean) => void } | undefined;
    const original = proto?.updateRenderData;
    if (!proto || typeof original !== 'function') return;
    patched = true;
    proto.updateRenderData = function (this: Label, force = false): void {
        if (force && deferring === this && markLazily(this)) return;
        original.call(this, force);
    };
}

/** 執行 fn；期間這個標籤（固定外框時）的強制排版改成標髒、留到幀末刷新一次 */
export function runWithDeferredLayout(label: Label, fn: () => void): void {
    patchUpdateRenderData();
    if (!patched || deferring !== null || !hasFixedBox(label)) {
        fn();
        return;
    }
    deferring = label;
    try {
        fn();
    } finally {
        deferring = null;
    }
}

/** CompositePanel 掛載後的刷新：固定外框標籤只標髒；其餘照舊強制即時。回傳是否已處理 */
export function refreshLabelLazily(component: unknown): boolean {
    if (!(component instanceof Label) || !hasFixedBox(component)) return false;
    const inner = component as unknown as LabelInternals;
    if (typeof inner._markForUpdateRenderData !== 'function') return false;
    inner._markForUpdateRenderData(true);
    return true;
}
