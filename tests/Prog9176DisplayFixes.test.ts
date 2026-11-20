/**
 * Prog9176DisplayFixes.test.ts — PROG-2-9176 線上試玩回報的顯示錯誤修正
 * 子嗣適性補齊、因子與狀態中文名、結緣文案、召喚券共用來源、季報持有量、官職條件提示。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { backfillRosterChildAptitudes, inheritChildAptitudes } from '../assets/scripts/core/systems/ChildAptitudeInheritance';
import { factorLabelOf, isRawFactorId, readableFactorName } from '../assets/scripts/core/systems/FactorDisplayName';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import { STATUS_DISPLAY, formatStatus } from '../assets/scripts/ui/components/general-detail/GeneralDetailFormatters';
import { BREED_TEXT_FALLBACK_ZH_TW, fillBreedText } from '../assets/scripts/ui/core/BreedingTexts';
import { GACHA_NODES } from '../assets/scripts/ui/core/GachaScreenNodes';
import { gachaWalletLabelTexts } from '../assets/scripts/ui/core/GachaApiTexts';
import { CITY_ENCOUNTERS, encounterStockLine } from '../assets/scripts/core/systems/SeasonChronicle';
import { seasonChronicleView } from '../assets/scripts/ui/core/SeasonChroniclePopupController';
import { expRequiredForTier, installOfficerFeatureUnlocks, lobbyActionLock, lockedActionToast, resetOfficerFeatureUnlocks } from '../assets/scripts/core/systems/OfficerFeatureUnlocks';

interface Kid { id: string; fatherId?: string; motherId?: string; troopAptitude?: Record<string, string>; terrainAptitude?: Record<string, string>; weatherAptitude?: Record<string, string> }

export function createProg9176DisplayFixesSuite(): TestSuite {
    const suite = new TestSuite('PROG-2-9176 顯示錯誤修正');

    suite.test('舊存檔子嗣沒有兵種適性：讀檔時依繼承規則補齊，且結果可重現', () => {
        const roster: Kid[] = [
            { id: 'dad', troopAptitude: { INFANTRY: 'A', CAVALRY: 'C' } },
            { id: 'mom', troopAptitude: { INFANTRY: 'B', ARCHER: 'A' } },
            { id: 'kid', fatherId: 'dad', motherId: 'mom' },
        ];
        const first = backfillRosterChildAptitudes(roster);
        const second = backfillRosterChildAptitudes(roster);
        const kid = first.find((g) => g.id === 'kid')!;
        const expected = inheritChildAptitudes(roster[0], roster[1]);
        assert.equals(JSON.stringify(expected.troopAptitude), JSON.stringify(kid.troopAptitude));
        assert.equals('B', kid.troopAptitude!.INFANTRY, '父 A 降一階 = B');
        assert.equals(JSON.stringify(kid), JSON.stringify(second.find((g) => g.id === 'kid')), '同一份存檔兩次補齊結果相同');
        assert.isTrue(Object.keys(kid.troopAptitude!).length >= 4, '四個兵種都有適性');
    });

    suite.test('舊存檔補齊：已有適性不覆蓋、非子嗣不動、父母不在名冊也能補、沒變動回傳原陣列', () => {
        const withApt: Kid[] = [{ id: 'k1', fatherId: 'x', troopAptitude: { INFANTRY: 'S' }, terrainAptitude: { plain: 'A' }, weatherAptitude: { sunny: 'A' } }];
        assert.isTrue(backfillRosterChildAptitudes(withApt) === withApt, '沒變動回原陣列');
        const mixed: Kid[] = [{ id: 'adult' }, { id: 'orphan', motherId: 'gone' }];
        const out = backfillRosterChildAptitudes(mixed);
        assert.equals(undefined, out[0].troopAptitude, '沒有父母 id 的武將不動');
        assert.equals(JSON.stringify(inheritChildAptitudes({}, {}).troopAptitude), JSON.stringify(out[1].troopAptitude), '父母不在名冊時以預設親代等級計算');
        assert.equals('C', out[1].troopAptitude!.INFANTRY);
    });

    suite.test('因子顯示名：內部 id 換成字典中文名，查不到就空字串，不露出 gene_honor', () => {
        const dict = buildFactorDictionary([{ id: 'gene_honor', displayName: '義勇', color: 'white' } as never]);
        assert.isTrue(isRawFactorId('gene_honor'));
        assert.isFalse(isRawFactorId('義勇'));
        assert.equals('義勇', readableFactorName('gene_honor', 'gene_honor', dict));
        assert.equals('義勇', readableFactorName('gene_honor', undefined, dict));
        assert.equals('勇烈', readableFactorName('gene_bravery', '勇烈', dict));
        assert.equals('', readableFactorName('gene_honor', 'gene_honor'));
    });

    suite.test('因子畫面名稱：查不到中文名一律「待揭曉之因子」', () => {
        assert.equals('待揭曉之因子', factorLabelOf({ id: 'gene_guard' }));
        assert.equals('待揭曉之因子', factorLabelOf({ id: 'gene_guard', displayName: 'gene_guard' }));
        assert.equals('義勇', factorLabelOf({ id: 'gene_honor', displayName: '義勇' }));
    });

    suite.test('武將狀態 Mystery／Unveiled 顯示中文', () => {
        assert.equals('幼年未開蒙', formatStatus('Mystery'));
        assert.equals('已開蒙', formatStatus('Unveiled'));
        assert.isTrue(!!STATUS_DISPLAY.Mystery && !!STATUS_DISPLAY.Unveiled);
    });

    suite.test('結緣成功文案不再說「X 季後誕下子嗣」（子嗣當下就入冊）', () => {
        const text = fillBreedText(BREED_TEXT_FALLBACK_ZH_TW['ui.breed.preg_status'], ['小喬', '4']);
        assert.isFalse(text.includes('誕下'));
        assert.isTrue(text.includes('襁褓幼子已入宗族名冊'));
        const root = path.join(__dirname, '..', 'assets/resources/i18n');
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(root, `${lang}.json`), 'utf8')) as Record<string, string>;
            assert.isTrue(/\{1\}/.test(table['ui.breed.preg_status']), `${lang} 保留 {1}`);
        }
        const zh = JSON.parse(fs.readFileSync(path.join(root, 'zh-TW.json'), 'utf8')) as Record<string, string>;
        assert.equals(BREED_TEXT_FALLBACK_ZH_TW['ui.breed.preg_status'], zh['ui.breed.preg_status']);
    });

    suite.test('召喚券：「持有 N」與「我的餘額」讀同一份錢包', () => {
        const wallet = { tickets: 11, gems: 1280 };
        const t = gachaWalletLabelTexts(wallet, 'tickets');
        assert.equals('持有 11', t[GACHA_NODES.ticketSummonLabel]);
        assert.equals('召喚券 11', t[GACHA_NODES.balance]);
        const g = gachaWalletLabelTexts(wallet, 'gems');
        assert.equals('持有 11', g[GACHA_NODES.ticketSummonLabel]);
    });

    suite.test('季報奇遇：消耗木材的選項旁顯示持有量', () => {
        const woodEncounter = CITY_ENCOUNTERS.find((e) => e.options.some((o) => (o.effect.costWood ?? 0) > 0))!;
        const line = encounterStockLine(woodEncounter.options, { gold: 120, food: 40, wood: 7 });
        assert.isTrue(line.includes('木材 7'), line);
        assert.isTrue(line.includes('黃金 120'), line);
        const view = seasonChronicleView(
            { season: 1, trend: '', gossip: [], encounterId: woodEncounter.id, encounterChoice: null, read: false } as never,
            '春', null, { page: 0, archived: 0 }, { gold: 120, food: 40, wood: 7 },
        );
        assert.isTrue(view.texts.encounterNote.includes('木材 7'));
        assert.equals('', encounterStockLine([{ effect: {} }, { effect: {} }], { gold: 1, food: 1, wood: 1 }));
    });

    suite.test('官職鎖定提示：寫出條件與目前進度，門檻讀官職規則資料', () => {
        const root = path.join(__dirname, '..', 'assets/resources/data/officer-feature-unlocks.json');
        installOfficerFeatureUnlocks(JSON.parse(fs.readFileSync(root, 'utf8')));
        const lock = lobbyActionLock('supportCard', 1);
        assert.isTrue(lock.locked);
        const need = expRequiredForTier(lock.requiredTier);
        assert.isTrue(need > 0);
        assert.equals(`支援卡要升到「縣府佐官」才開放（需要官職經驗 ${need}，目前 30）`, lockedActionToast('支援卡', lock, 30));
        assert.equals('支援卡要升到「縣府佐官」才開放', lockedActionToast('支援卡', lock));
        resetOfficerFeatureUnlocks();
    });

    return suite;
}
