// @spec-source → 戰場右側 UI B0 缺陷（PROG-2-10124）：不經大廳進戰場時語系字串沒載入、委任鈕字被截、寫死中文
/**
 * BattleI18nB0.test.ts
 *
 * 鎖住：
 *  1. I18nSystem.ensureLoaded：未載入時載入並通知訂閱者；已載入不重載。
 *  2. ActionCommandComposite 訂閱 onLocaleChanged：語系字串晚到時奧義標籤從鍵名自動重繪；onDestroy 取消訂閱不漏。
 *  3. BattleScene 啟動時呼叫 ensureLoaded（戰場入口確保語系載入）。
 *  4. battle.log.delegate 四語系都是 2 字內可放進 72px 鈕的詞（不再是單字「委」）。
 *  5. 新增的戰場 HUD key 四語系齊全、佔位符一致。
 */
import { TestSuite, assert } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import { I18nSystem } from '../assets/scripts/core/systems/I18nSystem';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8'));
const placeholders = (text: string): string => (text.match(/\{\d+\}/g) ?? []).sort().join(',');

/** 建一個不碰 resources 的 I18nSystem：loadJson 換成讀本機檔，並計次 */
function makeI18n(): { i18n: I18nSystem; loads: () => number } {
    const i18n = new I18nSystem();
    let loads = 0;
    (i18n as any).loadJson = async (p: string) => {
        loads++;
        return readLocale(p.replace('i18n/', ''));
    };
    (i18n as any).loadFont = async () => { throw new Error('no font'); };
    return { i18n, loads: () => loads };
}

const BATTLE_KEYS = [
    'battle.tactics', 'battle.tactics.points', 'battle.tactics.points_full', 'battle.tactics.limited',
    'battle.tactics.blocked', 'battle.tactics.blocked_generic', 'battle.hud.locked',
    'battle.hud.sp_preparing', 'battle.hud.ult_value_preparing', 'battle.hud.ult_preparing',
    'battle.hud.ult_cost', 'battle.hud.ult_castable', 'battle.hud.ult_charging', 'battle.hud.settings_load_failed',
];

