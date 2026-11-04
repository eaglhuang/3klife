// @spec-source → 武將戰績系統.md (doc_spec_0019) §G 劇本相關、§H UI_MILESTONE_*；PROG-2-1765
/**
 * BattleMilestoneScripts — 里程碑達成時顯示的文字（純邏輯，不依賴 cc）。
 *
 * 文字照規格；萬人斬與修羅規格沒有劇本句，只顯示達成標題。
 *
 * Unity 對照：像一份 Localization Table 的格式化函式，畫面只拿結果字串。
 */
import { localizedMilestoneName } from './BattleRecordStats';

const SCRIPT_LINES: Readonly<Record<string, (name: string) => string>> = {
    KILL_100: (name) => `${name} 已斬百敵——戰場方知此人非凡！`,
    KILL_1000: (name) => `千人之血染紅了${name}的長刀，世人稱其為『殺神』。`,
    UNDEFEATED_50: (name) => `五十戰不敗——${name}已成不朽傳說！`,
    GUARDIAN_WALL: (name) => `${name} 以血肉之軀守住了萬千將士，被譽為『人盾』。`,
};

/** 里程碑達成時要顯示的文字：標題一行，有劇本句時再加一行 */
export function milestoneAnnouncementLines(id: string, generalName: string, lookup: (key: string) => string): string[] {
    const title = localizedMilestoneName(id, lookup);
    const heading = id === 'KILL_1000' ? `【${title}】${generalName} 威震四方！` : `【${title}】達成！`;
    const script = SCRIPT_LINES[id]?.(generalName);
    return script ? [heading, script] : [heading];
}
