/**
 * SortieHint.test.ts — 教學結束後「去出征」提示（PROG-2-10067）headless 測試
 *
 * 不開 Cocos：驗證 OnboardingTutorial 的 sortieHintPending 狀態、GameSession 存檔往返與舊存檔相容、
 * SortieHintController 的開關／只說一次／點出征關閉，以及四語系 i18n key 都存在。
 */
import { assert, TestSuite } from './TestRunner';
import { SortieHintController } from '../assets/scripts/ui/core/SortieHintController';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, PLAYER_SAVE_KEY } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    acknowledgeOnboardingSegment,
    completeSortieHint,
    FRESH_ONBOARDING,
    isSortieHintActive,
    normalizeOnboardingState,
    ONBOARDING_SEGMENTS,
    type OnboardingState,
} from '../assets/scripts/core/systems/OnboardingTutorial';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function finishTutorial(): OnboardingState {
    let state: OnboardingState = { ...FRESH_ONBOARDING };
    for (const seg of ONBOARDING_SEGMENTS) state = acknowledgeOnboardingSegment(state, seg.id).state;
    return state;
}

async function makeSession(adapter: MemoryStorageAdapter): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

function makeController(initial: OnboardingState, opts: { cleared?: number; visible?: boolean } = {}) {
    const log = { pulse: [] as boolean[], said: 0, done: 0 };
    const ctx = { state: initial, cleared: opts.cleared ?? 0, visible: opts.visible ?? true };
    const controller = new SortieHintController({
        onboarding: () => ctx.state,
        clearedStageCount: () => ctx.cleared,
        hallVisible: () => ctx.visible,
        setPulse: on => { log.pulse.push(on); },
        say: () => { log.said++; },
        markDone: async () => { log.done++; ctx.state = completeSortieHint(ctx.state); },
    });
    return { controller, log, ctx };
}

export function createSortieHintSuite(): TestSuite {
    const suite = new TestSuite('SortieHint (PROG-2-10067 教學結束後出征鈕脈動)');

    suite.test('教學中途不提示；最後一段確認後才開啟', () => {
        let state: OnboardingState = { ...FRESH_ONBOARDING };
        assert.isFalse(isSortieHintActive(state, 0));
        state = acknowledgeOnboardingSegment(state, ONBOARDING_SEGMENTS[0].id).state;
        state = acknowledgeOnboardingSegment(state, ONBOARDING_SEGMENTS[1].id).state;
        assert.isFalse(isSortieHintActive(state, 0));
        state = acknowledgeOnboardingSegment(state, ONBOARDING_SEGMENTS[2].id).state;
        assert.isTrue(state.sortieHintPending === true);
        assert.isTrue(isSortieHintActive(state, 0));
    });

    suite.test('已有通關戰績時不提示', () => {
        assert.isFalse(isSortieHintActive(finishTutorial(), 1));
    });

    suite.test('教學結束→脈動開啟並說一句；重複刷新只說一次', () => {
        const { controller, log } = makeController(finishTutorial());
        controller.refresh();
        controller.refresh();
        assert.equals(2, log.pulse.length);
        assert.isTrue(log.pulse.every(on => on));
        assert.equals(1, log.said);
    });

    suite.test('教學還沒結束或大廳被蓋住時：不脈動、不說話；看得到後才說', () => {
        const mid = acknowledgeOnboardingSegment({ ...FRESH_ONBOARDING }, 'fate').state;
        const a = makeController(mid);
        a.controller.refresh();
        assert.isFalse(a.log.pulse[0]);
        assert.equals(0, a.log.said);
        const b = makeController(finishTutorial(), { visible: false });
        b.controller.refresh();
        assert.isFalse(b.log.pulse[0]);
        assert.equals(0, b.log.said);
        b.ctx.visible = true;
        b.controller.refresh();
        assert.isTrue(b.log.pulse[1]);
        assert.equals(1, b.log.said);
    });

    suite.test('點出征→脈動關閉並標記完成；之後刷新不再亮、不再說', async () => {
        const { controller, log, ctx } = makeController(finishTutorial());
        controller.refresh();
        await controller.complete();
        assert.isFalse(log.pulse[log.pulse.length - 1]);
        assert.equals(1, log.done);
        assert.isFalse(isSortieHintActive(ctx.state, 0));
        controller.refresh();
        assert.isFalse(log.pulse[log.pulse.length - 1]);
        assert.equals(1, log.said);
        await controller.complete();
        assert.equals(1, log.done);
    });

    suite.test('舊存檔（教學已完成、沒有 sortieHintPending 欄位）不會冒出提示', () => {
        const old = normalizeOnboardingState({ nextIndex: ONBOARDING_SEGMENTS.length });
        assert.isTrue(old.sortieHintPending === undefined);
        assert.isFalse(isSortieHintActive(old, 0));
        // 壞值與教學未完成時帶著欄位都會被丟掉
        assert.isTrue(normalizeOnboardingState({ nextIndex: ONBOARDING_SEGMENTS.length, sortieHintPending: 'yes' }).sortieHintPending === undefined);
        assert.isTrue(normalizeOnboardingState({ nextIndex: 1, sortieHintPending: true }).sortieHintPending === undefined);
        assert.isTrue(normalizeOnboardingState({ nextIndex: ONBOARDING_SEGMENTS.length, sortieHintPending: true }).sortieHintPending === true);
    });

    suite.test('GameSession：完成教學後提示隨存檔保留，點出征後清除並寫進存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await makeSession(adapter);
        for (const seg of ONBOARDING_SEGMENTS) await session.acknowledgeOnboarding(seg.id);
        assert.isTrue(session.onboarding.sortieHintPending === true);
        const restored = await makeSession(adapter);
        assert.isTrue(await restored.load());
        assert.isTrue(restored.onboarding.sortieHintPending === true);
        await restored.completeSortieHint();
        assert.isTrue(restored.onboarding.sortieHintPending === undefined);
        const again = await makeSession(adapter);
        assert.isTrue(await again.load());
        assert.isTrue(again.onboarding.sortieHintPending === undefined);
        assert.equals(ONBOARDING_SEGMENTS.length, again.onboarding.nextIndex);
        // 沒有待辦提示時重複呼叫無副作用
        await again.completeSortieHint();
    });

    suite.test('GameSession：舊存檔（引導只有 nextIndex）讀檔後不出現提示', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await makeSession(adapter);
        for (const seg of ONBOARDING_SEGMENTS) await session.acknowledgeOnboarding(seg.id);
        const raw = (await adapter.get<Record<string, unknown>>(PLAYER_SAVE_KEY))!;
        raw.onboarding = { nextIndex: ONBOARDING_SEGMENTS.length };
        await adapter.set(PLAYER_SAVE_KEY, raw);
        const restored = await makeSession(adapter);
        assert.isTrue(await restored.load());
        assert.equals(ONBOARDING_SEGMENTS.length, restored.onboarding.nextIndex);
        assert.isFalse(isSortieHintActive(restored.onboarding, 0));
    });

    suite.test('四語系都有 ui.onboarding.sortie_hint', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
            const text = table['ui.onboarding.sortie_hint'];
            assert.isTrue(typeof text === 'string' && text.length > 0, `${lang} 缺 key`);
        }
    });

    return suite;
}
