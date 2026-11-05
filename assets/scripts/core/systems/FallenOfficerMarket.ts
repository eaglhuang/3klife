// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) §G-1 國家滅亡句；PROG-2-1848
/**
 * FallenOfficerMarket — 滅亡國殘餘武將流入傭兵市場（純邏輯，不依賴 cc）
 *
 * 規格句：「{君主名} 下落不明... 殘餘武將流入各地傭兵市場。」所以君主不入市。
 * 名單直接由滅亡國目前的逐將名冊推導，不另存；國家復興時自動退出市場。
 *
 * Unity 對照：像從 AI 陣營的 Unit 清單即時查詢，不維護第二份清單。
 */
import type { NationState } from './RivalNations';
import type { RivalRostersConfig } from './RivalOfficers';

/** 名冊設定的第一位是君主（rival-rosters.json） */
export function rivalRulerIds(config: Readonly<RivalRostersConfig>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [nationId, entry] of Object.entries(config.nations)) {
        if (entry.generals.length > 0) out[nationId] = entry.generals[0];
    }
    return out;
}

/**
 * 流入市場的武將 id 與其舊國。君主不明的勢力略過，避免把君主誤放進市場。
 */
export function fallenOfficerOrigins(
    nations: readonly NationState[],
    rulerIds: Readonly<Record<string, string>>,
): Map<string, string> {
    const origins = new Map<string, string>();
    for (const nation of nations) {
        const ruler = rulerIds[nation.id];
        if (!nation.fallen || !ruler) continue;
        for (const officer of nation.officerRoster?.officers ?? []) {
            if (officer.generalId !== ruler && !origins.has(officer.generalId)) origins.set(officer.generalId, nation.id);
        }
    }
    return origins;
}
