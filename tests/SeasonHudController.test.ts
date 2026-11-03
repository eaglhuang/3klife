/**
 * SeasonHudController.test.ts — 大廳季度 HUD 控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { SeasonHudController } from '../assets/scripts/ui/core/SeasonHudController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';
import type { GameTimeState } from '../assets/scripts/core/systems/GameClock';

export function createSeasonHudControllerSuite(): TestSuite {
    const suite = new TestSuite('SeasonHudController (季度 HUD PROG-2-1633)');

    suite.test('掛載即寫入季度文字並連動城池；推進鈕交回宿主；狀態變更後 refresh 重寫', async () => {
        let bindings: MentorHoldingsButtonBinding[] = [];
        const texts: Record<string, string> = {};
        let advances = 0;
        let afters = 0;
        let time = { currentYear: 1, currentSeason: 1, totalSeasonsElapsed: 0, currentMode: 'normal' } as unknown as GameTimeState;
        const host = {
            node: { active: true },
            binder: {
                setTexts: (t: Record<string, string>) => { Object.assign(texts, t); },
                setActives: () => undefined,
            },
        };
        const ctrl = new SeasonHudController({
            mountHost: async (b) => { bindings = b; return host; },
            gameTime: () => time,
            countdown: () => null,
            now: () => 0,
            lookup: (key, ...args) => [key, ...args].join('|'),
            onAdvance: () => { advances++; },
            afterRefresh: () => { afters++; },
        });
        await ctrl.mount();
        assert.isTrue(ctrl.host === host);
        assert.equals(1, afters);
        const first = texts.seasonLabel;
        assert.isTrue(first.length > 0);
        bindings.find((b) => b.buttonId === 'btnAdvanceSeason')?.handler();
        assert.equals(1, advances);
        time = { ...time, currentYear: 2, currentSeason: 2, totalSeasonsElapsed: 5 } as GameTimeState;
        ctrl.refresh();
        assert.isTrue(texts.seasonLabel !== first, texts.seasonLabel);
        assert.equals(2, afters);
    });

    return suite;
}
