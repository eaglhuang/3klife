/**
 * SingleExecute.test.ts — 奧義敵將定點傷害（SYS-SKILL-ULT-0005）
 */
import { TestSuite, assert } from './TestRunner';
import {
    SINGLE_EXECUTE_PARAMS,
    critOnHit,
    resolveExecute,
    selectSingleTarget,
    singleDrainShield,
    singleExecuteNoticeText,
    singleHealOnKill,
    singleMarkMultiplier,
    singlePureDamage,
    type SingleTargetCandidate,
} from '../assets/scripts/battle/shared/SingleExecute';

function c(id: string, currentHp: number, attack = 10, maxHp = 1000, dead = false): SingleTargetCandidate {
    return { id, currentHp, maxHp, attack, isDead: () => dead };
}

export function createSingleExecuteSuite(): TestSuite {
    const suite = new TestSuite('SingleExecute (奧義敵將定點傷害 SYS-SKILL-ULT-0005)');

    suite.test('一般高傷／斬殺成功／斬殺失敗', () => {
        const lu = SINGLE_EXECUTE_PARAMS['ult-lu-bu-5'];
        assert.equals(800, singlePureDamage(lu, 1000));
        const plain = resolveExecute(SINGLE_EXECUTE_PARAMS['ult-lu-bu-2'], 1000, 1000, 300);
        assert.equals('300,false,false', [plain.damage, plain.executed, plain.killed].join(','));
        const ok = resolveExecute(lu, 900, 1000, 800);
        assert.equals('900,true,true', [ok.damage, ok.executed, ok.killed].join(','));
        const miss = resolveExecute(lu, 1000, 1000, 800);
        assert.equals('800,false,false', [miss.damage, miss.executed, miss.killed].join(','));
    });

    suite.test('目標鎖定：鎖定目標存活不換，死亡才依規則換', () => {
        const units = [c('b', 500), c('a', 200), c('x', 100, 10, 1000, true)];
        assert.equals('b', selectSingleTarget(units, 'lowest-hp-ratio', 'b')!.id);
        assert.equals('a', selectSingleTarget(units, 'lowest-hp-ratio', 'x')!.id);
        assert.equals('b', selectSingleTarget([c('a', 1, 5), c('b', 1, 50)], 'highest-attack')!.id);
        assert.equals(null, selectSingleTarget([], 'lowest-hp-ratio'));
    });

    suite.test('標記增傷與逐擊暴擊', () => {
        const sima = SINGLE_EXECUTE_PARAMS['ult-sima-yi-1'];
        assert.equals(1.35, singleMarkMultiplier(sima, true));
        assert.equals(1, singleMarkMultiplier(sima, false));
        assert.isTrue(critOnHit('ult-lu-bu-2', SINGLE_EXECUTE_PARAMS['ult-lu-bu-2'], 0));
        const cz = SINGLE_EXECUTE_PARAMS['ult-cao-zhi-4'];
        assert.equals('false,true', [critOnHit('ult-cao-zhi-4', cz, 0), critOnHit('ult-cao-zhi-4', cz, 1)].join(','));
    });

    suite.test('擊殺回血與吸攻護盾', () => {
        assert.equals(150, singleHealOnKill(SINGLE_EXECUTE_PARAMS['ult-zhao-yun-3'], 1000, 3));
        assert.equals(30, singleDrainShield(SINGLE_EXECUTE_PARAMS['ult-diao-chan-4'], 100));
    });

    suite.test('戰報三分支', () => {
        const base = { faction: 'player', ultimateId: 'ult-lu-bu-5', targetName: '曹操', damage: 800 };
        assert.equals('我方斬殺 曹操！', singleExecuteNoticeText({ ...base, executed: true, killed: true }, true));
        assert.equals('敵方重創擊破 曹操（800）', singleExecuteNoticeText({ ...base, executed: false, killed: true }, false));
        assert.equals('我方重創 曹操（800），未達斬殺線', singleExecuteNoticeText({ ...base, executed: false, killed: false }, true));
    });

    return suite;
}
