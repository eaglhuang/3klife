/**
 * LobbyHallThemeApplier.test.ts — 幕府大廳主題套用器（UI-2-0147，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { HallThemeConfig, resolveHallTheme } from '../assets/scripts/core/systems/HallTheme';
import { LOBBY_HALL_THEME_NODE_IDS as IDS, LobbyHallThemeApplier, LobbyHallThemeView } from '../assets/scripts/ui/core/LobbyHallThemeApplier';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const CONFIG = loadJson<HallThemeConfig>('assets/resources/data/hall-map/hall-theme.json');

class RecordingView implements LobbyHallThemeView {
    calls: string[] = [];
    active = new Map<string, boolean>();
    sprite = new Map<string, string>();
    tint = new Map<string, string>();
    setActive(id: string, active: boolean): void { this.calls.push(`active ${id}`); this.active.set(id, active); }
    setSprite(id: string, path: string): void { this.calls.push(`sprite ${id}`); this.sprite.set(id, path); }
    setTint(id: string, tint: { color: string; alpha: number }): void { this.calls.push(`tint ${id}`); this.tint.set(id, `${tint.color}@${tint.alpha}`); }
}

export function createLobbyHallThemeApplierSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallThemeApplier');

    suite.test('夏天白天：換夏季背景、開光束、關夜色、節慶槽隱藏', () => {
        const view = new RecordingView();
        new LobbyHallThemeApplier(view).apply(resolveHallTheme({ seasonIndex: 2, hour: 12 }, CONFIG));
        assert.equals(view.sprite.get(IDS.background), 'sprites/ui_bg/lobby_hall_summer_bg', '背景');
        assert.isTrue(view.active.get(IDS.sunrays) === true, '光束');
        assert.isTrue(view.active.get(IDS.nightTint) === false, '夜色關');
        assert.isTrue(view.active.get(IDS.festivalDecor) === false, '節慶槽');
        assert.equals(view.tint.get(IDS.seasonTint), '#78DC8C@0.3', '季節色調');
    });

    suite.test('冬天夜晚：開夜色並套色，關光束', () => {
        const view = new RecordingView();
        new LobbyHallThemeApplier(view).apply(resolveHallTheme({ seasonIndex: 4, hour: 22 }, CONFIG));
        assert.isTrue(view.active.get(IDS.nightTint) === true, '夜色開');
        assert.equals(view.tint.get(IDS.nightTint), '#0A1028@0.55', '夜色');
        assert.isTrue(view.active.get(IDS.sunrays) === false, '光束關');
    });

    suite.test('主題沒變不重下指令；reset 後會重下', () => {
        const view = new RecordingView();
        const applier = new LobbyHallThemeApplier(view);
        const theme = resolveHallTheme({ seasonIndex: 1, hour: 9 }, CONFIG);
        assert.isTrue(applier.apply(theme), '第一次');
        const count = view.calls.length;
        assert.isFalse(applier.apply(resolveHallTheme({ seasonIndex: 1, hour: 10 }, CONFIG)), '同為春天白天');
        assert.equals(view.calls.length, count, '沒有新指令');
        applier.reset();
        assert.isTrue(applier.apply(theme), 'reset 後');
    });

    suite.test('有節慶裝飾時開節慶槽並換圖', () => {
        const view = new RecordingView();
        const config: HallThemeConfig = { ...CONFIG, festivals: { lantern: { decorPath: 'sprites/ui_bg/lantern_decor' } } };
        new LobbyHallThemeApplier(view).apply(resolveHallTheme({ seasonIndex: 1, hour: 12, festivalId: 'lantern' }, config));
        assert.isTrue(view.active.get(IDS.festivalDecor) === true, '節慶槽開');
        assert.equals(view.sprite.get(IDS.festivalDecor), 'sprites/ui_bg/lantern_decor', '節慶圖');
    });

    return suite;
}
