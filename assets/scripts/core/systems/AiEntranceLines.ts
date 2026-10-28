// @spec-source → AI武將強度系統.md G-1「AI 武將出場台詞」、G-2「難度提示文案」；WBS AIS-14
/**
 * AiEntranceLines — AI 武將出場台詞與困難關卡提示（純邏輯，不依賴 cc）
 *
 * 出場台詞依敵將 id 查表（規格以 AI 模板命名，這裡對應到 generals.json 的武將 id）。
 * 沒有列在表內的敵將回傳 null，呼叫端不顯示，不影響戰鬥。
 *
 * 暫定（可逆）：「進入困難關卡」的提示以 HARD 以上（困難、噩夢、地獄）為準；規格只寫「困難關卡」，沒寫門檻。
 *
 * Unity 對照：像每個 Boss 角色的 Dialogue 表，依角色 id 取一句開場台詞，沒設定就不播。
 */
import type { AiDifficulty } from './AiSpCharge';

/** 規格 G-1 的八個 AI 模板，對應 generals.json 的武將 id */
const AI_ENTRANCE_LINES: Readonly<Record<string, string>> = {
    'cao-cao': '「寧教我負天下人，休教天下人負我！」',
    'liu-bei': '「仁義為先，但犯我疆界者，勿怪刀劍無情。」',
    'zhuge-liang': '「吾已洞察你的佈陣，一切盡在掌握。」',
    'lu-bu': '「天下誰敢一戰！」',
    'zhou-yu': '「此戰不過借東風一場。」',
    'guan-yu': '「關某豈懼宵小之輩。」',
    'sima-yi': '「善守者，藏於九地之下。」',
    'yuan-shao': '「以吾百萬雄師，何人能擋？」',
};

const HARD_ENCOUNTER_DIFFICULTIES: ReadonlySet<AiDifficulty> = new Set<AiDifficulty>(['hard', 'nightmare', 'hell']);

export function aiEntranceLineOf(generalId: string): string | null {
    return AI_ENTRANCE_LINES[generalId] ?? null;
}

export function hardEncounterHintOf(difficulty: AiDifficulty): string | null {
    return HARD_ENCOUNTER_DIFFICULTIES.has(difficulty) ? '此戰敵軍精銳盡出，務必謹慎！' : null;
}

/** 開戰時戰報要先顯示的 AI 相關文案：困難提示在前，敵將出場台詞在後；沒有就回傳空陣列 */
export function openingAiLogLinesOf(generalId: string, generalName: string, difficulty: AiDifficulty): string[] {
    const lines: string[] = [];
    const hint = hardEncounterHintOf(difficulty);
    if (hint) lines.push(hint);
    const entrance = aiEntranceLineOf(generalId);
    if (entrance) lines.push(`${generalName}：${entrance}`);
    return lines;
}
