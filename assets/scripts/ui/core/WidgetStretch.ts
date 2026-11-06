/**
 * 讓 Widget 四邊貼齊父節點（全螢幕彈窗 host 用）。
 * 場景裡的 host 可能只設了置中與固定尺寸，底下的全螢幕遮罩就會跟著縮小。
 * 只用結構型別，不依賴 cc，方便單元測試。
 */
export interface StretchableWidget {
    isAlignTop: boolean;
    isAlignBottom: boolean;
    isAlignLeft: boolean;
    isAlignRight: boolean;
    isAlignHorizontalCenter: boolean;
    isAlignVerticalCenter: boolean;
    top: number;
    bottom: number;
    left: number;
    right: number;
    updateAlignment(): void;
}

/** 已經四邊貼齊（邊距 0）時不動；有修改回傳 true */
export function stretchWidgetToParent(widget: StretchableWidget): boolean {
    const already = widget.isAlignTop && widget.isAlignBottom && widget.isAlignLeft && widget.isAlignRight
        && widget.top === 0 && widget.bottom === 0 && widget.left === 0 && widget.right === 0;
    if (already) return false;
    widget.isAlignHorizontalCenter = false;
    widget.isAlignVerticalCenter = false;
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.top = 0;
    widget.bottom = 0;
    widget.left = 0;
    widget.right = 0;
    widget.updateAlignment();
    return true;
}
