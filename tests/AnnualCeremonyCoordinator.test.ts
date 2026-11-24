/**
 * AnnualCeremonyCoordinator — PROG-2-9955 年終頒獎典禮排隊演出測試
 *
 * 驗證：
 * 1. 年度結算後自動觸發一次，寫入已閱旗標，不會重複自動觸發。
 * 2. 與其他彈窗共用 StoryPlayer 單一佇列依序播放，不會重疊。
 * 3. 看板「重播典禮」(isReplay=true) 可忽略已閱旗標再次排入播放。
 */
import { TestSuite, assert } from './TestRunner';
import { StoryPlayer } from '../assets/scripts/shared/story/StoryPresentation';
import { AnnualCeremonyCoordinator } from '../assets/scripts/core/systems/annual_ranking/AnnualCeremonyCoordinator';

export function createAnnualCeremonyCoordinatorSuite(): TestSuite {
    const suite = new TestSuite('AnnualCeremonyCoordinator (年終典禮佇列與已閱 PROG-2-9955)');

    suite.test('自動觸發一次並寫入已閱，之後重播才可再播；與佇列依序執行不重疊', async () => {
        const coordinator = new AnnualCeremonyCoordinator();
        const player = new StoryPlayer();
        const order: string[] = [];

        player.registerCue('popup', {
            play: async () => {
                order.push('promotion_popup');
                return null;
            },
        });
        player.registerCue('annual_ceremony', {
            play: async (cue: any) => {
                order.push(`ceremony_${cue.year}`);
                return null;
            },
        });

        assert.isTrue(coordinator.shouldAutoTrigger(1, true));
        assert.isTrue(!coordinator.shouldAutoTrigger(1, false));

        // 晉升彈窗與年終典禮排入同一個 StoryPlayer 佇列
        const p1 = player.enqueue({
            storyId: 'promotion_1',
            instanceId: 'promo_1',
            cues: [{ cue: 'popup', titleKey: 'promo', textKey: 'promo.desc' } as any],
            choice: null,
            skippable: false,
        }, 60);

        const input = {
            year: 1,
            boardResults: {},
            livingMonarchIds: [{ id: 'liu-bei', name: '劉備', factionId: 'shu' }],
            playerFactionId: 'shu',
        };
        const p2 = coordinator.enqueueCeremony(player, input, { priority: 50 });

        await Promise.all([p1, p2]);
        assert.equals(order.join(','), 'promotion_popup,ceremony_1');
        assert.isTrue(coordinator.hasSeenYear(1));
        assert.isTrue(!coordinator.shouldAutoTrigger(1, true));

        // 再次自動呼叫不會重複播放
        const dup = await coordinator.enqueueCeremony(player, input);
        assert.equals(dup.played, false);

        // 重播按鈕 (isReplay=true) 可再次播放
        const replay = await coordinator.enqueueCeremony(player, input, { isReplay: true });
        assert.equals(replay.played, true);
        assert.equals(order.join(','), 'promotion_popup,ceremony_1,ceremony_1');
    });

    return suite;
}
