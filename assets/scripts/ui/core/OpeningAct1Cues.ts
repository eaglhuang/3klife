// @spec-source → 新手開場規格書.md §4 第一幕（分鏡 1–4）；WBS OPEN-03（PROG-2-1254）
/**
 * OpeningAct1Cues — 第一幕四個分鏡的演出提示（純邏輯，不依賴 cc）
 *
 * 文字與翻頁由 OpeningIntroController 與 INTRO_PANELS 處理（PROG-2-0646）；
 * 本檔只決定每一分鏡用哪種演出、要不要點擊才進下一幕、要疊哪些特效。
 * 畫面層讀 getAct1Cue(panelId)，把演出類型與疊加效果對應到節點。
 *
 * 規則：
 *   - 順序與 INTRO_PANELS 一一對應，不可跳過或多出分鏡（測試會檢查）。
 *   - 信件（letter）必須點擊才進下一幕，其餘分鏡播完自動進下一幕。
 *   - 祖紋命篆浮現、像素被六色因子光痕侵入、漩渦命盤裂口，是規格指定的疊加效果。
 *
 * 暫定：疊加效果只給名稱，實際貼圖與動畫由畫面層依 cocos 資源決定；尚未接畫面。
 *
 * Unity 對照：像一張 Timeline 的 Track 對照表，每個 Clip 指定 Playable 與是否 Pause 等待 Input。
 */
import { INTRO_PANELS } from '../../core/systems/NewPlayerOpening';

export type Act1Presentation = 'black-ancient' | 'win95-letter' | 'pixel-memory' | 'vortex';

export interface Act1Cue {
    panelId: string;
    presentation: Act1Presentation;
    /** true 表示要點擊才進下一幕；false 表示演出播完自動進下一幕 */
    requiresClick: boolean;
    overlays: readonly string[];
}

export const ACT1_CUES: readonly Act1Cue[] = Object.freeze([
    { panelId: 'ancient', presentation: 'black-ancient', requiresClick: false, overlays: ['ancestral-seal-script'] },
    { panelId: 'letter', presentation: 'win95-letter', requiresClick: true, overlays: ['lineage-observation-chart'] },
    { panelId: 'pixel', presentation: 'pixel-memory', requiresClick: false, overlays: ['six-factor-light-trace', 'ancestral-seal-script'] },
    { panelId: 'vortex', presentation: 'vortex', requiresClick: false, overlays: ['destiny-rift'] },
]);

/** 依分鏡 id 取演出提示；找不到時回傳 undefined */
export function getAct1Cue(panelId: string): Act1Cue | undefined {
    return ACT1_CUES.find((cue) => cue.panelId === panelId);
}

/** 第一幕的分鏡 id 是否與 INTRO_PANELS 完全一致（同順序） */
export function act1CuesMatchPanels(): boolean {
    if (ACT1_CUES.length !== INTRO_PANELS.length) return false;
    return ACT1_CUES.every((cue, index) => cue.panelId === INTRO_PANELS[index].id);
}
