import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { clanFounderOf, clanHallLine, clanHallNameOf, normalizeClanHall } from '../assets/scripts/core/systems/ClanHall';
import { clanHighGateLine } from '../assets/scripts/core/systems/ClanTier';
import { clanTitleText } from '../assets/scripts/core/systems/ClanTradition';

const general = (id: string, name: string, ep: number, extra: Record<string, unknown> = {}): GeneralConfig => ({ id, name, ep, ...extra } as unknown as GeneralConfig);

export function createClanHallSuite(): TestSuite {
    const suite = new TestSuite('ClanHall');

    suite.test('開基祖是往下傳最多代的人，不是 EP 最高的人', () => {
        const roster = [
            general('star', '呂高', 99),
            general('root', '曹祖', 50, { originRegion: '沛郡' }),
            general('kid', '曹子', 60, { fatherId: 'root' }),
            general('grand', '曹孫', 70, { fatherId: 'kid' }),
        ];
        assert.equals('root', clanFounderOf(roster)?.id ?? '');
        assert.equals('沛郡曹氏', clanHallNameOf(roster) ?? '');
    });

    suite.test('同代數比 EP；複姓算一個姓；名冊順序不影響結果', () => {
        const roster = [general('a', '諸葛甲', 50, { originRegion: '琅邪' }), general('b', '諸葛乙', 80, { originRegion: '琅邪' })];
        assert.equals('b', clanFounderOf(roster)?.id ?? '');
        assert.equals('b', clanFounderOf([...roster].reverse())?.id ?? '');
        assert.equals('琅邪諸葛氏', clanHallNameOf(roster) ?? '');
    });

    suite.test('沒有 originRegion 時從生平判斷州名；空名冊沒有堂號', () => {
        const hall = clanHallNameOf([general('a', '趙雲', 80, { historicalAnecdote: '徐州人氏，少有勇名。' })]) ?? '';
        assert.equals('徐州趙氏', hall);
        assert.equals(null, clanHallNameOf([]));
    });

    suite.test('父母資料成環也不會當掉', () => {
        const roster = [general('a', '王甲', 10, { fatherId: 'b' }), general('b', '王乙', 20, { fatherId: 'a' })];
        assert.isTrue(clanFounderOf(roster) !== null);
    });

    suite.test('壞存檔回 null；標題與高門句有堂號才顯示', () => {
        assert.equals(null, normalizeClanHall(123));
        assert.equals(null, normalizeClanHall(''));
        assert.equals('沛郡曹氏', normalizeClanHall('沛郡曹氏') ?? '');
        assert.equals('郡望世家・沛郡曹氏', clanTitleText('郡望世家', null, '沛郡曹氏'));
        assert.equals('郡望世家', clanTitleText('郡望世家', null));
        assert.isTrue(clanHighGateLine('沛郡曹氏').indexOf('【天下高門・沛郡曹氏】') >= 0);
        assert.isTrue(clanHighGateLine(null).indexOf('【天下高門】') >= 0);
        assert.isTrue(clanHallLine('沛郡曹氏').indexOf('【沛郡曹氏】') >= 0);
    });

    return suite;
}
