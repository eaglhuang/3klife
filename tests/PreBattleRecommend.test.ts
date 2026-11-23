import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import {
    PREBATTLE_REASON_KEYS,
    parsePreBattleWeights,
    recommendForEncounter,
    recommendPreBattleLoadout,
    type PreBattleCommanderCandidate,
    type PreBattleRosterInput,
    type PreBattleTallyCandidate,
    type PreBattleWeights,
} from '../assets/scripts/core/systems/PreBattleRecommend';

function loadWeights(): PreBattleWeights {
    const file = path.resolve(__dirname, '../assets/resources/data/prebattle-recommend-weights.json');
    return parsePreBattleWeights(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function general(id: string, stats: Partial<Omit<PreBattleCommanderCandidate, 'id'>> = {}): PreBattleCommanderCandidate {
    return { id, str: 50, int: 50, lea: 50, pol: 50, ...stats };
}

function tally(cardId: string, unitType: string, rarity: string): PreBattleTallyCandidate {
    return { cardId, unitType, rarity };
}

function emptyRoster(): PreBattleRosterInput {
    return { commanders: [], strategists: [], deputies: [], tallies: [] };
}

export function createPreBattleRecommendSuite(): TestSuite {
    const suite = new TestSuite('PreBattleRecommend (戰前一鍵推薦編制 PROG-2-9910)');

    suite.test('同輸入兩次呼叫結果完全相同（決定論）', () => {
        const roster: PreBattleRosterInput = {
            commanders: [general('b', { str: 60 }), general('a', { str: 60 })],
            strategists: [general('s1', { int: 70 }), general('s2', { int: 70 })],
            deputies: [general('d1', { lea: 70 })],
            tallies: [tally('t2', 'cavalry', 'rare'), tally('t1', 'archer', 'rare')],
        };
        const w = loadWeights();
        assert.equals(JSON.stringify(recommendPreBattleLoadout(roster, w)), JSON.stringify(recommendPreBattleLoadout(roster, w)));
    });

    suite.test('主將取 LEA×0.6 + STR×0.4 綜合最高', () => {
        const roster = emptyRoster();
        roster.commanders = [general('high-str', { str: 90, lea: 40 }), general('high-lea', { str: 40, lea: 90 })];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals('high-lea', rec.commander!.id);
        assert.equals(PREBATTLE_REASON_KEYS.commanderStatBlend, rec.commander!.reasonKey);
    });

    suite.test('同分時依 id 字典序取第一個（tie-break 固定）', () => {
        const roster = emptyRoster();
        roster.commanders = [general('zeta'), general('alpha')];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals('alpha', rec.commander!.id);
    });

    suite.test('參謀官取 INT×0.7 + POL×0.5 最高', () => {
        const roster = emptyRoster();
        roster.commanders = [general('lord')];
        roster.strategists = [general('pol-heavy', { int: 40, pol: 90 }), general('int-heavy', { int: 90, pol: 20 })];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals('int-heavy', rec.strategist!.id);
        assert.equals(PREBATTLE_REASON_KEYS.strategistIntPol, rec.strategist!.reasonKey);
    });

    suite.test('後勤官（副將）取 LEA×1.0 + POL×0.6 最高', () => {
        const roster = emptyRoster();
        roster.commanders = [general('lord')];
        roster.deputies = [general('pol-only', { lea: 20, pol: 90 }), general('lea-only', { lea: 80, pol: 20 })];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals('lea-only', rec.deputy!.id);
        assert.equals(PREBATTLE_REASON_KEYS.deputyLeaPol, rec.deputy!.reasonKey);
    });

    suite.test('參謀官與後勤官不會與主將重複，且同血統不同場', () => {
        const roster = emptyRoster();
        roster.commanders = [general('lord', { str: 99, lea: 99, bloodlineId: 'bl-1' })];
        roster.strategists = [general('lord-twin', { int: 99, pol: 99, bloodlineId: 'bl-1' }), general('advisor', { int: 10, pol: 10 })];
        roster.deputies = [general('advisor', { lea: 99 }), general('quartermaster', { lea: 10 })];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals('advisor', rec.strategist!.id);
        assert.equals('quartermaster', rec.deputy!.id);
    });

    suite.test('卡組依稀有度貪婪選取，兵種不重複時加分', () => {
        const roster = emptyRoster();
        roster.tallies = [
            tally('A', 'cavalry', 'epic'),
            tally('B', 'cavalry', 'epic'),
            tally('C', 'archer', 'epic'),
            tally('D', 'infantry', 'rare'),
        ];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals('A,C,D,B', rec.tallyCards.map((t) => t.cardId).join(','));
        assert.equals(0, rec.tallyShortfall);
        assert.equals(PREBATTLE_REASON_KEYS.tallyRarityDiversity, rec.tallyCards[0].reasonKey);
    });

    suite.test('卡組重複的 cardId 只計一次', () => {
        const roster = emptyRoster();
        roster.tallies = [tally('A', 'cavalry', 'rare'), tally('A', 'cavalry', 'rare')];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals(1, rec.tallyCards.length);
        assert.equals(3, rec.tallyShortfall);
    });

    suite.test('空候選：無主將、無參謀、無後勤、無卡組，皆有 issue 且不拋錯', () => {
        const rec = recommendPreBattleLoadout(emptyRoster(), loadWeights());
        assert.equals(true, rec.commander === null);
        assert.equals(true, rec.strategist === null);
        assert.equals(true, rec.deputy === null);
        assert.equals(0, rec.tallyCards.length);
        assert.equals(4, rec.tallyShortfall);
        assert.contains(rec.issues.join(','), 'NO_COMMANDER');
        assert.contains(rec.issues.join(','), 'TALLY_SHORTAGE');
    });

    suite.test('候選不足：卡組只有 2 張時 shortfall 為 2，後勤缺額標記 NO_DEPUTY', () => {
        const roster = emptyRoster();
        roster.commanders = [general('lord')];
        roster.tallies = [tally('A', 'cavalry', 'rare'), tally('B', 'archer', 'rare')];
        const rec = recommendPreBattleLoadout(roster, loadWeights());
        assert.equals(2, rec.tallyCards.length);
        assert.equals(2, rec.tallyShortfall);
        assert.contains(rec.issues.join(','), 'TALLY_SHORTAGE');
        assert.contains(rec.issues.join(','), 'NO_DEPUTY');
        assert.contains(rec.issues.join(','), 'NO_STRATEGIST');
    });

    suite.test('首戰 encounter-001 預填：主將固定 zhang-fei，不派參謀與後勤', () => {
        const roster = emptyRoster();
        roster.commanders = [general('lu-bu', { str: 99, lea: 99 }), general('zhang-fei', { str: 70, lea: 70 })];
        roster.strategists = [general('advisor', { int: 80 })];
        roster.deputies = [general('quartermaster', { lea: 80 })];
        roster.tallies = [tally('A', 'cavalry', 'rare'), tally('B', 'archer', 'rare'), tally('C', 'infantry', 'rare'), tally('D', 'shield', 'rare')];
        const encounters = [{ id: 'encounter-001', playerGeneralId: 'zhang-fei' }];
        const rec = recommendForEncounter('encounter-001', roster, encounters, loadWeights());
        assert.equals('zhang-fei', rec.commander!.id);
        assert.equals(PREBATTLE_REASON_KEYS.commanderEncounterFixed, rec.commander!.reasonKey);
        assert.equals(true, rec.strategist === null);
        assert.equals(true, rec.deputy === null);
        assert.equals(4, rec.tallyCards.length);
        assert.equals(false, rec.issues.includes('NO_STRATEGIST'));
    });

    suite.test('首戰指定主將不在候選內 → ENCOUNTER_LEAD_UNAVAILABLE 並退回一般推薦', () => {
        const roster = emptyRoster();
        roster.commanders = [general('lu-bu', { str: 99, lea: 99 })];
        const encounters = [{ id: 'encounter-001', playerGeneralId: 'zhang-fei' }];
        const rec = recommendForEncounter('encounter-001', roster, encounters, loadWeights());
        assert.equals('lu-bu', rec.commander!.id);
        assert.contains(rec.issues.join(','), 'ENCOUNTER_LEAD_UNAVAILABLE');
    });

    suite.test('未知關卡 id → UNKNOWN_ENCOUNTER，仍回傳一般推薦', () => {
        const roster = emptyRoster();
        roster.commanders = [general('lord')];
        const rec = recommendForEncounter('no-such-encounter', roster, [], loadWeights());
        assert.equals('lord', rec.commander!.id);
        assert.equals('UNKNOWN_ENCOUNTER', rec.issues[0]);
    });

    suite.test('權重 JSON 缺欄位或型別錯誤時拋錯，不靜默使用錯數值', () => {
        const good = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/prebattle-recommend-weights.json'), 'utf8'));
        assert.throws(() => parsePreBattleWeights({ ...good, commander: undefined }));
        assert.throws(() => parsePreBattleWeights({ ...good, tally: { ...good.tally, deckSize: 0 } }));
        assert.throws(() => parsePreBattleWeights({ ...good, strategist: { int: 'x', pol: 0.5 } }));
    });

    suite.test('理由文案 key 在四語系檔皆存在', () => {
        const keys = [
            ...Object.values(PREBATTLE_REASON_KEYS),
            'prebattle.role.commander',
            'prebattle.role.strategist',
            'prebattle.role.deputy',
        ];
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../assets/resources/i18n/${lang}.json`), 'utf8'));
            for (const key of keys) {
                assert.isTrue(typeof dict[key] === 'string' && dict[key].length > 0, `${lang} 缺少 ${key}`);
            }
        }
    });

    return suite;
}
