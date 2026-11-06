/**
 * NetworkIndicatorState — 網路狀態指示器的狀態對應（UI技術規格書 doc_ui_0049，PROG-2-1881）
 *
 * 每個網路／同步事件對應一組外觀：顏色、是否顯示、是否轉圈、幾秒後自動淡出。
 * 'keep' 表示沿用目前狀態。純資料，元件依結果套用，可單元測試。
 *
 * Unity 對照：NetworkStatusView 以 switch(status) 決定 Image.color 與 Animator 參數。
 */
export type NetworkIndicatorEvent = 'offline' | 'online' | 'syncing' | 'sync-complete' | 'reminder';

export interface NetworkIndicatorView {
    /** null = 不改顏色 */
    color: readonly [number, number, number] | null;
    visible: boolean | 'keep';
    spin: boolean | 'keep';
    /** 幾秒後自動淡出；null = 不自動淡出 */
    hideAfterSec: number | null;
    /** 閃爍放大提醒 */
    pulse: boolean;
}

const RED = [255, 50, 50] as const;
const GREEN = [50, 255, 50] as const;
const YELLOW = [255, 200, 50] as const;
const AUTO_HIDE_SEC = 1.0;

export function networkIndicatorView(event: NetworkIndicatorEvent): NetworkIndicatorView {
    switch (event) {
        case 'offline':
            return { color: RED, visible: true, spin: false, hideAfterSec: null, pulse: false };
        case 'online':
            // 若有待傳資料，SyncManager 會接著發 syncing，元件會取消這次自動淡出
            return { color: GREEN, visible: 'keep', spin: 'keep', hideAfterSec: AUTO_HIDE_SEC, pulse: false };
        case 'syncing':
            return { color: YELLOW, visible: true, spin: true, hideAfterSec: null, pulse: false };
        case 'sync-complete':
            return { color: GREEN, visible: 'keep', spin: false, hideAfterSec: AUTO_HIDE_SEC, pulse: false };
        case 'reminder':
            return { color: null, visible: true, spin: 'keep', hideAfterSec: null, pulse: true };
    }
}
