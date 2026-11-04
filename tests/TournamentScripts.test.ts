// @spec-source → 名將挑戰賽系統.md (doc_spec_0007) §G 劇本相關；PROG-2-1746、PROG-2-1747
import { TestSuite, assert } from './TestRunner';
import {
    tournamentBossIntelLine, tournamentMatchStartLine, tournamentOpeningLine, tournamentPrepHintLine, tournamentSeasonEndLine, tournamentSeriesHeadline,
} from '../assets/scripts/core/systems/TournamentScripts';
import { tournamentVenueOf } from '../assets/scripts/core/systems/TournamentLocal';
import { seasonEndText, TOURNAMENT_TIER_LABEL } from '../assets/scripts/ui/core/TournamentPanelController';

export function createTournamentScriptsSuite(): TestSuite {
    const suite = new TestSuite('TournamentScripts');

    suite.test('§G 各情境句照規格格式', () => {
        assert.equals('第 3 屆【赤壁盃】正式開幕！地形：水域、天氣：晴', tournamentOpeningLine(3, '赤壁盃', '水域', '晴'));
        assert.equals('距離競賽期還有 4 天——務必配置克制陣容！', tournamentPrepHintLine(4));
        assert.equals('你的 張飛 vs 對手 對手——五戰三勝，一決高下！', tournamentMatchStartLine('張飛'));
        assert.equals('第 3 屆【赤壁盃】落幕！你的最終排名：黃金', tournamentSeasonEndLine(3, '赤壁盃', '黃金'));
        assert.equals('情報：本季 BOSS【董卓】弱點——火攻、緩速！', tournamentBossIntelLine('董卓', ['火攻', '緩速']));
    });

    suite.test('參戰開頭句：決賽用巔峰對決、非決賽勝利用晉級句、落敗為空', () => {
        assert.equals('巔峰對決！一場定勝負——張飛 vs 對手！', tournamentSeriesHeadline({ general: '張飛', cupName: '赤壁盃', win: false, isFinal: true }));
        assert.equals('漂亮！張飛 在【赤壁盃】中擊敗對手，晉級下一輪！', tournamentSeriesHeadline({ general: '張飛', cupName: '赤壁盃', win: true, isFinal: false }));
        assert.equals('', tournamentSeriesHeadline({ general: '張飛', cupName: '赤壁盃', win: false, isFinal: false }));
    });

    suite.test('領獎附賽季落幕句：每季一行，盃名依季序', () => {
        const text = seasonEndText([{ seasonIndex: 1, tier: 'GOLD', gold: 300 }, { seasonIndex: 2, tier: 'BRONZE', gold: 100 }]);
        const lines = text.split('\n');
        assert.equals(2, lines.length);
        assert.equals(`第 1 屆【${tournamentVenueOf(1).cupName}】落幕！你的最終排名：${TOURNAMENT_TIER_LABEL.GOLD}`, lines[0]);
        assert.isTrue(lines[1].startsWith(`第 2 屆【${tournamentVenueOf(2).cupName}】落幕！`));
    });

    return suite;
}
