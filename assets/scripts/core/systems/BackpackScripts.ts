// @spec-source → 武將背包（倉庫）系統.md (doc_spec_0017) §G 劇本相關；PROG-2-1764
/**
 * BackpackScripts — 武將背包劇本句（純邏輯，不依賴 cc）。
 *
 * 文字照規格 §G；規格句的「他」「父親」只適用男將，女將改用「她」「母親」。
 * 「傳家寶物入手」句還沒有入手流程可接，等寶物資料定案再補。
 *
 * Unity 對照：像一份 Localization Table 的格式化函式，畫面只拿結果字串。
 */

export function equipHorseLine(horseName: string, generalName: string): string {
    return `${horseName} 嘶鳴長嘯——${generalName} 如虎添翼！`;
}

export function retireGearReturnLine(generalName: string, isFemale: boolean): string {
    return `${generalName} 留下了${isFemale ? '她' : '他'}的裝備，願後人善加利用。`;
}

export function warehouseFullLine(): string {
    return '主城倉庫已滿！請清理或擴充空間。';
}

export function gearInheritLine(childName: string, parentIsFemale: boolean): string {
    return `${parentIsFemale ? '母親' : '父親'}的佩劍傳到了${childName}手中——血脈與鐵器，一同傳承。`;
}
