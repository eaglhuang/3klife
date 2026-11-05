import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { clanTitleText, clanTraditionLine, clanTraditionOf, normalizeClanTradition } from '../assets/scripts/core/systems/ClanTradition';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import { computeStatGain } from '../assets/scripts/core/systems/NurtureSystem';

const person = (id: string, genes: unknown[]) => ({ id, name: id, genes } as unknown as GeneralConfig);
const gene = (id: string, level = 3, type?: string) => ({ id, level, type: type ?? '統率', displayName: id });

export function createClanTraditionSuite(): TestSuite {
    const suite = new TestSuite('ClanTradition');

    suite.test('選持有最多的 3★ 藍因子；2★ 不算', () => {
        const tradition = clanTraditionOf([
            person('a', [gene('g_lea'), gene('g_pol', 3, '內政')]),
            person('b', [gene('g_lea')]),
            person('c', [gene('g_pol', 2, '內政')]),
        ], undefined);
        assert.equals('g_lea', tradition?.factorId);
        assert.equals('lea', tradition?.kind);
    });

    suite.test('同票取 id 最前面；字典分類優先於舊 type', () => {
        const dictionary = buildFactorDictionary([{ id: 'gene_politics', displayName: '治世', color: 'blue', category: 'governance' }]);
        const tradition = clanTraditionOf([person('a', [gene('gene_politics', 4, '戰鬥'), gene('z_other', 4)])], dictionary);
        assert.equals('gene_politics', tradition?.factorId);
        assert.equals('治世', tradition?.displayName);
        assert.equals('pol', tradition?.kind);
    });

    suite.test('對不上五維的因子不會變成家風；沒有因子回傳 null', () => {
        const dictionary = buildFactorDictionary([{ id: 'gene_x', color: 'blue', category: 'unknown' }]);
        assert.equals(null, clanTraditionOf([person('a', [{ id: 'gene_x', level: 5 }])], dictionary));
        assert.equals(null, clanTraditionOf([], undefined));
    });

    suite.test('家風維度修業效率 +10%，其他維度不變', () => {
        const session = { mentors: [], mentorSlots: {}, growthModifier: 1, clanTraditionKind: 'lea' as const };
        assert.equals(22, computeStatGain(session, 'lea', 20).gain);
        assert.equals(20, computeStatGain(session, 'str', 20).gain);
        assert.equals(20, computeStatGain({ ...session, clanTraditionKind: undefined }, 'lea', 20).gain);
    });

    suite.test('升上郡望世家才定家風、只定一次，存讀檔還在', async () => {
        const roster = [person('a', [gene('g_lea')]), person('b', [gene('g_lea')]), person('c', [gene('g_lea')])];
        const save = new PlayerSaveService(new MemoryStorageAdapter());
        const s = new GameSession(7);
        const store = new InMemoryRosterStore(roster);
        s.setRosterStore(store);
        s.setSaveService(save);
        s.setAutoSave(false);
        const internal = s as unknown as { _clanTier: number; _refreshClanTier(): Promise<unknown> };
        internal._clanTier = 1;
        await internal._refreshClanTier();
        assert.equals(null, s.clanTradition);
        internal._clanTier = 2;
        await internal._refreshClanTier();
        assert.equals('g_lea', s.clanTradition?.factorId);
        store.replaceAll([person('a', [gene('g_other', 5, '內政')])]);
        await internal._refreshClanTier();
        assert.equals('g_lea', s.clanTradition?.factorId);
        await s.save();
        const next = new GameSession(7);
        next.setRosterStore(new InMemoryRosterStore([]));
        next.setSaveService(save);
        await next.load();
        assert.equals('lea', next.clanTradition?.kind);
    });

    suite.test('壞存檔回傳 null；文字帶實際內容', () => {
        assert.equals(null, normalizeClanTradition({ factorId: 'x', kind: 'nope' }));
        assert.equals(null, normalizeClanTradition(undefined));
        const tradition = { factorId: 'g', displayName: '統御', kind: 'lea' as const };
        assert.equals('郡望家風確立：【統御】，族人統率修業 +10%！', clanTraditionLine(tradition));
        assert.equals('郡望世家｜家風：統御', clanTitleText('郡望世家', tradition));
        assert.equals('布衣寒門', clanTitleText('布衣寒門', null));
    });

    return suite;
}
