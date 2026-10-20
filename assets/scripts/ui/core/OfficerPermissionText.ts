// @spec-source → 官職系統.md（F-2 階位表、§權限快照）；WBS OFC-08 官職頁顯示段
/**
 * OfficerPermissionText — 官職頁的已解鎖權限文字（純邏輯，不依賴 cc）
 *
 * 只把 OfficerPermissions 的唯讀快照排成「項目：內容」的多行文字，畫面只負責擺放。
 * 文案與 OfficerDisplay 一樣先寫死 zh-TW（規格文案未進語系表前的暫定做法）。
 *
 * Unity 對照：像 ViewModel 把權限 struct 轉成 Text 的多行字串，View 只 SetText。
 */
import type { OfficerUnlocks, QuestDifficultyCap } from '../../core/systems/OfficerSnapshot';

const QUEST_CAP_NAMES: Readonly<Record<QuestDifficultyCap, string>> = {
    basic: '初級',
    normal: '中級',
    elite: '精英',
    advanced: '高階',
    hell: '地獄',
};

const SANDTABLE_LOCKED = '未解鎖';

const UNLOCKED = '已解鎖';
const LOCKED = '未解鎖';

/** 官職頁的權限行；順序即畫面由上到下的順序 */
export function officerPermissionLinesOf(unlocks: Readonly<OfficerUnlocks>): string[] {
    return [
        `任務難度上限：${QUEST_CAP_NAMES[unlocks.questDifficultyCap]}`,
        `任務欄位數：${unlocks.questColumns}`,
        `大廳熱點數：${unlocks.hotspotCount}`,
        `世界沙盤：${unlocks.sandtableStage ?? SANDTABLE_LOCKED}`,
        `聯盟文書：${unlocks.allianceDocs ? UNLOCKED : LOCKED}`,
        `反霸權會盟：${unlocks.antiHegemonySummit ? UNLOCKED : LOCKED}`,
    ];
}
