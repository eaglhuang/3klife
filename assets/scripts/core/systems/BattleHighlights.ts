// @spec-source → PROG-2-10137 戰報重點整理（只用既有戰績／事件資料，不動核心規則）
import type { BattlePerformance } from './BattleRecordStats';

/** 結算窗「戰報重點」一列：欄名＋內容，已翻譯好 */
export interface HighlightRow { key: string; value: string }

/** 翻譯函式：找不到鍵時回傳 fallback；{0}{1} 由呼叫端代入 */
export type HighlightTranslate = (key: string, fallback: string, ...args: (string | number)[]) => string;

export type HighlightOutcome = 'victory' | 'defeat' | 'stalemate';

/**
 * 戰報重點追蹤器：累計「誰立功（傷害來源）」與「哪個技能最強（技能傷害）」。
 * 技能傷害事件沒有攻擊者，緊接著才有「武將使用技能」事件，所以先暫存、技能事件到來時結算給該技能。
 * 每個戰場事件 O(1)、只存少量計數，手機記憶體負擔可忽略。
 */
export class BattleHighlightTracker {
    private readonly byUnit = new Map<string, { name: string; damage: number }>();
    private readonly bySkill = new Map<string, number>();
    private pendingSkillDamage = 0;

    public reset(): void {
        this.byUnit.clear();
        this.bySkill.clear();
        this.pendingSkillDamage = 0;
    }

    /** 我方造成傷害：有攻擊單位就記功給它；沒有（技能／效果傷害）先暫存等技能事件 */
    public observePlayerDamage(damage: number, attackerId: string | null, attackerName: string | null): void {
        if (!(damage > 0)) return;
        if (attackerId && attackerName) {
            const cur = this.byUnit.get(attackerId);
            if (cur) cur.damage += damage;
            else this.byUnit.set(attackerId, { name: attackerName, damage });
        } else {
            this.pendingSkillDamage += damage;
        }
    }

    /** 我方使用技能：把暫存的技能傷害記給它 */
    public observePlayerSkill(skillName: string): void {
        const damage = this.pendingSkillDamage;
        this.pendingSkillDamage = 0;
        if (!skillName || !(damage > 0)) return;
        this.bySkill.set(skillName, (this.bySkill.get(skillName) ?? 0) + damage);
    }

    public topUnit(): { name: string; damage: number } | null {
        let best: { name: string; damage: number } | null = null;
        for (const v of this.byUnit.values()) if (!best || v.damage > best.damage) best = v;
        return best;
    }

    public topSkill(): { name: string; damage: number } | null {
        let best: { name: string; damage: number } | null = null;
        for (const [name, damage] of this.bySkill) if (!best || damage > best.damage) best = { name, damage };
        return best;
    }
}

/** 勝敗原因：用雙方傷害、擊殺與結束原因判斷，回傳翻譯鍵與預設中文 */
export function outcomeReason(outcome: HighlightOutcome, perf: BattlePerformance, retreated: boolean): { key: string; fallback: string } {
    if (retreated) return { key: 'ui.result.hl.reason.retreat', fallback: '主動撤退保存實力，下回合再戰' };
    if (outcome === 'stalemate') return { key: 'ui.result.hl.reason.draw', fallback: '雙方傷害相近，無人能壓倒對方' };
    const ahead = perf.damageDealt >= perf.damageTaken;
    if (outcome === 'victory') {
        return ahead
            ? { key: 'ui.result.hl.reason.win_ahead', fallback: '我方輸出 {0}、只承受 {1}，火力壓過敵軍' }
            : { key: 'ui.result.hl.reason.win_close', fallback: '承受 {1} 傷害仍撐到最後，靠擊殺 {2} 逆轉取勝' };
    }
    return ahead
        ? { key: 'ui.result.hl.reason.lose_close', fallback: '輸出 {0} 不輸對手，但關鍵時刻被突破' }
        : { key: 'ui.result.hl.reason.lose_behind', fallback: '承受 {1} 傷害、我方只輸出 {0}，兵力被壓制' };
}

/** 組出三列重點；沒有任何資料（例如 0 傷害）回傳空陣列，結算窗就維持原樣 */
export function buildBattleHighlights(
    tracker: BattleHighlightTracker, perf: BattlePerformance, outcome: HighlightOutcome, retreated: boolean, tr: HighlightTranslate,
): HighlightRow[] {
    if (perf.damageDealt <= 0 && perf.damageTaken <= 0 && perf.kills <= 0) return [];
    const unit = tracker.topUnit();
    const skill = tracker.topSkill();
    const reason = outcomeReason(outcome, perf, retreated);
    return [
        {
            key: tr('ui.result.hl.merit', '首功'),
            value: unit
                ? tr('ui.result.hl.merit.value', '{0}　造成 {1} 傷害', unit.name, Math.round(unit.damage))
                : tr('ui.result.hl.merit.none', '本場沒有明確的首功單位'),
        },
        {
            key: tr('ui.result.hl.skill', '最強技能'),
            value: skill
                ? tr('ui.result.hl.skill.value', '{0}　共 {1} 傷害', skill.name, Math.round(skill.damage))
                : tr('ui.result.hl.skill.none', '本場沒有造成傷害的技能'),
        },
        {
            key: outcome === 'victory' ? tr('ui.result.hl.reason.win', '勝因') : outcome === 'defeat' ? tr('ui.result.hl.reason.lose', '敗因') : tr('ui.result.hl.reason.even', '戰況'),
            value: tr(reason.key, reason.fallback, Math.round(perf.damageDealt), Math.round(perf.damageTaken), perf.kills),
        },
    ];
}
