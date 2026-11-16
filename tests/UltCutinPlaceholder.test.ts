// @spec-source → PROG-2-9352（奧義接上漫畫式分鏡播放器；沒有專屬分鏡圖的武將先用「暫代圖 待替換」）
/**
 * UltCutinPlaceholder.test.ts — 奧義 cut-in 的調度：專屬分鏡優先、沒有就走暫代圖、逾時保底、回合流程不被卡住
 *
 * 畫面層（UltCutinOverlay）靠引擎節點，這裡用假的 play 替身驗證調度與時序；
 * 暫代圖設定檔本身用真的 cutinCore 驗證可播、長度有限。
 *
 * Unity 對照：測 CutsceneDirector 的「有過場播過場、沒有播 Placeholder、超時強制收」，不開場景。
 */
import { TestSuite, assert } from './TestRunner';
import {
    CUTIN_HARD_TIMEOUT_MS,
    PLACEHOLDER_CUTIN_IMAGE_KEY,
    PLACEHOLDER_CUTIN_TEXT,
    PlaceholderCutinRegistry,
    buildPlaceholderCutinConfig,
    placeholderCutinRegistry,
} from '../assets/scripts/shared/cutin/cutinSupport';
import { createCutinPlayer, validateConfig, type CutinConfig } from '../assets/scripts/shared/cutin/cutinCore';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
// Cocos view 模組使用 CLI register-cc-test-stub；不將整個 Editor UI 型別樹引入 headless tsconfig。
const { UltCutinDirector } = require('../assets/scripts/battle/views/UltCutinDirector');
const { TurnFlowManager } = require('../assets/scripts/battle/views/TurnFlowManager');

type PlayArgs = { config: CutinConfig; frames: (key: string) => unknown; placeholder?: boolean; onPauseRequest?: () => void; onResumeRequest?: () => void };

const PARENT = { isValid: true } as unknown;
const FRAME = { tag: 'placeholder-frame' };

interface Harness {
    director: any;
    plays: PlayArgs[];
    warnings: string[];
    pauses: boolean[];
    aborts: number;
}

/** 建一個注入假依賴的 director；outcomes 依序決定每次 play 的回傳（未給或 'never' 代表永不結束） */
function makeHarness(opts: {
    index?: { generals: string[] } | null;
    config?: unknown;
    loadFramesOk?: boolean;
    outcomes?: Array<'played' | 'skipped' | 'unplayable' | 'never'>;
    loadJsonNever?: boolean;
    loadTimeoutMs?: number;
    hardTimeoutMs?: number;
}): Harness {
    const h: Harness = { director: null, plays: [], warnings: [], pauses: [], aborts: 0 };
    const outcomes = [...(opts.outcomes ?? [])];
    h.director = new UltCutinDirector({
        loadJson: (path: string) => {
            if (opts.loadJsonNever) return new Promise(() => undefined);
            if (path.endsWith('index')) return Promise.resolve(opts.index ?? { generals: [] });
            return opts.config ? Promise.resolve(opts.config) : Promise.reject(new Error('no config'));
        },
        loadSpriteFrame: () => (opts.loadFramesOk ? Promise.resolve(FRAME) : Promise.reject(new Error('no image'))),
        play: (args: PlayArgs) => {
            h.plays.push(args);
            const next = outcomes.shift() ?? 'played';
            if (next === 'never') return new Promise(() => undefined);
            if (next === 'played') {
                args.onPauseRequest?.();
                args.onResumeRequest?.();
            }
            return Promise.resolve(next);
        },
        setPaused: (p: boolean) => { h.pauses.push(p); },
        abort: () => { h.aborts++; },
        makePlaceholderFrame: () => FRAME,
        loadTimeoutMs: opts.loadTimeoutMs ?? 200,
        hardTimeoutMs: opts.hardTimeoutMs ?? 500,
        warn: (m: string) => h.warnings.push(m),
    });
    return h;
}

const REAL_CONFIG = {
    id: 'ult_cutin.guan_yu', generalId: 'guan_yu', generalName: '關羽', skillName: '青龍',
    intro: { duration: 0.4, dimTo: 0.6 },
    panels: [{ imageKey: 'ult_cutin/guan_yu/01', hold: 0.5, zoomFrom: 1, zoomTo: 1.05 }],
    outro: { duration: 0.4 },
};

/** 假時鐘：scheduleOnce 依延遲排隊，advance 依時間順序執行（同 TurnFlowDuelStuck） */
class FakeClock {
    public now = 0;
    private queue: Array<{ at: number; fn: () => void }> = [];
    public readonly scene = { isValid: true, scheduleOnce: (fn: () => void, delay = 0) => { this.queue.push({ at: this.now + delay, fn }); } };
    public advance(seconds: number): void {
        const end = this.now + seconds;
        for (;;) {
            this.queue.sort((a, b) => a.at - b.at);
            const next = this.queue[0];
            if (!next || next.at > end) break;
            this.queue.shift();
            this.now = next.at;
            next.fn();
        }
        this.now = end;
    }
}

