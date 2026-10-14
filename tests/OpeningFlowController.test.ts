import { assert, TestSuite } from './TestRunner';
import { OpeningFlowController } from '../assets/scripts/core/systems/OpeningFlowController';

export function createOpeningFlowControllerSuite(): TestSuite {
    const suite = new TestSuite('OpeningFlowController');
    const config = () => ({ phases: [
        { id: 'intro', enterWhen: (e: { type: string }) => e.type === 'start', leaveWhen: (e: { type: string }) => e.type === 'continue' },
        { id: 'finish', enterWhen: (e: { type: string }) => e.type === 'continue', leaveWhen: (e: { type: string }) => e.type === 'done' },
    ] });
    suite.test('依序前進與完整歷史，結束不重複紀錄', () => {
        const flow = new OpeningFlowController(config());
        assert.equals(null, flow.current());
        assert.equals('intro', flow.start()!.id);
        assert.equals('finish', flow.advance({ type: 'continue' })!.id);
        assert.equals(null, flow.advance({ type: 'done' }));
        flow.advance({ type: 'done' });
        assert.equals(3, flow.history().length);
        assert.equals(JSON.stringify([{ from: null, to: 'intro', event: { type: 'start' } }, { from: 'intro', to: 'finish', event: { type: 'continue' } }, { from: 'finish', to: null, event: { type: 'done' } }]), JSON.stringify(flow.history()));
    });
    suite.test('離開或下一幕進入條件不符時保持原地', () => {
        const data = config();
        data.phases[1].enterWhen = () => false;
        const flow = new OpeningFlowController(data); flow.start();
        assert.equals('intro', flow.advance({ type: 'wrong' })!.id);
        assert.equals('intro', flow.advance({ type: 'continue' })!.id);
        assert.equals(1, flow.history().length);
    });
    suite.test('重新開始清空紀錄；首幕不符維持未開始', () => {
        const flow = new OpeningFlowController(config()); flow.start(); flow.advance({ type: 'continue' }); flow.start();
        assert.equals(1, flow.history().length);
        const data = config(); data.phases[0].enterWhen = () => false;
        const blocked = new OpeningFlowController(data);
        assert.equals(null, blocked.start()); assert.equals(0, blocked.history().length);
    });
    suite.test('設定、輸入事件與回傳紀錄不會洩漏可變狀態', () => {
        const data = config(); const flow = new OpeningFlowController(data); data.phases[0].id = 'changed';
        flow.start(); const event = { type: 'continue' }; flow.advance(event); event.type = 'changed';
        flow.history().splice(0, 1);
        assert.equals('intro', flow.history()[0].to);
        assert.equals('continue', flow.history()[1].event.type);
    });
    suite.test('缺幕與重複幕設定明確拒絕', () => {
        for (const phases of [[], [config().phases[0], config().phases[0]]]) {
            let rejected = false; try { new OpeningFlowController({ phases }); } catch (error) { rejected = error instanceof Error; }
            assert.isTrue(rejected);
        }
    });
    return suite;
}
