import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { epGradeOf, famousClanLines, withFamousClanBonus } from '../assets/scripts/core/systems/FamousClan';

const general = (id: string, ep?: number) => ({ id, name: id, ep, epRating: 'B+' }) as unknown as GeneralConfig;

function session(): GameSession {
    const s = new GameSession();
    s.setRosterStore(new InMemoryRosterStore([]));
    return s;
}

export function createFamousClanSuite(): TestSuite {
    const suite = new TestSuite('FamousClan');

    suite.test('名門武將 EP +5，評級跟著更新，不改原物件', () => {
        const source = general('yuan-shao', 61);
        const result = withFamousClanBonus(source);
        assert.equals(66, result.ep);
        assert.equals('A-', result.epRating);
        assert.equals(61, source.ep);
        assert.equals('B+', source.epRating);
    });

    suite.test('EP 不超過 100；沒有 EP 或不是名門的武將不動', () => {
        assert.equals(100, withFamousClanBonus(general('cao-cao', 98)).ep);
        const noEp = general('cao-cao');
        assert.isTrue(withFamousClanBonus(noEp) === noEp);
        const other = general('zhao-yun', 80);
        assert.isTrue(withFamousClanBonus(other) === other);
    });

    suite.test('字母評級區間與 generals.json 一致', () => {
        for (const [ep, grade] of [[92, 'S+'], [90, 'S+'], [87, 'S'], [80, 'S-'], [79, 'A+'], [70, 'A'], [69, 'A-'], [60, 'B+'], [55, 'B'], [54, 'C']] as const) {
            assert.equals(grade, epGradeOf(ep));
        }
    });

    suite.test('入名冊時套用一次，重複抽到不再加', () => {
        const s = session();
        s.enrollGenerals([general('yuan-shao', 61)]);
        s.enrollGenerals([general('yuan-shao', 61)]);
        s.enrollGenerals([general('yuan-shao', 61)], { rebirthOnDuplicate: true });
        assert.equals(66, s.roster.find((g) => g.id === 'yuan-shao')!.ep);
    });

    suite.test('同批抽到兩張只加一次', () => {
        const s = session();
        s.enrollGenerals([general('cao-cao', 90), general('cao-cao', 90)], { rebirthOnDuplicate: true });
        assert.equals(95, s.roster.find((g) => g.id === 'cao-cao')!.ep);
    });

    suite.test('登場句：袁氏四世三公，非名門沒有句子', () => {
        assert.equals('四世三公之後，天生帶有名門因子！', famousClanLines([{ id: 'yuan-shu' }])[0]);
        assert.lengthEquals(0, famousClanLines([{ id: 'zhao-yun' }]));
    });

    return suite;
}
