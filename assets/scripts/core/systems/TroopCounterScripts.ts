// @spec-source → 兵種（虎符）系統.md (doc_spec_0012) §G 兵種剋制、步兵剋騎；PROG-2-1772
/**
 * TroopCounterScripts — 剋制成立時的戰鬥日誌句（純邏輯，不依賴 cc）。
 *
 * 暫定（可逆）：
 * - 規格 §G 只有兩句，且「騎兵衝鋒弓陣」與 PM 裁定的五角剋制表不符（騎兵剋盾兵，不剋弓兵）。
 *   這裡依剋制表改寫成騎兵衝盾陣；槍兵剋騎兵照規格句；其餘三組是補上的暫定句。
 *
 * Unity 對照：像戰鬥回饋的文字表，加上一個「本場已播過」的去重器。
 */
import { TROOP_COUNTER_MAP, TroopType } from '../config/Constants';

const COUNTER_LINES: Readonly<Partial<Record<TroopType, string>>> = {
    [TroopType.Cavalry]: '騎兵衝鋒盾陣——盾兵陣腳大亂！',
    [TroopType.Shield]: '盾兵頂矢推進——弓兵箭雨失效！',
    [TroopType.Archer]: '弓兵箭雨覆壓——步兵難以近身！',
    [TroopType.Infantry]: '步兵貼身搏殺——長矛施展不開！',
    [TroopType.Pikeman]: '步兵嚴陣以待，騎兵衝鋒被長矛陣擋下！',
};

export function troopCounterLine(attacker: TroopType, defender: TroopType): string | null {
    return TROOP_COUNTER_MAP[attacker] === defender ? COUNTER_LINES[attacker] ?? null : null;
}

/** 同一場戰鬥每組剋制只回傳一次句子 */
export class TroopCounterAnnouncer {
    private readonly _announced = new Set<TroopType>();

    public take(attacker: TroopType, defender: TroopType): string | null {
        const line = troopCounterLine(attacker, defender);
        if (!line || this._announced.has(attacker)) return null;
        this._announced.add(attacker);
        return line;
    }
}
