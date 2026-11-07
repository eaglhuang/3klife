// @spec-source → 戰場委任AI武將模板與章節權重調配規格書 (doc_spec_0329) §3（AIS-05，PROG-2-2007）
/**
 * ChapterAiConfig — 依章節縮放 AI 決策精度（IQ、剋制決策率、出兵方式、糧草保留、場景評估、性格模板）（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 第一章：IQ 40、剋制 20%、隨機出兵、不保留糧草。
 * - 第二章：IQ 60、剋制 45%、優先出剋制兵種。
 * - 第三章：IQ 80、剋制 70%、開始評估場景 Preset 與器械保留。
 * - 第四章起：IQ 100、剋制 90%、完整套用九大武將性格與最佳虎符選配。
 *
 * 九大模板沿用 AIGeneralTemplate／ai-general-templates.json；虎符評分沿用 AiTallySelection。
 * 暫定：數值 IQ 對應既有 AiIqLevel：40→LOW、60→MEDIUM、80→HIGH、100→EXTREME（PERFECT 保留給特殊關卡）；
 * 「保留糧草」第二章起開啟；剋制擲骰由呼叫端提供 0~1 亂數。接入 AiDeployTroopPick 另卡。
 * Unity 對照：像依關卡讀一份 DifficultyProfile ScriptableObject。
 */
import type { AiIqLevel } from './AiDifficultyTable';

export interface ChapterAiConfig {
    chapter: number;
    iq: number;
    iqLevel: AiIqLevel;
    counterRate: number;
    randomDeploy: boolean;
    reserveFood: boolean;
    evaluateScenePreset: boolean;
    usePersonalityProfile: boolean;
    useBestTally: boolean;
}

const TABLE: readonly Omit<ChapterAiConfig, 'chapter'>[] = [
    { iq: 40, iqLevel: 'LOW', counterRate: 0.2, randomDeploy: true, reserveFood: false, evaluateScenePreset: false, usePersonalityProfile: false, useBestTally: false },
    { iq: 60, iqLevel: 'MEDIUM', counterRate: 0.45, randomDeploy: false, reserveFood: true, evaluateScenePreset: false, usePersonalityProfile: false, useBestTally: false },
    { iq: 80, iqLevel: 'HIGH', counterRate: 0.7, randomDeploy: false, reserveFood: true, evaluateScenePreset: true, usePersonalityProfile: false, useBestTally: false },
    { iq: 100, iqLevel: 'EXTREME', counterRate: 0.9, randomDeploy: false, reserveFood: true, evaluateScenePreset: true, usePersonalityProfile: true, useBestTally: true },
];

/** 章節對應的 AI 設定；章節 < 1 視為第一章，第四章以後同第四章。 */
export function chapterAiConfigOf(chapter: number): ChapterAiConfig {
    const c = Number.isFinite(chapter) ? Math.max(1, Math.floor(chapter)) : 1;
    return { chapter: c, ...TABLE[Math.min(c, TABLE.length) - 1] };
}

/** 本次出兵是否採剋制兵種：roll 為 0~1 亂數，小於剋制決策率即剋制。 */
export function shouldPickCounter(config: ChapterAiConfig, roll: number): boolean {
    return roll < config.counterRate;
}
