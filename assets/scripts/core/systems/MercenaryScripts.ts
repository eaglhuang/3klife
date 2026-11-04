// @spec-source → 傭兵系統（試用）.md (doc_spec_0029) §G 劇本相關；PROG-2-1771
/**
 * MercenaryScripts — 傭兵試用歷程的劇本句（純邏輯，不依賴 cc）。
 *
 * 規格 §G 的「退役」句沒有放在這裡：退役已有壽命劇本句（LIFE-13），同一刻不再疊第二句。
 *
 * Unity 對照：像 ScriptableObject 裡的對白表，只提供字串，不碰 UI。
 */
import { TRIAL_DAYS, type MercenaryState } from './MercenaryBond';

const DAY_THREE = 3;

/** 這次推進是否剛好走到試用第 3 日（Q72 純敘事，沒有數值效果） */
export function reachedTrialDayThree(before: Readonly<MercenaryState>, after: Readonly<MercenaryState>): boolean {
    const dayThreeLeft = TRIAL_DAYS - DAY_THREE;
    return after.status === 'Trial' && before.daysLeft === dayThreeLeft + 1 && after.daysLeft === dayThreeLeft;
}

export function mercDayThreeLine(name: string): string {
    return `${name}：與主公並肩三日，已知主公非凡人。`;
}

export function mercBondedLine(name: string): string {
    return `${name} 願誓死追隨主公！桃園之義，永世不渝！`;
}

export function mercFarewellLine(name: string): string {
    return `六日之約已盡，${name} 含淚辭別…`;
}
