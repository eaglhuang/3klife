// @spec-source → PROG-2-9106：轉蛋等子畫面直接回幕府大堂時，UI 堆疊要一起回到 LobbyMain
/**
 * LobbyHallReturn — 「返回政廳」時把 UIManager 的替換式頁面一路關回大廳主頁（純邏輯，不依賴 cc）。
 *
 * 子畫面（轉蛋、商城…）是用 UIManager.open 替換式打開的，打開時會把 LobbyMain（城池底欄、季節 HUD、
 * 出征牌組）收起來。若返回鈕只把子畫面宿主關掉、直接開大堂，UIManager 仍停在子畫面，LobbyMain 不會再顯示：
 * 城池底欄 BtnCat* 整組不在，下一次從別的頁面按返回還會把已關掉的子畫面翻回來。
 * 這裡沿著 UIManager 的歷史逐頁 close，直到目前頁面是 LobbyMain；歷史裡沒有 LobbyMain 時再 open 一次。
 * Unity 對照：像 Navigation stack 的 PopToRoot。
 */

/** 只用到 UIManager 的這幾個方法，方便單元測試換成假物件 */
export interface LobbyUiStack<Id extends string> {
    getCurrentUI(): Id | null;
    close(uiId: Id): Promise<boolean>;
    open(uiId: Id): Promise<boolean>;
}

/** 最多關幾頁；替換式頁面歷史不會很深，只防萬一某頁 close 失敗時無限迴圈 */
export const LOBBY_RETURN_MAX_CLOSES = 12;

/**
 * 把目前的替換式頁面逐頁關掉直到回到 lobbyMain；回傳是否已回到 lobbyMain。
 * 目前已是 lobbyMain 時什麼都不做（不重新 show，避免多餘的版面重建）。
 */
export async function restoreLobbyMainUi<Id extends string>(ui: LobbyUiStack<Id>, lobbyMain: Id): Promise<boolean> {
    for (let i = 0; i < LOBBY_RETURN_MAX_CLOSES; i++) {
        const current = ui.getCurrentUI();
        if (current === lobbyMain) return true;
        if (current === null) break;
        const closed = await ui.close(current);
        // close 失敗、或關完還停在同一頁：不再硬關，改直接開 LobbyMain
        if (!closed || ui.getCurrentUI() === current) break;
    }
    if (ui.getCurrentUI() === lobbyMain) return true;
    await ui.open(lobbyMain);
    return ui.getCurrentUI() === lobbyMain;
}
