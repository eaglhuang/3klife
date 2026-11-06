// @spec-source → 主戰場UI規格補充_v3.md (doc_ui_0003) §v3-5 主將屬性戰法快覽小窗；PROG-2-1864
/**
 * GeneralQuickViewTexts — 武將快覽小窗各欄位要顯示的文字
 *
 * 不碰節點，只把 GeneralQuickViewData 換成「layout id → 文字」，讓 Composite 一次 setTexts。
 * 敵方的血量與四圍顯示「???」，戰法不足三條補「——」。
 *
 * Unity 對照：Presenter 把 HeroData 轉成 ViewModel 字串，View 只負責 text = 。
 */
import type { GeneralQuickViewData } from './GeneralQuickViewPanel';

/** 快覽小窗的戰法列數（版面 GQSkill1～3） */
export const QUICK_VIEW_SKILL_ROWS = 3;
const ENEMY_MASK = '???';
const EMPTY_SKILL = '——';

export function generalQuickViewTexts(data: GeneralQuickViewData): Record<string, string> {
    const mask = data.isEnemy ? ENEMY_MASK : null;
    const texts: Record<string, string> = {
        gqName: data.name,
        gqTitle: data.title,
        gqFaction: data.faction,
        gqHpRow: mask ? `❤ HP：${mask}` : `❤ HP：${data.hp.toLocaleString()} / ${data.maxHp.toLocaleString()}`,
        gqAtk: `⚔ 攻：${mask ?? data.atk}`,
        gqDef: `🛡 防：${mask ?? data.def}`,
        gqSpd: data.spd != null ? `🐎 速：${mask ?? data.spd}` : '',
        gqInt: data.int != null ? `🧠 智：${mask ?? data.int}` : '',
    };
    const skills = data.skills ?? [];
    for (let i = 0; i < QUICK_VIEW_SKILL_ROWS; i++) texts[`gqSkill${i + 1}`] = skills[i] ?? EMPTY_SKILL;
    return texts;
}
