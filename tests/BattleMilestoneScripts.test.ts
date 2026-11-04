// @spec-source → 武將戰績系統.md (doc_spec_0019) §G、§H；PROG-2-1765
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { milestoneAnnouncementLines } from '../assets/scripts/core/systems/BattleMilestoneScripts';

const noLocale = (key: string): string => key;

export function createBattleMilestoneScriptsSuite(): TestSuite {
    const suite = new TestSuite('BattleMilestoneScripts');

    suite.test('四個里程碑顯示標題與規格句', () => {
        assert.equals('【百人斬】達成！|呂布 已斬百敵——戰場方知此人非凡！', milestoneAnnouncementLines('KILL_100', '呂布', noLocale).join('|'));
        assert.equals('【千人斬】呂布 威震四方！|千人之血染紅了呂布的長刀，世人稱其為『殺神』。', milestoneAnnouncementLines('KILL_1000', '呂布', noLocale).join('|'));
        assert.equals('【不敗神話】達成！|五十戰不敗——趙雲已成不朽傳說！', milestoneAnnouncementLines('UNDEFEATED_50', '趙雲', noLocale).join('|'));
        assert.equals('【守護之壁】達成！|典韋 以血肉之軀守住了萬千將士，被譽為『人盾』。', milestoneAnnouncementLines('GUARDIAN_WALL', '典韋', noLocale).join('|'));
    });

    suite.test('規格沒有劇本句的里程碑只顯示標題', () => {
        assert.equals('【萬人斬】達成！', milestoneAnnouncementLines('KILL_10000', '呂布', noLocale).join('|'));
        assert.equals('【修羅】達成！', milestoneAnnouncementLines('ASURA', '呂布', noLocale).join('|'));
    });

    suite.test('標題走語系查詢', () => {
        const lines = milestoneAnnouncementLines('ASURA', '呂布', () => 'Asura');
        assert.equals('【Asura】達成！', lines[0]);
    });

    suite.test('戰後結算把文字寫進日誌與結算細項', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');
        assert.isTrue(source.includes('milestoneAnnouncementLines('));
        assert.isTrue(source.includes('this.ctx.resultPopup?.appendDetails?.(milestoneLines)'));
    });

    return suite;
}
