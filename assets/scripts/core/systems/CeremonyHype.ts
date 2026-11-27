// @spec-source → PROG-2-10127 年末典禮熱鬧感加強（觀眾接力起鬨／拍肩偷笑、彩帶計畫；純邏輯不依賴 cc）
/**
 * CeremonyHype — 年末典禮的熱鬧演出計畫（純邏輯，同輸入同輸出，方便測試）
 *
 * - planRelay：得獎時 2～3 位觀眾接力起鬨；落榜時改由 2～3 位拍肩、偷笑。
 * - planRibbons：前三名揭曉時飄落的彩帶（固定 20 枚，畫面端用物件池，用完回收）。
 * 台詞文字與自稱不在這裡處理，交給 YearEndCeremonyCrowd.resolveCrowdLine（SpeakerVoice）。
 */

export type RelayKind = 'win' | 'lose';

export interface RelayStep {
    /** 觀眾名單裡的第幾位 */
    readonly memberIndex: number;
    readonly lineKey: string;
    /** 接力開始後幾秒說這句 */
    readonly atSeconds: number;
}

/** 接力每句的間隔秒數；3 句剛好 2 秒內收完，不拖長典禮 */
export const RELAY_STEP_SECONDS = 0.9;

/**
 * 接力計畫：從第 turn 位觀眾起連續換人，台詞依序往下；人數取 2 或 3（依 turn 奇偶），受名單人數與台詞數限制。
 * 少於 2 位觀眾或沒有台詞時回空陣列。
 */
export function planRelay(turn: number, memberCount: number, lineKeys: readonly string[]): RelayStep[] {
    const t = Math.max(0, Math.floor(turn));
    const count = Math.min(2 + (t % 2), memberCount, lineKeys.length);
    if (count < 2) return [];
    const steps: RelayStep[] = [];
    for (let i = 0; i < count; i++) {
        steps.push({ memberIndex: (t + i) % memberCount, lineKey: lineKeys[(t + i) % lineKeys.length], atSeconds: i * RELAY_STEP_SECONDS });
    }
    return steps;
}

/** 玩家是否進前三（得獎）：名次 1～3 */
export function isPlayerWinner(playerRank: number): boolean {
    return playerRank >= 1 && playerRank <= 3;
}

/**
 * 接力該在哪個揭曉事件觸發：得獎者在自己的名次亮框時起鬨；落榜者等前三名都揭曉（第 3 名亮框）才拍肩。
 */
export function relayTriggerRank(playerRank: number): 1 | 2 | 3 {
    return isPlayerWinner(playerRank) ? (playerRank as 1 | 2 | 3) : 3;
}

export const CEREMONY_RIBBON_COUNT = 20;
/** 彩帶顏色表（金、紅、翠、藍、粉）；用 colorIndex 取，不新增美術 */
export const CEREMONY_RIBBON_COLORS: readonly string[] = ['#E8BE60', '#D84A3A', '#3FA77A', '#4A7FD0', '#E58AA8'];

export interface RibbonSpec {
    /** 起點橫向位置，0～1（面板寬度比例） */
    readonly x: number;
    /** 出發延遲秒數 */
    readonly delay: number;
    /** 落到底的秒數 */
    readonly fall: number;
    /** 左右飄擺像素（正負代表先往哪邊） */
    readonly sway: number;
    /** 落下過程轉動角度 */
    readonly spin: number;
    readonly colorIndex: number;
}

/** 20 枚彩帶的落下計畫：黃金比例散佈橫位置，延遲／速度／擺幅輪流變化，不用亂數 */
export function planRibbons(count: number = CEREMONY_RIBBON_COUNT): RibbonSpec[] {
    const specs: RibbonSpec[] = [];
    for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        specs.push({
            x: (0.07 + i * 0.618034) % 1,
            delay: (i % 5) * 0.12,
            fall: 2.2 + ((i * 3) % 5) * 0.2,
            sway: side * (14 + (i % 4) * 6),
            spin: side * (200 + (i % 3) * 90),
            colorIndex: i % CEREMONY_RIBBON_COLORS.length,
        });
    }
    return specs;
}
