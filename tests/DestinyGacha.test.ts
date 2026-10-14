import { assert, TestSuite } from './TestRunner';
import {
    confirmDestinyGacha,
    createDestinyGachaState,
    DestinyGachaOptions,
    optionsFromGachaConfig,
    resetDestinyGacha,
    rollDestinyGacha,
    selectDestinyGacha,
} from '../assets/scripts/core/systems/DestinyGacha';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';

const POOL = ['zhangfei', 'weiyan', 'xiahoudun', 'zhanghe', 'sunce', 'ganning', 'a', 'b', 'c', 'd', 'e', 'f'];
const OPTIONS: DestinyGachaOptions = { resetEnabled: true, firstPickOnly: true, confirmRequired: true, pickCount: 10 };

/** 每次回傳固定值的隨機源，讓結果可重現。 */
function seqRandom(values: number[]): () => number {
    let i = 0;
    return () => values[(i++) % values.length];
}

export function createDestinyGachaSuite(): TestSuite {
    const suite = new TestSuite('DestinyGacha (OPEN-05 宿命轉蛋)');

    suite.test('十連抽：抽出 10 個不重複的 id，進入 rolled', () => {
        const result = rollDestinyGacha(createDestinyGachaState(), POOL, OPTIONS, seqRandom([0.1, 0.5, 0.9]));
        assert.equals(true, result.ok);
        assert.equals('rolled', result.state.phase);
        assert.equals(10, result.state.rolled.length);
        assert.equals(10, new Set(result.state.rolled).size);
    });

    suite.test('firstPickOnly 為 false 時十連可重複；池子不足抽數則拒絕', () => {
        const withReplace = rollDestinyGacha(createDestinyGachaState(), ['only'], { ...OPTIONS, firstPickOnly: false }, seqRandom([0]));
        assert.equals(true, withReplace.ok);
        assert.equals(10, withReplace.state.rolled.length);
        const small = rollDestinyGacha(createDestinyGachaState(), ['x', 'y'], OPTIONS, seqRandom([0]));
        assert.equals('pool-too-small', small.reason!);
    });

    suite.test('免費無限重置：重置後回初始狀態，次數累加、不扣費', () => {
        let state = createDestinyGachaState();
        for (let i = 0; i < 5; i++) {
            state = rollDestinyGacha(state, POOL, OPTIONS, seqRandom([0.2])).state;
            const reset = resetDestinyGacha(state, OPTIONS);
            assert.equals(true, reset.ok);
            state = reset.state;
        }
        assert.equals('idle', state.phase);
        assert.equals(0, state.rolled.length);
        assert.equals(5, state.resets);
    });

    suite.test('重置停用時拒絕，狀態不變', () => {
        const rolled = rollDestinyGacha(createDestinyGachaState(), POOL, OPTIONS, seqRandom([0.2])).state;
        const result = resetDestinyGacha(rolled, { ...OPTIONS, resetEnabled: false });
        assert.equals('reset-disabled', result.reason!);
        assert.equals('rolled', result.state.phase);
    });

    suite.test('需要確認時：未抽不可選；選定後需確認才鎖定；鎖定後拒絕再抽與重置', () => {
        const idle = createDestinyGachaState();
        assert.equals('not-rolled', selectDestinyGacha(idle, 'zhangfei', OPTIONS).reason!);

        const rolled = rollDestinyGacha(idle, POOL, OPTIONS, seqRandom([0])).state;
        const pick = rolled.rolled[0];
        assert.equals('not-in-roll', selectDestinyGacha(rolled, 'nobody', OPTIONS).reason!);
        const selected = selectDestinyGacha(rolled, pick, OPTIONS).state;
        assert.equals('rolled', selected.phase);
        assert.equals(pick, selected.selected!);
        assert.equals('not-selected', confirmDestinyGacha(rolled).reason!);

        const locked = confirmDestinyGacha(selected).state;
        assert.equals('locked', locked.phase);
        assert.equals(pick, locked.locked!);
        assert.equals('locked', rollDestinyGacha(locked, POOL, OPTIONS, seqRandom([0])).reason!);
        assert.equals('locked', resetDestinyGacha(locked, OPTIONS).reason!);
    });

    suite.test('不需確認時選定即鎖定；重抽前須重置', () => {
        const options = { ...OPTIONS, confirmRequired: false };
        const rolled = rollDestinyGacha(createDestinyGachaState(), POOL, options, seqRandom([0])).state;
        const locked = selectDestinyGacha(rolled, rolled.rolled[0], options).state;
        assert.equals('locked', locked.phase);
        assert.equals(rolled.rolled[0], locked.locked!);
        assert.equals('already-rolled', rollDestinyGacha(rolled, POOL, options, seqRandom([0])).reason!);
    });

    suite.test('從 GachaConfig 讀取規則；輸入狀態不被改動', () => {
        const config = {
            poolId: 'hero-pool', poolName: '名將池', poolType: 'hero', resetEnabled: true, guaranteeRarity: 'epic',
            guaranteeThreshold: 10, pickCount: 10, candidateIds: POOL, firstPickOnly: true, confirmRequired: true,
        } as GachaConfig;
        const options = optionsFromGachaConfig(config);
        assert.equals(true, options.resetEnabled && options.firstPickOnly && options.confirmRequired);
        assert.equals(10, options.pickCount);

        const before = createDestinyGachaState();
        const frozen = JSON.stringify(before);
        rollDestinyGacha(before, POOL, options, seqRandom([0.3]));
        assert.equals(frozen, JSON.stringify(before));
    });

    return suite;
}
