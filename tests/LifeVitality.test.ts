/**
 * LifeVitality.test.ts — 壽命 UI 與精力 UI（PROG-2-0074，headless）
 *
 * 驗證 LifeVitalityPresenter 的規格字串、年齡階段、條的比例與變色、待產與精力不足提示，
 * 並比對 gd-tab-basics.json / 皮膚 / GeneralDetailBasicsChild / LobbyScene 的接線。
 *
 * Unity 對照：EditMode Test 測 Formatter，不實例化 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import {
    describeLifespan,
    describeVitality,
    formatDeathNotice,
    formatVitalityCost,
    lifePhaseOf,
    METER_TIER_COLORS,
    UI_VIT_EXHAUSTED,
} from '../assets/scripts/ui/core/LifeVitalityPresenter';
import { resolveMaxLifespan } from '../assets/scripts/core/systems/GeneralAging';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function general(extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id: 'liu', name: '劉備', faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 120,
        str: 70, int: 70, lea: 70, pol: 60, cha: 60, luk: 40,
        ...extra,
    } as unknown as GeneralConfig;
}

function collectNames(node: { name?: string; children?: unknown[] }, out: Map<string, Record<string, unknown>>): void {
    if (node.name) out.set(node.name, node as Record<string, unknown>);
    for (const c of node.children ?? []) collectNames(c as { name?: string; children?: unknown[] }, out);
}

export function createLifeVitalitySuite(): TestSuite {
    const suite = new TestSuite('LifeVitality (壽命 UI / 精力 UI)');

    suite.test('新邏輯檔案不 import cc', () => {
        const source = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/core/LifeVitalityPresenter.ts'), 'utf8');
        assert.isFalse(/from ['"]cc['"]/.test(source));
    });

    suite.test('年齡階段：幼兒 0~5、少年 5~15、青年 15~40、壯年 40~55、老年 55~65、超齡 65+', () => {
        const cases: Array<[number, string]> = [[0, 'infant'], [4.75, 'infant'], [5, 'youth'], [14.75, 'youth'], [15, 'prime'], [39.75, 'prime'], [40, 'peak'], [55, 'elder'], [64.75, 'elder'], [65, 'overage'], [90, 'overage']];
        for (const [age, phase] of cases) assert.equals(phase, lifePhaseOf(age), `${age} 歲`);
    });

    suite.test('壽命：UI_AGE_DISPLAY / UI_LIFESPAN_BAR / 階段名稱，年齡取整數', () => {
        const g = general({ age: 42.5, maxLifespan: 72 });
        const view = describeLifespan(g);
        assert.equals('劉備（42 歲）', view.ageDisplay);
        assert.equals('42 歲 · 壯年期（巔峰）', view.ageText);
        assert.equals('壽命：42/72', view.lifespanText);
        assert.equals(42.5 / 72, view.ratio);
        assert.equals('high', view.tier);
        assert.isFalse(view.overLifespan);
        assert.equals('少年期', describeLifespan(general({ age: 10 })).phaseLabel);
        assert.equals('青年期', describeLifespan(general({ age: 20 })).phaseLabel);
        assert.equals('老年期', describeLifespan(general({ age: 60, maxLifespan: 70 })).phaseLabel);
    });

    suite.test('壽命：沒有 maxLifespan 時用 resolveMaxLifespan；老年轉黃、超過壽命轉紅且條封頂', () => {
        const g = general({ age: 20 });
        assert.equals(resolveMaxLifespan(g), describeLifespan(g).maxLifespan);
        const old = describeLifespan(general({ age: 60, maxLifespan: 70 }));
        assert.equals('mid', old.tier);
        assert.equals(METER_TIER_COLORS.mid, old.color);
        const over = describeLifespan(general({ age: 75, maxLifespan: 70 }));
        assert.isTrue(over.overLifespan);
        assert.equals('low', over.tier);
        assert.equals(1, over.ratio);
        assert.isTrue(describeLifespan(general({ status: 'dead' })).dead);
    });

    suite.test('精力：UI_VIT_BAR，≥ 60% 綠、30%~60% 黃、< 30% 紅', () => {
        const full = describeVitality(general({ vitality: 120, maxVitality: 120 }));
        assert.equals('精力：120/120', full.text);
        assert.equals('high', full.tier);
        assert.equals(METER_TIER_COLORS.high, full.color);
        assert.equals('high', describeVitality(general({ vitality: 72, maxVitality: 120 })).tier, '剛好 60%');
        assert.equals('mid', describeVitality(general({ vitality: 71, maxVitality: 120 })).tier);
        assert.equals('mid', describeVitality(general({ vitality: 36, maxVitality: 120 })).tier, '剛好 30%');
        assert.equals('low', describeVitality(general({ vitality: 35, maxVitality: 120 })).tier);
        assert.equals(0, describeVitality(general({ vitality: 0, maxVitality: 0 })).ratio, '上限 0 不除以零');
        assert.equals('精力：120/120', describeVitality(general({ vitality: 150, maxVitality: 120 })).text, '超過上限時顯示上限');
    });

    suite.test('精力：待產優先顯示 UI_PREGNANCY_LOCK，其次精力不足', () => {
        const pregnant = describeVitality(general({ vitality: 0, maxVitality: 100, pregnancySeasonsLeft: 3 }));
        assert.equals('待產中（剩餘 3 季）', pregnant.pregnancyText);
        assert.equals('待產中（剩餘 3 季）', pregnant.statusText);
        assert.isTrue(pregnant.exhausted);
        const tired = describeVitality(general({ vitality: 29, maxVitality: 100 }));
        assert.equals(null, tired.pregnancyText);
        assert.equals(UI_VIT_EXHAUSTED, tired.statusText);
        assert.equals('', describeVitality(general({ vitality: 30, maxVitality: 100 })).statusText, '剛好夠打一場');
    });

    suite.test('UI_VIT_COST、UI_DEATH_NOTIFY', () => {
        assert.equals('此行動消耗精力 50', formatVitalityCost(50));
        assert.equals('關羽 辭世，享年 70 歲', formatDeathNotice('關羽', 70.75));
    });

    suite.test('版面與接線：詳情基本頁有壽命 / 精力條、皮膚有對應 slot、Basics 與大廳已接線', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/fragments/layouts/gd-tab-basics.json'), 'utf8'));
        const nodes = new Map<string, Record<string, unknown>>();
        collectNames(layout, nodes);
        for (const name of ['LifespanMeterTrack', 'LifespanMeterFill', 'VitalityMeterTrack', 'VitalityMeterFill']) {
            assert.isTrue(nodes.has(name), `layout 有 ${name}`);
        }
        assert.equals('壽命', nodes.get('LifespanLabel')!.text);

        const skin = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/skins/general-detail-unified-default.json'), 'utf8'));
        for (const slot of ['detail.meter.track', 'detail.meter.fill']) assert.isDefined(skin.slots[slot], slot);

        const basics = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/general-detail/GeneralDetailBasicsChild.ts'), 'utf8');
        assert.isTrue(basics.includes('LifespanMeterFill') && basics.includes('VitalityMeterFill'));
        assert.isTrue(basics.includes('describeLifespan') && basics.includes('describeVitality'));

        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('GAME_SESSION_EVENTS.GeneralDied') && lobby.includes('formatDeathNotice'));
    });

    return suite;
}
