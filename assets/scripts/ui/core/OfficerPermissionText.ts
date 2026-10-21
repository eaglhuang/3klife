// @spec-source → 官職系統.md（F-2 階位表、§權限快照）；WBS OFC-08 官職頁顯示段
/**
 * OfficerPermissionText — 官職頁的已解鎖權限文字（純邏輯，不依賴 cc）
 *
 * 只把 OfficerPermissions 的唯讀快照排成「項目：內容」的多行文字，畫面只負責擺放。
 * 文案走語系表（ui.officer.*）；語系表查不到時（回傳 key 本身）退回 zh-TW 預設，與 SeasonTexts 相同做法。
 *
 * Unity 對照：像 ViewModel 把權限 struct 轉成 Text 的多行字串，文案從 Localization Table 取，查不到就用內建中文。
 */
import type { OfficerUnlocks, QuestDifficultyCap } from '../../core/systems/OfficerSnapshot';
import { fillBreedText, type BreedTextLookup } from './BreedingTexts';

/** zh-TW 預設：語系表未載入或缺 key 時使用 */
export const OFFICER_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.officer.page_title': '官職詳情：{0}',
    'ui.officer.perm.quest_cap': '任務難度上限：{0}',
    'ui.officer.perm.quest_cols': '任務欄位數：{0}',
    'ui.officer.perm.hotspots': '大廳熱點數：{0}',
    'ui.officer.perm.sandtable': '世界沙盤：{0}',
    'ui.officer.perm.alliance_docs': '聯盟文書：{0}',
    'ui.officer.perm.summit': '反霸權會盟：{0}',
    'ui.officer.perm.locked': '未解鎖',
    'ui.officer.perm.unlocked': '已解鎖',
    'ui.officer.cap.basic': '初級',
    'ui.officer.cap.normal': '中級',
    'ui.officer.cap.elite': '精英',
    'ui.officer.cap.advanced': '高階',
    'ui.officer.cap.hell': '地獄',
};

function officerText(lookup: BreedTextLookup, key: string, ...args: string[]): string {
    const localized = lookup(key, ...args);
    return localized === key ? fillBreedText(OFFICER_TEXT_FALLBACK_ZH_TW[key] ?? key, args) : localized;
}

/** 官職詳情頁標題：「官職詳情：{階位}」 */
export function officerPageTitleText(lookup: BreedTextLookup, rankName: string): string {
    return officerText(lookup, 'ui.officer.page_title', rankName);
}

/** 官職頁的權限行；順序即畫面由上到下的順序 */
export function officerPermissionLinesOf(unlocks: Readonly<OfficerUnlocks>, lookup: BreedTextLookup = (key) => key): string[] {
    const t = (key: string, ...args: string[]): string => officerText(lookup, key, ...args);
    const onOff = (on: boolean): string => t(on ? 'ui.officer.perm.unlocked' : 'ui.officer.perm.locked');
    const cap: QuestDifficultyCap = unlocks.questDifficultyCap;
    return [
        t('ui.officer.perm.quest_cap', t(`ui.officer.cap.${cap}`)),
        t('ui.officer.perm.quest_cols', String(unlocks.questColumns)),
        t('ui.officer.perm.hotspots', String(unlocks.hotspotCount)),
        t('ui.officer.perm.sandtable', unlocks.sandtableStage ?? t('ui.officer.perm.locked')),
        t('ui.officer.perm.alliance_docs', onOff(unlocks.allianceDocs)),
        t('ui.officer.perm.summit', onOff(unlocks.antiHegemonySummit)),
    ];
}
