// @spec-source → 見 docs/cross-reference-index.md
// PROG-2-2243：英文 TTF＋逐字快取畫不出中文，結果畫面用這個修正
import { Label, Node } from 'cc';

/** Cocos Label.CacheMode 數值（NONE=0、CHAR=2）；測試替身沒有列舉，直接用數值 */
const CACHE_NONE = 0;
const CACHE_CHAR = 2;
const CJK_PATTERN = /[\u3000-\u9fff\uff00-\uffef]/;

/** 把含中日韓文字的 CHAR 快取 Label 改成不快取（CHAR 快取只能畫字型內有的字） */
export function disableCharCacheForCjk(root: Node): void {
    const label = root.getComponent(Label);
    if (label) {
        if (label.cacheMode === CACHE_CHAR && CJK_PATTERN.test(label.string)) {
            label.cacheMode = CACHE_NONE;
        }
    }
    for (const child of root.children) disableCharCacheForCjk(child);
}