export function createBattleI18nB0Suite(): TestSuite {
    const suite = new TestSuite('BattleI18nB0 (戰場右側 UI B0：i18n 載入與寫死字 PROG-2-10124)');

    suite.test('ensureLoaded：未載入時 t(key) 回傳鍵名；載入後回傳譯文並通知訂閱者；再呼叫不重載', async () => {
        const { i18n, loads } = makeI18n();
        assert.isFalse(i18n.isLoaded);
        assert.equals('ui.ultimate.label', i18n.t('ui.ultimate.label'));
        let notified = 0;
        i18n.onLocaleChanged(() => { notified++; });
        await i18n.ensureLoaded();
        assert.isTrue(i18n.isLoaded);
        assert.equals('奧義', i18n.t('ui.ultimate.label'));
        assert.equals(1, notified);
        await i18n.ensureLoaded();
        assert.equals(1, loads(), '已載入不得重載');
        assert.equals(1, notified);
    });

    suite.test('ActionCommandComposite：語系字串晚到時奧義標籤自動重繪，onDestroy 取消訂閱', async () => {
        const { Label } = require('cc');
        const { ActionCommandComposite } = require('../assets/scripts/ui/components/ActionCommandComposite');
        const { i18n } = makeI18n();
        const realI18n = services().i18n;
        Object.defineProperty(services(), 'i18n', { value: i18n, configurable: true });
        try {
            const ultLabel = new Label();
            const cmd: any = Object.create(ActionCommandComposite.prototype);
            Object.assign(cmd, {
                _spRingSprite: null, _tacticsLabel: null, _ultimateBtnNode: null, _spPctLabel: null,
                _unsubs: [], _readyWaiters: [], _usedUltimateSkillIds: new Set(),
                _maxSp: 100, _currentSp: 100, _tacticEnabled: true, _tacticsButtonCaption: '', _duelLocked: false,
                _duelLockedText: '', _duelLabelText: null, _duelButtonNode: null, _lastTacticSummary: null,
                _unsubLocaleRefresh: null, _isMounted: true, node: { children: [] },
            });
            cmd._setReadyPulse = () => undefined;
            cmd.unmount = () => undefined;
            const binder = { getNode: () => null, getLabel: (n: string) => (n === 'UltLabel' ? ultLabel : null) };
            cmd._onAfterBuildReady(binder);
            assert.equals('ui.ultimate.ready', ultLabel.string, '語系未載入時只會是鍵名（修前現象）');
            assert.equals(1, (i18n as any).changeHandlers.length, '應訂閱語系切換');

            await i18n.ensureLoaded();
            assert.equals('發動', ultLabel.string, '語系載入後應自動重繪成譯文，不得殘留鍵名');

            cmd._currentSp = 10;
            await i18n.setLocale('en');
            assert.equals('Ultimate', ultLabel.string, '切換語系要跟著換');

            ActionCommandComposite.prototype.onDestroy.call(cmd);
            assert.equals(0, (i18n as any).changeHandlers.length, 'onDestroy 必須取消訂閱');
        } finally {
            Object.defineProperty(services(), 'i18n', { value: realI18n, configurable: true });
        }
        void Faction;
    });

    suite.test('ActionCommandComposite：計謀鈕字走 i18n（四語系），不再寫死「計謀／點／受限」', async () => {
        const { ActionCommandComposite } = require('../assets/scripts/ui/components/ActionCommandComposite');
        const expected: Record<string, [string, string, string]> = {
            'zh-TW': ['計謀\n3點', '計謀\n受限', '計謀'],
            'zh-CN': ['计谋\n3点', '计谋\n受限', '计谋'],
            en: ['Tactics\n3 pts', 'Tactics\nLocked', 'Tactics'],
            ja: ['計略\n3点', '計略\n制限', '計略'],
        };
        const realI18n = services().i18n;
        try {
            for (const lang of LANGS) {
                const { i18n } = makeI18n();
                await i18n.setLocale(lang as any);
                Object.defineProperty(services(), 'i18n', { value: i18n, configurable: true });
                const host: any = { _tacticsButton: null, _tacticsLabel: { string: '' }, _tacticsEnabledColor: null };
                ActionCommandComposite.prototype.setTacticSummary.call(host, '火攻', { current: 3, max: 8, enabled: true });
                assert.equals(expected[lang][0], host._tacticsLabel.string, lang);
                ActionCommandComposite.prototype.setTacticSummary.call(host, '火攻', { enabled: false }, '大雨');
                assert.equals(expected[lang][1], host._tacticsLabel.string, lang);
                ActionCommandComposite.prototype.setTacticSummary.call(host, '火攻', { enabled: true });
                assert.equals(expected[lang][2], host._tacticsLabel.string, lang);
            }
        } finally {
            Object.defineProperty(services(), 'i18n', { value: realI18n, configurable: true });
        }
    });

    suite.test('BattleScene 啟動時確保語系已載入（戰場入口 ensureLoaded）', () => {
        const src = fs.readFileSync(path.join(ROOT, 'assets/scripts/battle/views/BattleScene.ts'), 'utf8');
        const init = src.indexOf('services().initialize(this.node);');
        const ensure = src.indexOf('services().i18n.ensureLoaded()');
        assert.isTrue(init >= 0 && ensure > init, 'ensureLoaded 必須在 services().initialize 之後呼叫');
    });

    suite.test('battle.log.delegate 四語系皆為兩字內詞，版型後備字同為「委任」', () => {
        const expected: Record<string, string> = { 'zh-TW': '委任', 'zh-CN': '委任', en: 'Auto', ja: '委任' };
        for (const lang of LANGS) {
            const v = readLocale(lang)['battle.log.delegate'];
            assert.equals(expected[lang], v, lang);
            assert.isFalse(v.startsWith('['), `${lang} 不得帶占位前綴`);
        }
        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/battle-log-main.json'), 'utf8'));
        const find = (n: any): any => (n.name === 'DelegateText' ? n : (n.children ?? []).map(find).find(Boolean));
        assert.equals('委任', find(layout.root).text);
        // 版型原用左對齊的 log.label.title，字貼左緣像被截；改用置中的 log.label.btn
        assert.equals('log.label.btn', find(layout.root).styleSlot);
        const skin = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/skins/battle-log-default.json'), 'utf8'));
        assert.equals('CENTER', skin.slots['log.label.btn'].horizontalAlign);
    });

    suite.test('新增戰場 HUD key：四語系齊全、無占位前綴、佔位符與 zh-TW 一致', () => {
        const base = readLocale('zh-TW');
        for (const lang of LANGS) {
            const locale = readLocale(lang);
            for (const key of BATTLE_KEYS) {
                assert.isTrue(typeof locale[key] === 'string' && locale[key].length > 0, `${lang} 缺 ${key}`);
                assert.equals(placeholders(base[key]), placeholders(locale[key]), `${lang} ${key} 佔位符不一致`);
            }
        }
    });

    suite.test('寫死中文已移出：ActionCommandComposite / BattleHUDComposite 不再含「SP 準備中」「受限」「設定載入失敗」字面', () => {
        const action = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/ActionCommandComposite.ts'), 'utf8');
        const hud = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/BattleHUDComposite.ts'), 'utf8');
        for (const lit of ["'受限'", "'計謀'", '點不足或本回合已用過`', "'鎖定'"]) assert.isFalse(action.includes(lit), `ActionCommandComposite 仍含 ${lit}`);
        for (const lit of ["'SP 準備中'", "'奧義準備中'", "'奧義可施放'", "'奧義蓄力中'", "'設定載入失敗"]) assert.isFalse(hud.includes(lit), `BattleHUDComposite 仍含 ${lit}`);
    });

    return suite;
}
