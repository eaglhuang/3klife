import { assert, TestSuite } from './TestRunner';
import type { OpeningFlowConfig } from '../assets/scripts/core/config/OpeningFlowConfig';
import { OpeningFlowController } from '../assets/scripts/core/systems/OpeningFlowController';
import { createDestinyGachaState, DestinyGachaOptions, confirmDestinyGacha, resetDestinyGacha, rollDestinyGacha, selectDestinyGacha } from '../assets/scripts/core/systems/DestinyGacha';
import { destinyLockedEvent, destinyOpeningPhase } from '../assets/scripts/core/systems/DestinyOpening';

const POOL = ['zhang-fei', 'wei-yan', 'xiahou-dun', 'zhang-he', 'sun-ce', 'gan-ning', 'a', 'b', 'c', 'd'];
const OPTIONS: DestinyGachaOptions = { resetEnabled: true, firstPickOnly: true, confirmRequired: true, pickCount: 10 };

function seqRandom(values: number[]): () => number {
    let i = 0;
    return () => values[(i++) % values.length];
}

function openingConfig(): OpeningFlowConfig {
    return {
        phases: [
            {
                id: 'intro',
                enterWhen: (e) => e.type === 'start',
                leaveWhen: (e) => e.type === 'intro-done',
            },
            destinyOpeningPhase('destiny', 'intro-done'),
        ],
    };
}

export function createDestinyOpeningSuite(): TestSuite {
    const suite = new TestSuite('DestinyOpening (OPEN-05 接 OPEN-01 開場流程)');

    suite.test('未鎖定時不產生離開事件；鎖定後才產生', () => {
        const idle = createDestinyGachaState();
        assert.equals(null, destinyLockedEvent(idle));
        const rolled = rollDestinyGacha(idle, POOL, OPTIONS, seqRandom([0.2])).state;
        assert.equals(null, destinyLockedEvent(rolled));
        const selected = selectDestinyGacha(rolled, rolled.rolled[0], OPTIONS).state;
        assert.equals(null, destinyLockedEvent(selected));
        const locked = confirmDestinyGacha(selected).state;
        assert.equals('destiny-locked', destinyLockedEvent(locked)!.type);
    });

    suite.test('開場流程：進入宿命轉蛋幕，重置不離開，確認鎖定後離開並結束', () => {
        const flow = new OpeningFlowController(openingConfig());
        assert.equals('intro', flow.start()!.id);
        assert.equals('destiny', flow.advance({ type: 'intro-done' })!.id);

        let state = createDestinyGachaState();
        state = rollDestinyGacha(state, POOL, OPTIONS, seqRandom([0.2])).state;
        state = resetDestinyGacha(state, OPTIONS).state;
        const afterReset = destinyLockedEvent(state);
        if (afterReset) flow.advance(afterReset);
        assert.equals('destiny', flow.current()!.id, '重置後仍停在宿命轉蛋幕');

        state = rollDestinyGacha(state, POOL, OPTIONS, seqRandom([0.2])).state;
        state = selectDestinyGacha(state, state.rolled[0], OPTIONS).state;
        state = confirmDestinyGacha(state).state;
        const event = destinyLockedEvent(state);
        assert.equals(null, flow.advance(event!)?.id ?? null);
        assert.equals(null, flow.current());
        assert.equals(3, flow.history().length);
        assert.equals('destiny-locked', flow.history()[2].event.type);
    });

    suite.test('宿命轉蛋幕只接受 destiny-locked 離開；其他事件不離開', () => {
        const flow = new OpeningFlowController(openingConfig());
        flow.start();
        flow.advance({ type: 'intro-done' });
        assert.equals('destiny', flow.advance({ type: 'roll-ten' })!.id);
        assert.equals('destiny', flow.advance({ type: 'destiny-reset' })!.id);
    });

    return suite;
}