function flowSetup(): { ctrl: BattleController; ctx: any; clock: FakeClock; flow: any; turn: () => number } {
    services().initialize();
    const ctrl = new BattleController();
    const g = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 1000, str: 80, int: 80, lea: 80 });
    ctrl.initBattle(g('p', Faction.Player), g('e', Faction.Enemy));
    const clock = new FakeClock();
    const ctx: any = { ctrl, isAdvancingTurn: false, isDuelPanelActive: false, isDrainingCombatVisual: false, isUltCutinActive: false };
    const bridge = { refreshBattleViews() {}, hideEnemyThinkingPanel() {}, showEnemyThinkingPanel() {}, playTurnBanner() {} };
    const flow = new TurnFlowManager(ctx, clock.scene as any, bridge as any);
    return { ctrl, ctx, clock, flow, turn: () => services().battle.getSnapshot().turn };
}

export function createUltCutinPlaceholderSuite(): TestSuite {
    const suite = new TestSuite('UltCutinPlaceholder (奧義 cut-in 暫代圖與保底 PROG-2-9352)');

    suite.test('暫代圖設定：格式合法、只有一格、完整版與重播都可播且長度有限', () => {
        const config = buildPlaceholderCutinConfig('lu-bu', '呂布', '無雙');
        validateConfig(config); // 不合法會丟例外
        assert.equals(1, config.panels.length);
        assert.equals(PLACEHOLDER_CUTIN_IMAGE_KEY, config.panels[0].imageKey);
        assert.equals('呂布', config.generalName);
        assert.equals('無雙', config.skillName);
        for (const mode of ['full', 'replay'] as const) {
            const player = createCutinPlayer(config, { mode, hasImage: (k) => k === PLACEHOLDER_CUTIN_IMAGE_KEY });
            assert.isTrue(player.playable, `${mode} 要可播`);
            assert.isTrue(player.duration > 0 && player.duration < 4, `${mode} 長度應在 4 秒內，實際 ${player.duration}`);
        }
        assert.isTrue(PLACEHOLDER_CUTIN_TEXT.includes('暫代圖') && PLACEHOLDER_CUTIN_TEXT.includes('待替換'));
    });

    suite.test('暫代圖清單：同一武將只算一次警告，次數累加；id 的 - 與 _ 視為同一人', () => {
        const reg = new PlaceholderCutinRegistry();
        assert.isTrue(reg.note('lu-bu', '呂布'));
        assert.isFalse(reg.note('lu_bu', '呂布'));
        assert.isTrue(reg.note('guan-yu', '關羽'));
        const list = reg.list();
        assert.equals(2, list.length);
        assert.equals(2, list.find((e) => e.generalId === 'lu_bu')!.count);
        reg.clear();
        assert.equals(0, reg.list().length);
    });

    suite.test('沒有專屬分鏡圖：播暫代圖（帶警示字樣旗標），並登記進清單、記一行警告', async () => {
        placeholderCutinRegistry.clear();
        const h = makeHarness({ index: { generals: [] } });
        const outcome = await h.director.play('lu-bu', PARENT, { generalName: '呂布', skillName: '無雙' });
        assert.equals('played', outcome);
        assert.equals(1, h.plays.length);
        const args = h.plays[0];
        assert.isTrue(args.placeholder === true, '要帶暫代圖旗標，畫面層才會疊字');
        assert.equals('呂布', args.config.generalName);
        assert.equals(FRAME, args.frames(PLACEHOLDER_CUTIN_IMAGE_KEY));
        assert.equals(null, args.frames('ult_cutin/lu_bu/01'));
        assert.equals(JSON.stringify([true, false]), JSON.stringify(h.pauses), '播放期間暫停戰場、結束後恢復');
        assert.equals(1, placeholderCutinRegistry.list().length);
        assert.isTrue(h.warnings.some((w) => w.includes('暫代圖') && w.includes('呂布')));
        // 第二次施放（縮短重播）不再重複警告，次數累加
        await h.director.play('lu-bu', PARENT, { generalName: '呂布' });
        assert.equals(1, h.warnings.length);
        assert.equals(2, placeholderCutinRegistry.list()[0].count);
        placeholderCutinRegistry.clear();
    });

    suite.test('有專屬分鏡且播得成：播專屬的，不播暫代圖、不登記', async () => {
        placeholderCutinRegistry.clear();
        const h = makeHarness({ index: { generals: ['guan-yu'] }, config: REAL_CONFIG, loadFramesOk: true, outcomes: ['played'] });
        const outcome = await h.director.play('guan-yu', PARENT, { generalName: '關羽' });
        assert.equals('played', outcome);
        assert.equals(1, h.plays.length);
        assert.isFalse(h.plays[0].placeholder === true);
        assert.equals('ult_cutin.guan_yu', h.plays[0].config.id);
        assert.equals(0, placeholderCutinRegistry.list().length);
    });

    suite.test('列了名但分鏡圖都沒匯入（專屬播不出來）：退到暫代圖', async () => {
        placeholderCutinRegistry.clear();
        const h = makeHarness({ index: { generals: ['guan-yu'] }, config: REAL_CONFIG, loadFramesOk: false, outcomes: ['unplayable', 'played'] });
        const outcome = await h.director.play('guan-yu', PARENT, { generalName: '關羽' });
        assert.equals('played', outcome);
        assert.equals(2, h.plays.length);
        assert.isTrue(h.plays[1].placeholder === true);
        assert.equals(1, placeholderCutinRegistry.list().length);
        placeholderCutinRegistry.clear();
    });

    suite.test('玩家點擊跳過：回傳 skipped、戰場照樣恢復，不再補播', async () => {
        placeholderCutinRegistry.clear();
        const h = makeHarness({ index: { generals: [] }, outcomes: ['skipped'] });
        const outcome = await h.director.play('cao-cao', PARENT, { generalName: '曹操' });
        assert.equals('skipped', outcome);
        assert.equals(1, h.plays.length);
        placeholderCutinRegistry.clear();
    });

    suite.test('載入逾時（設定檔讀不回來）：不等下去，改播暫代圖', async () => {
        placeholderCutinRegistry.clear();
        const h = makeHarness({ loadJsonNever: true, loadTimeoutMs: 20 });
        const outcome = await h.director.play('zhang-fei', PARENT, { generalName: '張飛' });
        assert.equals('played', outcome);
        assert.isTrue(h.plays[0].placeholder === true);
        placeholderCutinRegistry.clear();
    });

    suite.test('逾時保底：演出卡住不結束時，到硬上限強制收掉疊層並解決，下一個奧義照常排隊播出', async () => {
        placeholderCutinRegistry.clear();
        const h = makeHarness({ index: { generals: [] }, outcomes: ['never', 'played'], hardTimeoutMs: 40 });
        const started = Date.now();
        const first = await h.director.play('lu-bu', PARENT, { generalName: '呂布' });
        assert.equals('skipped', first);
        assert.equals(1, h.aborts, '要呼叫強制收掉疊層');
        assert.isTrue(Date.now() - started < 1000, '不可等太久');
        const second = await h.director.play('cao-cao', PARENT, { generalName: '曹操' });
        assert.equals('played', second);
        assert.equals(2, h.plays.length);
        placeholderCutinRegistry.clear();
    });

    suite.test('硬上限預設值要大於完整版演出長度，且不超過安全解鎖時限', () => {
        const config = buildPlaceholderCutinConfig('x', 'X');
        const player = createCutinPlayer(config, { mode: 'full', hasImage: () => true });
        assert.isTrue(CUTIN_HARD_TIMEOUT_MS / 1000 > player.duration * 2);
        assert.isTrue(CUTIN_HARD_TIMEOUT_MS < 20000);
    });

    suite.test('發動奧義→演出→結算→回到可下指令：演出佔住 25 秒也不被安全解鎖誤觸發，演出一結束敵方回合照算', async () => {
        placeholderCutinRegistry.clear();
        const { ctrl, ctx, clock, flow, turn } = flowSetup();
        const before = turn();
        flow.onEndTurn();
        // 敵方回合中發動奧義：與 BattleUIBridge 相同，演出期間掛旗標、結束後（含逾時）放掉
        const h = makeHarness({ index: { generals: [] } });
        let release: (() => void) | null = null;
        h.director = new UltCutinDirector({
            loadJson: () => Promise.resolve({ generals: [] }),
            makePlaceholderFrame: () => FRAME,
            play: () => new Promise((resolve) => { release = () => resolve('played'); }),
            setPaused: () => undefined,
            warn: () => undefined,
        });
        ctx.isUltCutinActive = true;
        const done = h.director.play('lu-bu', PARENT, { generalName: '呂布' }).finally(() => { ctx.isUltCutinActive = false; });
        clock.advance(25);
        assert.isTrue(ctx.isAdvancingTurn, '演出中不可提前解鎖');
        await new Promise((r) => setTimeout(r, 10));
        assert.isTrue(release !== null, '演出已開始');
        release!();
        await done;
        clock.advance(30);
        assert.isFalse(ctx.isAdvancingTurn, '演出結束後畫面應解鎖');
        assert.isTrue(ctrl.canAdvanceBattleTurn(), '流程回到可下指令');
        assert.equals(before + 1, turn(), '敵方回合必須結算，回合數加一');
        placeholderCutinRegistry.clear();
    });

    suite.test('演出卡死被硬上限收掉後，旗標放掉、回合流程照樣走完', async () => {
        placeholderCutinRegistry.clear();
        const { ctrl, ctx, clock, flow, turn } = flowSetup();
        const before = turn();
        flow.onEndTurn();
        const h = makeHarness({ index: { generals: [] }, outcomes: ['never'], hardTimeoutMs: 30 });
        ctx.isUltCutinActive = true;
        await h.director.play('lu-bu', PARENT, { generalName: '呂布' }).finally(() => { ctx.isUltCutinActive = false; });
        clock.advance(40);
        assert.isFalse(ctx.isAdvancingTurn);
        assert.isTrue(ctrl.canAdvanceBattleTurn());
        assert.equals(before + 1, turn());
        placeholderCutinRegistry.clear();
    });

    return suite;
}
