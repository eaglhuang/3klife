/**
 * RivalAiDiplomacy.test.ts — 他國 AI 外交決策與邦交事件變動（E-5，PROG-2-1476）
 */
import {
    aiDiplomacyIntents, applyRelationEvent, giftRelationGain,
    type DiplomacyOther, type DiplomacySelf, type StrongestNation,
} from '../assets/scripts/core/systems/RivalAiDiplomacy';
import { TestSuite, assert } from './TestRunner';

const OTHER: DiplomacyOther = { id: 'wu', troops: 2000, food: 5000 };
const NOBODY_STRONG: StrongestNation = { id: 'me', troops: 3000, isSelf: true };

function kinds(intents: ReadonlyArray<{ kind: string }>): string {
    return intents.map(i => i.kind).join(',');
}

export function createRivalAiDiplomacySuite(): TestSuite {
    const suite = new TestSuite('RivalAiDiplomacy (他國 AI 外交決策 E-5 PROG-2-1476)');

    suite.test('邦交事件變動並夾在 -100~100', () => {
        assert.equals(40, applyRelationEvent(10, 'ALLIANCE'));
        assert.equals(-100, applyRelationEvent(-40, 'BETRAY_ALLIANCE'));
        assert.equals(100, applyRelationEvent(98, 'TRADE'));
        assert.equals(-35, applyRelationEvent(-5, 'INVADE'));
    });

    suite.test('送禮依價值 +10~+30', () => {
        assert.equals(10, giftRelationGain(500));
        assert.equals(20, giftRelationGain(2000));
        assert.equals(30, giftRelationGain(9000));
    });

    suite.test('DIPLOMAT 邦交 > 30 未結盟時擲骰結盟', () => {
        const self: DiplomacySelf = { profile: 'DIPLOMAT', troops: 3000, gold: 1000 };
        assert.equals('PROPOSE_ALLIANCE', kinds(aiDiplomacyIntents(self, OTHER, { value: 31, allied: false }, NOBODY_STRONG, () => 0.29)));
        assert.equals('', kinds(aiDiplomacyIntents(self, OTHER, { value: 31, allied: false }, NOBODY_STRONG, () => 0.3)));
        assert.equals('', kinds(aiDiplomacyIntents(self, OTHER, { value: 30, allied: false }, NOBODY_STRONG, () => 0)));
    });

    suite.test('金多且對方缺糧時提議以金換糧', () => {
        const self: DiplomacySelf = { profile: 'GUARDIAN', troops: 3000, gold: 3001 };
        const hungry = { ...OTHER, food: 2999 };
        assert.equals('PROPOSE_TRADE', kinds(aiDiplomacyIntents(self, hungry, { value: 1, allied: false }, NOBODY_STRONG, () => 0)));
        assert.equals('', kinds(aiDiplomacyIntents(self, hungry, { value: 0, allied: false }, NOBODY_STRONG, () => 0)));
    });

    suite.test('WARLORD 背叛兵力不到一半的盟友', () => {
        const self: DiplomacySelf = { profile: 'WARLORD', troops: 5000, gold: 0 };
        const weak = { ...OTHER, troops: 2499 };
        assert.equals('BETRAY_ALLIANCE', kinds(aiDiplomacyIntents(self, weak, { value: 80, allied: true }, NOBODY_STRONG, () => 0.39)));
        assert.equals('', kinds(aiDiplomacyIntents(self, { ...OTHER, troops: 2500 }, { value: 80, allied: true }, NOBODY_STRONG, () => 0)));
    });

    suite.test('強國兵力超過自己兩倍時向他國提議反霸權同盟', () => {
        const self: DiplomacySelf = { profile: 'GUARDIAN', troops: 2000, gold: 0 };
        const hegemon: StrongestNation = { id: 'wei', troops: 4001, isSelf: false };
        assert.equals('PROPOSE_ANTI_HEGEMONY', kinds(aiDiplomacyIntents(self, OTHER, { value: -19, allied: false }, hegemon, () => 0)));
        assert.equals('', kinds(aiDiplomacyIntents(self, OTHER, { value: -20, allied: false }, hegemon, () => 0)));
        assert.equals('', kinds(aiDiplomacyIntents(self, { ...OTHER, id: 'wei' }, { value: 0, allied: false }, hegemon, () => 0)));
    });

    return suite;
}
