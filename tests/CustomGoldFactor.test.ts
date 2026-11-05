import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore, GAME_SESSION_EVENTS, type CustomGoldFactorBornPayload } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { customGoldBornLine, customGoldGeneOf, forgeCustomGold, mergeCustomFactors, normalizeCustomFactors } from '../assets/scripts/core/systems/CustomGoldFactor';
import { inheritFactors, toGeneConfigs, type FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import { buildRetireReviewTexts } from '../assets/scripts/ui/core/RetireReviewController';

const heir = (extra: Record<string, unknown> = {}) => ({
    id: 'heir', name: '趙統', age: 70, ep: 90, fatherId: 'zhao-yun',
    genes: [{ id: 'gene_spear', type: '戰鬥', level: 4 }, { id: 'gene_luck', type: '天命', level: 5 }],
    ...extra,
}) as unknown as GeneralConfig;

function build(roster: GeneralConfig[], tier = 3) {
    const save = new PlayerSaveService(new MemoryStorageAdapter());
    const s = new GameSession(7);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(save);
    s.setAutoSave(false);
    (s as unknown as { _clanTier: number })._clanTier = tier;
    const born: CustomGoldFactorBornPayload[] = [];
    s.setEventEmitter({ emit: (name: string, payload?: unknown) => { if (name === GAME_SESSION_EVENTS.CustomGoldFactorBorn) born.push(payload as CustomGoldFactorBornPayload); } });
    return { s, save, born };
}

export function createCustomGoldFactorSuite(): TestSuite {
    const suite = new TestSuite('CustomGoldFactor');

    suite.test('全部達標才凝練；每個條件剛好差一點都不行', () => {
        assert.isTrue(forgeCustomGold(heir(), undefined, 3) !== null);
        assert.equals(null, forgeCustomGold(heir(), undefined, 2));
        assert.equals(null, forgeCustomGold(heir({ ep: 84 }), undefined, 3));
        assert.equals(null, forgeCustomGold(heir({ fatherId: undefined }), undefined, 3));
        assert.equals(null, forgeCustomGold(heir({ genes: [{ id: 'gene_spear', type: '戰鬥', level: 3 }, { id: 'gene_luck', type: '天命', level: 5 }] }), undefined, 3), '非藍因子的星級不算');
    });

    suite.test('因子沿用主藍因子星級，不會重複凝練', () => {
        const forged = forgeCustomGold(heir(), undefined, 3)!;
        const gene = customGoldGeneOf(forged.general)!;
        assert.equals('趙統家學', gene.displayName);
        assert.equals(4, gene.level);
        assert.equals(null, forgeCustomGold(forged.general, undefined, 3));
    });

    suite.test('退役時凝練：寫進教官卡、發事件、併入字典，舊字典不被改動', async () => {
        const base: FactorDictionary = new Map();
        const { s, born } = build([heir()]);
        s.setFactorDictionary(base);
        const card = await s.retireGeneral('heir');
        assert.isTrue(card.gene_refs.includes('gold_clan_heir'));
        assert.equals(1, born.length);
        assert.equals('趙統家學', born[0].factorName);
        assert.equals('趙統家學', s.factorDictionary!.get('gold_clan_heir')!.displayName);
        assert.equals(0, base.size);
    });

    suite.test('門第不足退役不凝練', async () => {
        const { s, born } = build([heir()], 2);
        await s.retireGeneral('heir');
        assert.equals(0, born.length);
        assert.equals(null, customGoldGeneOf(s.roster.find((g) => g.id === 'heir')));
    });

    suite.test('存讀檔後字典還在，子孫遺傳的因子保有名字', async () => {
        const { s, save } = build([heir()]);
        await s.retireGeneral('heir');
        await s.save();
        const next = new GameSession(7);
        next.setRosterStore(new InMemoryRosterStore([]));
        next.setSaveService(save);
        await next.load();
        const dictionary = next.factorDictionary;
        assert.equals('趙統家學', dictionary?.get('gold_clan_heir')?.displayName);
        const factors = inheritFactors([{ uid: 'heir', generation: 1, factorIds: ['gold_clan_heir'] }], { random: () => 0, dictionary });
        assert.equals('趙統家學', toGeneConfigs(factors, dictionary)[0].displayName);
    });

    suite.test('存檔壞資料略過；沒有自創因子時回傳原字典', () => {
        assert.lengthEquals(0, normalizeCustomFactors('x'));
        assert.lengthEquals(1, normalizeCustomFactors([null, { id: 'gene_x' }, { id: 'gold_clan_a', displayName: 'A' }]));
        const base: FactorDictionary = new Map();
        assert.isTrue(mergeCustomFactors(base, []) === base);
    });

    suite.test('提示句與退役回顧帶實際名字和 EP', () => {
        assert.equals('【開創家學】趙統 憑藉彪炳功業（EP 90）與極境天賦，為家族凝練出傳世金因子：【趙統家學】！', customGoldBornLine('趙統', 90, '趙統家學'));
        const forged = forgeCustomGold(heir(), undefined, 3)!;
        assert.equals('「老夫畢生征戰治國之所得（EP 90），今盡數凝練為我族傳世絕學——【趙統家學】！\n凡我後世子孫，當謹守勿失！」', buildRetireReviewTexts(forged.general).retireFarewell);
    });

    return suite;
}
