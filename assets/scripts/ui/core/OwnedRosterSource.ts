/**
 * OwnedRosterSource — 「玩家擁有的武將」名冊來源選擇（PROG-2-9147，純邏輯，不依賴 cc）
 *
 * 為什麼 UI 不能直讀 PlayerRosterService：
 * 玩家真正的名冊在 GameSession（services().session.roster），底層經 ServiceLoader.rosterStore 取得；
 * QA 暫時狀態模式（ephemeralStorage）時它改讀記憶體名冊，PlayerRosterService 讀到的是舊存檔。
 * 直讀會讓「武將名冊」與「關係列表」顯示不同批武將，所以正式入口一律走 session.roster。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { isGeneralDead } from '../../core/systems/GeneralAging';

/** 取玩家擁有且仍在世的武將；名冊空時回空陣列（呼叫端顯示空狀態，不得退回全武將圖鑑）。 */
export function ownedLivingGenerals(sessionRoster: readonly GeneralConfig[]): GeneralConfig[] {
    return sessionRoster.filter((general) => !isGeneralDead(general));
}
