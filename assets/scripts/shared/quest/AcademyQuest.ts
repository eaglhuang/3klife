// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §12 QST-M／A0；學府任務 doc_spec_1179；任務系統 Base (doc_spec_1185) §5.5；PROG-2-9209
/**
 * AcademyQuest — taskKind=academy 的定義常數與宿主 adapter 介面（零依賴）。
 *
 * 學府 36 回合修業＝一張 academy 任務、36 步，閘門在第 12、24、36 步（學期評核與結業）。
 * 本檔只提供「可接」的介面；學府現有流程（AcademyTrainingEngine、GameAcademySaveStore）改走 task.*
 * 屬下一張卡 A0（6a），這裡不動學府執行路徑。
 *
 * 宿主（A0）要做的事：
 *   - 入學：呼叫 task.accept（defId=ACADEMY_36、actors=[childId]、acceptKey=入學流水），占用由任務框架代登記；
 *   - 每回合：task.advance（fromStep＝目前回合）；打斷彈窗與學期評核處理完呼叫 task.clearGate；
 *   - 暫離（凍結）：task.pause／task.resume；
 *   - 結業：task.settle，成敗等級由 createAcademyQuestAdapter 的 grade 決定，獎勵由定義的 outcome 走 reward.claim。
 */
import type { QuestKindAdapter } from './QuestService';
import type { QuestTier } from './QuestTypes';

export const ACADEMY_TASK_KIND = 'academy';
export const ACADEMY_QUEST_DEF_ID = 'ACADEMY_36';
export const ACADEMY_TOTAL_TURNS = 36;
/** 學期評核與結業的閘門步數（總綱第 12 章：第 12、24、36 回合） */
export const ACADEMY_GATE_TURNS: readonly number[] = Object.freeze([12, 24, 36]);
/** 學府閘門擋下的動作標籤：推進、結算，以及其他會讓孩子分心的動作（宿主做之前先 task.query 看 blockedActions） */
export const ACADEMY_GATE_BLOCKS: readonly string[] = Object.freeze(['advance', 'settle', 'enroll', 'mentorAssign']);

/** 學府宿主提供的評等來源；A0 以結業評級實作 */
export interface AcademyQuestPort {
    /** 回傳此孩子的結業成敗等級；未提供一律 success */
    grade?(childId: string): QuestTier;
}

export function createAcademyQuestAdapter(port: AcademyQuestPort = {}): QuestKindAdapter {
    return {
        taskKind: ACADEMY_TASK_KIND,
        judge: (instance) => (port.grade && instance.actors.length > 0 ? port.grade(instance.actors[0]) : 'success'),
    };
}
