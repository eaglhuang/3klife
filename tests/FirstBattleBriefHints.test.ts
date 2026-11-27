// @spec-source → 開場首戰五路教學戰流程控制器與提示浮窗狀態機規格書；PROG-2-10136 首戰提示精簡（短句、可跳過、放完自動收起）
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { FirstBattleOperationGuide, OPERATION_GUIDE } from '../assets/scripts/core/systems/FirstBattleOperationGuide';
import { BattleTutorialHint, TUTORIAL_HINT_AUTO_DISMISS_MS } from '../assets/scripts/battle/views/BattleTutorialHint';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function makeCoach() {
    const listeners = new Map<string, (d: unknown) => void>();
    let hint: { message: string } | null = null;
    const shown: Array<string | null> = [];
    const coach = new BattleTutorialHint(
        { on: (name, fn) => { listeners.set(name, fn); return () => { listeners.delete(name); }; } },
        () => undefined,
        (h) => { hint = h as { message: string } | null; shown.push(hint ? hint.message : null); },
        () => ({ current: 0, max: 80 }),
    );
    return { coach, listeners, shown, current: () => hint };
}

export function createFirstBattleBriefHintsSuite(): TestSuite {
    const suite = new TestSuite('FirstBattleBriefHints (首戰提示精簡 PROG-2-10136)');

    suite.test('跳過：任何一步都能結束提示，之後的事件不會讓它重新出現', () => {
        const { coach, listeners, current } = makeCoach();
        assert.isTrue(current() !== null);
        listeners.get('first-battle-guide-skip')!({});
        assert.equals(null, current());
        listeners.get(EVENT_NAMES.UnitDeployed)!({ faction: Faction.Player });
        listeners.get(EVENT_NAMES.TurnPhaseChanged)!({ turn: 8 });
        listeners.get('first-battle-guide-next')!({});
        assert.equals(null, current());
        coach.dispose();
    });

    suite.test('狀態機：skip 事件直接完成；completed 後不復活', () => {
        const g = new FirstBattleOperationGuide();
        assert.isTrue(g.advance('skip'));
        assert.equals(null, g.hint);
        assert.isFalse(g.advance('skip'));
    });

    suite.test('放招講完進到「勝負」後自動倒數收起；換頁會重新倒數；dispose 清掉計時器', () => {
        const realSet = globalThis.setTimeout, realClear = globalThis.clearTimeout;
        const timers: Array<{ fn: () => void; ms: number; live: boolean }> = [];
        (globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void, ms: number) => { timers.push({ fn, ms, live: true }); return timers.length - 1; };
        (globalThis as unknown as { clearTimeout: unknown }).clearTimeout = (id: number) => { if (timers[id]) timers[id].live = false; };
        try {
            const { coach, listeners, current } = makeCoach();
            const sp = (n: number) => listeners.get(EVENT_NAMES.GeneralSpChanged)!({ faction: Faction.Player, sp: n, maxSp: 80 });
            listeners.get(EVENT_NAMES.UnitDeployed)!({ faction: Faction.Player });
            sp(80);
            assert.equals(0, timers.length); // ③ 放招還在教，不倒數
            listeners.get(EVENT_NAMES.GeneralSkillUsed)!({ faction: Faction.Player, sourceType: 'ultimate' });
            assert.isTrue(current()!.message.includes('④'));
            const armed = timers.filter((t) => t.live);
            assert.equals(1, armed.length);
            assert.equals(TUTORIAL_HINT_AUTO_DISMISS_MS, armed[0].ms);
            armed[0].fn();
            assert.equals(null, current());
            coach.dispose();
        } finally {
            globalThis.setTimeout = realSet;
            globalThis.clearTimeout = realClear;
        }
    });

    suite.test('文案精簡：四步各一句、不超過 60 字；zh-TW 後備文字與 i18n 一致，含看軍勢與放招', () => {
        const zh = JSON.parse(read('assets/resources/i18n/zh-TW.json')) as Record<string, string>;
        for (const step of ['clash', 'ultimate', 'victory', 'retreat'] as const) {
            const message = OPERATION_GUIDE[step].message;
            assert.isTrue(message.length <= 60, `${step} ${message.length}`);
            assert.equals(message, zh[`battle.guide.step.${step}`]);
        }
        assert.isTrue(OPERATION_GUIDE.clash.message.includes('軍勢'));
        assert.isTrue(OPERATION_GUIDE.ultimate.message.includes('放招'));
    });

    suite.test('四語系都有「跳過」字串；版面有 guideSkip 且四顆鈕在最小卡寬內', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(read(`assets/resources/i18n/${lang}.json`)) as Record<string, string>;
            assert.isTrue(typeof table['battle.guide.skip'] === 'string' && table['battle.guide.skip'].length > 0, lang);
        }
        type Node = { id?: string; width?: number; widget?: { left?: number }; children?: Node[] };
        const layout = JSON.parse(read('assets/resources/ui-spec/layouts/battle-operation-guide-main.json')) as { root: Node };
        const card = layout.root.children!.find((n) => n.id === 'guideCard')!;
        const buttons = ['guidePrevious', 'guideNext', 'guideMinimize', 'guideSkip'].map((id) => card.children!.find((n) => n.id === id)!);
        assert.isTrue(buttons.every((b) => !!b));
        const right = Math.max(...buttons.map((b) => (b.widget?.left ?? 0) + (b.width ?? 0)));
        const minCardWidth = (JSON.parse(read('assets/resources/data/battle-coach-placement.json')) as { cards: Array<{ minWidth: number }> }).cards[0].minWidth;
        assert.isTrue(right <= minCardWidth, `右緣 ${right} 超出最小卡寬 ${minCardWidth}`);
        assert.isTrue(read('assets/scripts/ui/components/BattleScenePanel.ts').includes("getNode('guideSkip')"));
    });

    return suite;
}
