/**
 * MissionGeneralOptions.test.ts — 任務詳情派遣武將下拉只列可派遣名冊（PROG-2-2112）
 *
 * Unity 對照：EditMode Test，驗 Dropdown 資料來源是玩家名冊而不是整本圖鑑。
 */
import { assert, TestSuite } from './TestRunner';
import { buildMissionGeneralOptions } from '../assets/scripts/core/systems/MissionGeneralOptions';
import { listDeployable } from '../assets/scripts/core/systems/BattleRoster';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
    } as unknown as GeneralConfig;
}

export function createMissionGeneralOptionsSuite(): TestSuite {
    const suite = new TestSuite('MissionGeneralOptions (任務詳情派遣下拉 PROG-2-2112)');

    suite.test('標籤為「名稱・稱號」，沒有稱號只顯示名稱；順序維持名冊順序', () => {
        const rows = buildMissionGeneralOptions([general('a', { name: '關羽', title: '武聖' }), general('b', { name: '張飛' })]);
        assert.equals(JSON.stringify(['關羽・武聖', '張飛']), JSON.stringify(rows.map((r) => r.label)));
        assert.equals(JSON.stringify(['a', 'b']), JSON.stringify(rows.map((r) => r.id)));
    });

    suite.test('自薦者排最前，其餘維持原順序；同 id 只留第一筆', () => {
        const list = [general('a'), general('b'), general('c'), general('b')];
        const rows = buildMissionGeneralOptions(list, (g) => g.id === 'c');
        assert.equals(JSON.stringify(['c', 'a', 'b']), JSON.stringify(rows.map((r) => r.id)));
        assert.isTrue(rows[0].volunteer);
        assert.isFalse(rows[1].volunteer);
    });

    suite.test('沒有可派遣武將時回空陣列（不回頭列整本圖鑑）', () => {
        assert.equals(0, buildMissionGeneralOptions([]).length);
    });

    suite.test('接上可出戰名冊：死亡、退役教官、未畢業子嗣、培育中不會出現在下拉', () => {
        const roster = [
            general('ok'),
            general('dead', { status: 'dead' }),
            general('mentor', { isMentorCard: true }),
            general('kid', { status: 'Mystery', hiddenFlags: ['mystery-phase'] }),
            general('nurturing'),
        ];
        const rows = buildMissionGeneralOptions(listDeployable(roster, { nurturingIds: ['nurturing'] }));
        assert.equals(JSON.stringify(['ok']), JSON.stringify(rows.map((r) => r.id)));
    });

    suite.test('240 位圖鑑、玩家只擁有 3 位：下拉只有 3 筆', () => {
        const catalog = Array.from({ length: 240 }, (_, i) => general(`g${i}`));
        const owned = catalog.slice(0, 3);
        assert.equals(3, buildMissionGeneralOptions(listDeployable(owned)).length);
    });

    return suite;
}
