// @spec-source → 數值系統.md §G-1 數值表現文案；PROG-2-1782
/**
 * NumericalScriptLines — 數值表現文案（純邏輯，不依賴 cc）
 *
 * 暫定選擇（可逆）：
 *   - 部隊沒有自己的將領，暴擊句用同陣營主將的名字。
 *   - 規格沒寫 EP 多高算「特高」，暫定 100（基礎 50，要湊到兩項以上加成）。
 *   - 武將的 1 轉是初始狀態，所以「第 N 次轉生」的 N 是轉數減 1。
 *   - 轉生句沒有武將名，一批抽到多位時只說轉數最高的一句，避免分不清誰是誰。
 *
 * Unity 對照：像 ScriptableObject 上的台詞表，呼叫端只給數值。
 */

export const SP_FULL_LINE = '技能能量蓄滿！可發動武將技能！';
export const HIGH_EP_THRESHOLD = 100;

export function critLine(generalName: string, damage: number): string {
    return `天命一擊！${generalName} 造成 ${damage} 點致命傷害！`;
}

/** 這批抽卡的轉生突破句；滿轉溢出沒有增加上限，不算 */
export function rebirthBreakthroughLine(rebirths: ReadonlyArray<{ overflow: boolean; rebirthCount: number; attributeCap: number; mercenaryStatCap?: number }>): string | null {
    let top: { rebirthCount: number; attributeCap: number; mercenaryStatCap?: number } | null = null;
    for (const rebirth of rebirths) {
        if (rebirth.overflow) continue;
        if (!top || rebirth.rebirthCount > top.rebirthCount) top = rebirth;
    }
    return top ? `第 ${top.rebirthCount - 1} 次轉生！屬性上限突破至 ${top.mercenaryStatCap ?? top.attributeCap}！` : null;
}

export function highEpLine(ep: number | undefined): string | null {
    if (ep === undefined || ep < HIGH_EP_THRESHOLD) return null;
    return `天賦異稟！爆發力 EP 達到 ${ep}！此子前途不可限量。`;
}
