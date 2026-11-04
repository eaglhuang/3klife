/**
 * HallTheme.test.ts — 幕府大廳主題解析（UI-2-0144，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { hallDaypartOf, hallFestivalIdOf, HallThemeConfig, resolveHallTheme } from '../assets/scripts/core/systems/HallTheme';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const CONFIG = loadJson<HallThemeConfig>('assets/resources/data/hall-map/hall-theme.json');

export function createHallThemeSuite(): TestSuite {
    const suite = new TestSuite('HallTheme');

    suite.test('四季對應背景圖，且背景資源都存在', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const seasons = [1, 2, 3, 4].map(i => resolveHallTheme({ seasonIndex: i, hour: 12 }, CONFIG));
        assert.equals(seasons.map(t => t.season).join(','), 'spring,summer,autumn,winter', '季節');
        for (const t of seasons) {
            const file = path.join(__dirname, '..', 'assets', 'resources', `${t.backgroundPath}.jpg`);
            assert.isTrue(fs.existsSync(file), `背景圖存在 ${t.backgroundPath}`);
        }
    });

    suite.test('夜間時段跨午夜：18 點起到 6 點前為夜', () => {
        const night = CONFIG.night;
        assert.equals(hallDaypartOf(17, night), 'day', '17 點');
        assert.equals(hallDaypartOf(18, night), 'night', '18 點');
        assert.equals(hallDaypartOf(0, night), 'night', '0 點');
        assert.equals(hallDaypartOf(5, night), 'night', '5 點');
        assert.equals(hallDaypartOf(6, night), 'day', '6 點');
        assert.equals(hallDaypartOf(9, { startHour: 9, endHour: 9 }), 'day', '區間為空');
    });

    suite.test('夜間開夜色遮罩；夏日光束只在白天出現', () => {
        const summerDay = resolveHallTheme({ seasonIndex: 2, hour: 12 }, CONFIG);
        assert.isTrue(summerDay.sunrays, '夏天白天有光束');
        assert.equals(summerDay.nightTint, null, '白天無夜色');
        const summerNight = resolveHallTheme({ seasonIndex: 2, hour: 22 }, CONFIG);
        assert.isFalse(summerNight.sunrays, '夏天夜晚無光束');
        assert.isTrue(summerNight.nightTint !== null, '夜晚有夜色');
        assert.isFalse(resolveHallTheme({ seasonIndex: 1, hour: 12 }, CONFIG).sunrays, '春天無光束');
    });

    suite.test('節慶只靠設定覆寫背景／裝飾／粒子，未設定的節慶 id 視為無節慶', () => {
        const config: HallThemeConfig = {
            ...CONFIG,
            festivals: { lantern: { backgroundPath: 'sprites/ui_bg/lobby_hall_lantern_{season}_bg', decorPath: 'sprites/ui_bg/lantern_decor', fxSeason: 'winter' } },
        };
        const t = resolveHallTheme({ seasonIndex: 1, hour: 12, festivalId: 'lantern' }, config);
        assert.equals(t.backgroundPath, 'sprites/ui_bg/lobby_hall_lantern_spring_bg', '節慶背景');
        assert.equals(t.decorPath, 'sprites/ui_bg/lantern_decor', '節慶裝飾');
        assert.equals(t.fxSeason, 'winter', '節慶粒子');
        const none = resolveHallTheme({ seasonIndex: 1, hour: 12, festivalId: 'unknown' }, config);
        assert.equals(none.festivalId, null, '未知節慶');
        assert.equals(none.decorPath, null, '裝飾槽隱藏');
        assert.equals(none.fxSeason, 'spring', '粒子照季節');
    });

    suite.test('季節序號超出範圍時退回春季', () => {
        assert.equals(resolveHallTheme({ seasonIndex: 9, hour: 12 }, CONFIG).season, 'spring', '退回春季');
    });

    suite.test('lobby-hub 節慶 ID：NONE／空字串／缺值為無節慶，其餘原樣傳入（UI-2-0155）', () => {
        assert.equals(hallFestivalIdOf('NONE'), null);
        assert.equals(hallFestivalIdOf(''), null);
        assert.equals(hallFestivalIdOf(undefined), null);
        assert.equals(hallFestivalIdOf('lantern'), 'lantern');
    });

    return suite;
}
