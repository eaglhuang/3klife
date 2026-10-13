/**
 * OnboardingFlow.test.ts — 新手 3 段式引導的顯示與觸發流程 headless 測試（PROG-2-0229）
 *
 * 不開 Cocos：驗證 OnboardingFlowController 的 view、段落推進、GameSession 進度隨存檔保留，
 * 以及 flow view 的 key 都對得到 onboarding-tutorial-main.json 的節點 id。
 *
 * Unity 對照：EditMode Test 測 Presenter 與 GameManager，不實例化 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { OnboardingFlowController } from '../assets/scripts/ui/core/OnboardingFlowController';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { normalizeOnboardingState, ONBOARDING_SEGMENTS } from '../assets/scripts/core/systems/OnboardingTutorial';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function layoutIds(): Set<string> {
    const layout = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/ui-spec/layouts/onboarding-tutorial-main.json'), 'utf8'));
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        for (const child of node.children ?? []) walk(child as { id?: string; children?: unknown[] });
    };
    walk(layout.root);
    return ids;
}

async function makeSession(adapter: MemoryStorageAdapter): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

function makeController(session: GameSession): OnboardingFlowController {
    return new OnboardingFlowController({
        state: () => session.onboarding,
        acknowledge: (segmentId) => session.acknowledgeOnboarding(segmentId),
    });
}

export function createOnboardingFlowSuite(): TestSuite {
    const suite = new TestSuite('OnboardingFlow (PROG-2-0229 新手 3 段式引導接線)');

    suite.test('首次進入顯示第一段，進度 1 / 3', async () => {
        const session = await makeSession(new MemoryStorageAdapter());
        const controller = makeController(session);
        assert.isTrue(controller.shouldShow());
        const view = controller.getFlowView();
        assert.equals(ONBOARDING_SEGMENTS[0].text, view.texts.tutorialText);
        assert.equals('1 / 3', view.texts.tutorialStep);
        assert.isTrue(view.actives.tutorialCard);
        assert.isTrue(view.enabled.btnNextTutorial);
    });

    suite.test('flow view 的 key 都對得到 onboarding-tutorial-main.json 的節點 id', async () => {
        const session = await makeSession(new MemoryStorageAdapter());
        const view = makeController(session).getFlowView();
        const ids = layoutIds();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(ids.has(key));
        }
    });

    suite.test('依序按下一步推進三段，第三段後關閉且不再顯示', async () => {
        const session = await makeSession(new MemoryStorageAdapter());
        const controller = makeController(session);
        await controller.next();
        assert.equals('2 / 3', controller.getFlowView().texts.tutorialStep);
        await controller.next();
        assert.equals('3 / 3', controller.getFlowView().texts.tutorialStep);
        assert.equals('開始遊戲', controller.getFlowView().texts.btnNextTutorialLabel);
        await controller.next();
        assert.isFalse(controller.shouldShow());
        assert.isFalse(controller.getFlowView().actives.tutorialCard);
        assert.isTrue((await controller.next()) === null);
    });

    suite.test('GameSession：跳段被拒且進度不變', async () => {
        const session = await makeSession(new MemoryStorageAdapter());
        const result = await session.acknowledgeOnboarding('legacy');
        assert.isFalse(result.ok);
        assert.equals('out-of-order', result.reason!);
        assert.equals(0, session.onboarding.nextIndex);
    });

    suite.test('進度隨存檔保留：關閉再開不會重看已確認的段落', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await makeSession(adapter);
        await makeController(session).next();
        assert.equals(1, session.onboarding.nextIndex);

        const restored = await makeSession(adapter);
        assert.isTrue(await restored.load());
        assert.equals(1, restored.onboarding.nextIndex);
        assert.equals('2 / 3', makeController(restored).getFlowView().texts.tutorialStep);
    });

    suite.test('舊檔沒有引導欄位時視為從頭開始；壞值會被夾回合法範圍', () => {
        assert.equals(0, normalizeOnboardingState(undefined).nextIndex);
        assert.equals(0, normalizeOnboardingState({ nextIndex: -1 }).nextIndex);
        assert.equals(0, normalizeOnboardingState({ nextIndex: 1.5 }).nextIndex);
        assert.equals(ONBOARDING_SEGMENTS.length, normalizeOnboardingState({ nextIndex: 99 }).nextIndex);
    });

    return suite;
}
