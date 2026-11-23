/**
 * DevTool.test.ts — 測試工具 2.0（PROG-2-9858）
 *
 * 涵蓋：開關判斷（?dev=1／localStorage／正式版旗標／連點 7 次）、面板資料檔驗證、
 * debug.grant／setStat／advanceTime／exportSave／importSave 命令（含 E107 未綁定、參數錯誤、錢包扣到 0 為止）、
 * 兵糧調整夾在上限、預設存檔依序執行並等背景工作、操作紀錄可複製。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { createDevDebugHost, type DevHostSession } from '../assets/scripts/core/dev/DevDebugHost';
import {
    DEVTOOL_STORAGE_KEY, DevToolGate, VersionTapCounter, isDevToolBuildAllowed, parseDevParam, resolveDevToolEnabled,
    type DevToolStorage,
} from '../assets/scripts/core/dev/DevToolGate';
import { parseDevToolPanelConfig } from '../assets/scripts/core/dev/DevToolPanelConfig';
import { DevToolRunner } from '../assets/scripts/core/dev/DevToolRunner';
import { DevToolJobs, DevToolLog } from '../assets/scripts/core/dev/DevToolRuntime';
import { installOfficerFeatureUnlocks, isLobbyActionUnlocked, resetOfficerFeatureUnlocks } from '../assets/scripts/core/systems/OfficerFeatureUnlocks';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import type { IApiClient } from '../assets/scripts/shared/api/IApiClient';

const ROOT = join(__dirname, '..');
const panelJson = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/dev-tools/dev-tool-panels.json'), 'utf8')) as unknown;

class FakeStorage implements DevToolStorage {
    public readonly map = new Map<string, string>();
    public getItem(key: string): string | null { return this.map.get(key) ?? null; }
    public setItem(key: string, value: string): void { this.map.set(key, value); }
    public removeItem(key: string): void { this.map.delete(key); }
}

class FakeWallet implements WalletAuthority {
    public readonly money: Record<string, number> = { gold: 100, silver: 50, gems: 0, tickets: 3 };
    public balance(currency: string): number { return this.money[currency] ?? 0; }
    public spend(currency: string, amount: number): boolean {
        if (this.balance(currency) < amount) return false;
        this.money[currency] -= amount;
        return true;
    }
    public credit(currency: string, amount: number): void { this.money[currency] = this.balance(currency) + amount; }
    public snapshot(): Record<string, number> { return { ...this.money }; }
}

function newSession(): GameSession {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.startNewGame(5);
    return session;
}

function newBundle(opts: { withHost: boolean; session?: GameSession }) {
    const wallet = new FakeWallet();
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    bundle.setWallet(wallet);
    const session = opts.session ?? newSession();
    const log = new DevToolLog(50, () => 0);
    const jobs = new DevToolJobs();
    const calls: string[] = [];
    // 推進季數用假的：真正的季結需要完整資料載入，這裡只驗命令與宿主的串接
    const fake: DevHostSession = {
        debugAdjustMilitary: (field, delta) => session.debugAdjustMilitary(field, delta),
        debugSetStat: (key, value) => session.debugSetStat(key, value),
        debugSetOfficerTier: (tier) => { const s = session.debugSetOfficerTier(tier); return { currentTier: s.currentTier, officerExp: s.officerExp }; },
        createSnapshot: () => session.createSnapshot(),
        advanceSeason: async () => { await Promise.resolve(); calls.push('advance'); return null; },
        save: async () => { calls.push('save'); return null; },
        load: async () => { calls.push('load'); return true; },
        startNewGame: () => { calls.push('reset'); session.startNewGame(5); },
        hasSaveService: true,
    };
    if (opts.withHost) {
        bundle.setDebugHost(createDevDebugHost({ session: () => fake, jobs, log, resetRoster: () => { calls.push('clearRoster'); } }));
    }
    const api = bundle.api as unknown as IApiClient;
    return { api, bundle, wallet, session, log, jobs, calls };
}

export function createDevToolSuite(): TestSuite {
    const suite = new TestSuite('DevTool 測試工具 2.0 (PROG-2-9858)');

    suite.test('開關：預設關；?dev=1 開；localStorage 記號開；?dev=0 清記號；正式版旗標一律關', () => {
        const storage = new FakeStorage();
        assert.isTrue(!resolveDevToolEnabled({ search: '', storage, buildAllowed: true }), '預設不顯示');
        assert.isTrue(resolveDevToolEnabled({ search: '?x=1&dev=1', storage, buildAllowed: true }));
        storage.setItem(DEVTOOL_STORAGE_KEY, '1');
        assert.isTrue(resolveDevToolEnabled({ search: '', storage, buildAllowed: true }), '記號開');
        assert.isTrue(!resolveDevToolEnabled({ search: '?dev=1', storage, buildAllowed: false }), '正式版旗標排除網址');
        assert.isTrue(!resolveDevToolEnabled({ search: '', storage, buildAllowed: false }), '正式版旗標排除記號');
        assert.isTrue(!resolveDevToolEnabled({ search: '?dev=0', storage, buildAllowed: true }));
        assert.equals(null, storage.getItem(DEVTOOL_STORAGE_KEY));
        assert.equals('on', parseDevParam('?dev=1'));
        assert.equals(null, parseDevParam('?device=1'));
        assert.isTrue(!isDevToolBuildAllowed({ __3K_DEVTOOL_DISABLED__: true }));
        assert.isTrue(isDevToolBuildAllowed({}));
    });

    suite.test('DevToolGate：連點開啟寫 localStorage、可關、正式版旗標拒絕', () => {
        const storage = new FakeStorage();
        const gate = new DevToolGate(() => ({ search: '', storage, buildAllowed: true }));
        let seen: boolean | null = null;
        gate.onChange((on) => { seen = on; });
        assert.isTrue(!gate.isEnabled());
        assert.isTrue(gate.setPersisted(true));
        assert.isTrue(gate.isEnabled() && seen === true && storage.getItem(DEVTOOL_STORAGE_KEY) === '1');
        gate.setPersisted(false);
        assert.isTrue(!gate.isEnabled() && storage.getItem(DEVTOOL_STORAGE_KEY) === null);
        const locked = new DevToolGate(() => ({ search: '', storage, buildAllowed: false }));
        assert.isTrue(!locked.setPersisted(true) && !locked.isEnabled() && storage.getItem(DEVTOOL_STORAGE_KEY) === null);
    });

    suite.test('VersionTapCounter：3 秒內連點 7 次才觸發，逾時重算，觸發後歸零', () => {
        const counter = new VersionTapCounter();
        let last = { count: 0, triggered: false };
        for (let i = 0; i < 6; i++) last = counter.tap(1000 + i * 100);
        assert.isTrue(!last.triggered && last.count === 6);
        assert.isTrue(counter.tap(1700).triggered, '第 7 下觸發');
        assert.isTrue(!counter.tap(1800).triggered && counter.tap(1900).count === 2, '觸發後重算');
        const slow = new VersionTapCounter();
        for (let i = 0; i < 7; i++) last = slow.tap(i * 1000);
        assert.isTrue(!last.triggered, '超過 3 秒視窗不算連點');
    });

    suite.test('面板資料檔：驗證零錯誤、分頁齊全、預設存檔引用成立；壞項目被略過並回報', () => {
        const parsed = parseDevToolPanelConfig(panelJson);
        assert.equals(0, parsed.errors.length, parsed.errors.join('；'));
        const ids = parsed.config.tabs.map((tab) => tab.id);
        for (const id of ['resources', 'time', 'save', 'generals', 'family', 'battle', 'unlock']) assert.isTrue(ids.indexOf(id) >= 0, `缺分頁 ${id}`);
        assert.isTrue(parsed.config.tabs.filter((tab) => tab.skeleton).length >= 3, '武將／家族／戰場是骨架分頁（解鎖已接線，PROG-2-9860）');
        const resources = parsed.config.tabs.find((tab) => tab.id === 'resources');
        assert.equals(7, resources?.groups[0].items.length, '七種資源');
        assert.isTrue(Object.keys(parsed.config.presets).length === 3);
        const bad = parseDevToolPanelConfig({ tabs: [{ id: 'x', groups: [{ items: [
            { type: 'button', label: 'a', action: { kind: 'api', cmd: 'no.such' } },
            { type: 'resourceRow', resource: 'unobtainium', steps: [1] },
            { type: 'button', label: 'ok', action: { kind: 'todo' } },
        ] }] }] });
        assert.equals(2, bad.errors.length);
        assert.equals(1, bad.config.tabs[0].groups[0].items.length);
    });

    suite.test('每個 i18n key 在 zh-TW 與 en 都有', () => {
        const zh = JSON.parse(readFileSync(join(ROOT, 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        const en = JSON.parse(readFileSync(join(ROOT, 'assets/resources/i18n/en.json'), 'utf8')) as Record<string, string>;
        const config = parseDevToolPanelConfig(panelJson).config;
        const keys: string[] = ['dev.tool.title', 'dev.tool.close', 'dev.tool.input', 'dev.tool.settings.title', 'dev.tool.settings.version'];
        for (const preset of Object.values(config.presets)) keys.push(preset.labelKey);
        for (const tab of config.tabs) {
            keys.push(tab.labelKey);
            for (const group of tab.groups) {
                keys.push(group.titleKey);
                for (const item of group.items) keys.push(item.labelKey);
            }
        }
        for (const key of keys) {
            assert.isTrue(typeof zh[key] === 'string' && zh[key].length > 0, `zh-TW 缺 ${key}`);
            assert.isTrue(typeof en[key] === 'string' && en[key].length > 0, `en 缺 ${key}`);
        }
    });

    suite.test('沒綁宿主：debug.* 一律 E107，不改任何東西', async () => {
        const { api, wallet } = newBundle({ withHost: false });
        const grant = await api.cmd('debug.grant', { resource: 'gold', amount: 10 });
        assert.isTrue(isApiFail(grant) && grant.errorCode === 'E107');
        assert.equals(100, wallet.balance('gold'));
        const exported = await api.query('debug.exportSave', {});
        assert.isTrue(isApiFail(exported) && exported.errorCode === 'E107');
    });

    suite.test('debug.grant：錢包加減、扣到 0 為止、參數錯誤與玉被拒', async () => {
        const { api, wallet } = newBundle({ withHost: true });
        const add = await api.cmd<{ applied: number; balance: number }>('debug.grant', { resource: 'gold', amount: 1000 });
        assert.isTrue(!isApiFail(add) && add.result.applied === 1000 && add.result.balance === 1100);
        assert.equals(1100, wallet.balance('gold'));
        const silver = await api.cmd('debug.grant', { resource: 'silver', amount: 20 });
        assert.isTrue(!isApiFail(silver) && wallet.balance('silver') === 70);
        const over = await api.cmd<{ applied: number; balance: number }>('debug.grant', { resource: 'tickets', amount: -99 });
        assert.isTrue(!isApiFail(over) && over.result.applied === -3 && over.result.balance === 0, '扣到 0 為止');
        for (const bad of [{ resource: 'gold', amount: 0 }, { resource: 'gold', amount: 1.5 }, { resource: 'gold', amount: 2_000_000_000 }, { resource: 'nope', amount: 1 }, { resource: 'gold' }]) {
            const res = await api.cmd('debug.grant', bad);
            assert.isTrue(isApiFail(res) && res.errorCode === 'E001', `應拒絕 ${JSON.stringify(bad)}`);
        }
        const jade = await api.cmd('debug.grant', { resource: 'jade', amount: 1 });
        assert.isTrue(isApiFail(jade) && jade.errorCode === 'E107', '玉尚無儲存');
    });

    suite.test('debug.grant 兵糧：夾在 0～上限（上限是規則，讀檔會夾回）；setStat 白名單', async () => {
        const { api, session } = newBundle({ withHost: true });
        const cap = session.military.foodCap;
        const huge = await api.cmd<{ balance: number }>('debug.grant', { resource: 'food', amount: 900_000_000 });
        assert.isTrue(!isApiFail(huge) && huge.result.balance === cap);
        assert.equals(cap, session.military.food);
        const drain = await api.cmd<{ balance: number }>('debug.grant', { resource: 'troops', amount: -900_000_000 });
        assert.isTrue(!isApiFail(drain) && drain.result.balance === 0);
        const stat = await api.cmd<{ value: number }>('debug.setStat', { key: 'discoveryLevel', value: 7 });
        assert.isTrue(!isApiFail(stat) && stat.result.value === 7);
        assert.equals(7, session.createSnapshot().discoveryLevel);
        const forbidden = await api.cmd('debug.setStat', { key: 'foodCap', value: 1 });
        assert.isTrue(isApiFail(forbidden) && forbidden.errorCode === 'E001');
    });

    suite.test('debug.advanceTime：年換算 4 季、上限 40 季；只回 ack，背景推進並可等待結束', async () => {
        const { api, jobs, calls } = newBundle({ withHost: true });
        const ack = await api.cmd<{ seasons: number }>('debug.advanceTime', { unit: 'year', count: 2 });
        assert.isTrue(!isApiFail(ack) && ack.result.seasons === 8);
        assert.isTrue(jobs.busy, '命令回來時背景工作已登記');
        assert.isTrue(await jobs.whenIdle(2000));
        assert.equals(8, calls.filter((c) => c === 'advance').length);
        for (const bad of [{ unit: 'year', count: 11 }, { unit: 'day', count: 1 }, { unit: 'season', count: 0 }]) {
            const res = await api.cmd('debug.advanceTime', bad);
            assert.isTrue(isApiFail(res) && res.errorCode === 'E001', `應拒絕 ${JSON.stringify(bad)}`);
        }
    });

    suite.test('debug.exportSave／importSave：匯出可解析；匯入驗證後經 save.full 寫入並請宿主套用；壞 JSON 被拒', async () => {
        const { api, calls, jobs } = newBundle({ withHost: true });
        const out = await api.query<{ json: string; bytes: number }>('debug.exportSave', {});
        assert.isTrue(!isApiFail(out));
        const json = (out as { result: { json: string } }).result.json;
        assert.isTrue(JSON.parse(json).schemaVersion === 1);
        const back = await api.cmd('debug.importSave', { json });
        assert.isTrue(!isApiFail(back));
        assert.isTrue(await jobs.whenIdle(2000));
        assert.isTrue(calls.indexOf('load') >= 0, '宿主應重新讀檔');
        const stored = await api.query<{ snapshot: { schemaVersion: number } | null }>('save.load', {});
        assert.isTrue(!isApiFail(stored) && !!stored.result.snapshot, '存檔後端應已寫入');
        for (const bad of ['', 'not json', '{"schemaVersion":99}', '[]']) {
            const res = await api.cmd('debug.importSave', { json: bad });
            assert.isTrue(isApiFail(res) && res.errorCode === 'E001', `應拒絕 ${bad}`);
        }
    });

    suite.test('預設存檔：依序跑步驟、背景工作完成才下一步、操作紀錄可複製；失敗步驟中止', async () => {
        const { api, wallet, log, jobs, calls } = newBundle({ withHost: true });
        const config = parseDevToolPanelConfig(panelJson).config;
        const runner = new DevToolRunner({ api: () => api, config: () => config, log, jobs, local: {} });
        const ok = await runner.run({ kind: 'preset', preset: 'year1Mid' });
        assert.isTrue(ok, log.toText());
        assert.equals('reset', calls[0]);
        assert.equals(2, calls.filter((c) => c === 'advance').length);
        assert.equals(100 + 5000, wallet.balance('gold'));
        assert.equals(50 + 2000, wallet.balance('silver'));
        const text = log.toText();
        assert.isTrue(text.indexOf('debug.resetGame') >= 0 && text.indexOf('完成') >= 0, text);

        const unbound = newBundle({ withHost: false });
        const runner2 = new DevToolRunner({ api: () => unbound.api, config: () => config, log: unbound.log, jobs: unbound.jobs, local: {} });
        assert.isTrue(!await runner2.run({ kind: 'preset', preset: 'year3' }));
        assert.isTrue(unbound.log.toText().indexOf('在第 1 步中止') >= 0, '第一步失敗就中止');
        assert.isTrue(!await runner2.run({ kind: 'todo' }), 'todo 動作不執行');
    });

    suite.test('GameSession.debugAdjustMilitary／debugSetStat：夾在 0～上限、回實際變動', () => {
        const session = newSession();
        const before = session.military.food;
        const down = session.debugAdjustMilitary('food', -(before + 500));
        assert.isTrue(down.value === 0 && down.applied === -before);
        const up = session.debugAdjustMilitary('cityTroops', 10);
        assert.isTrue(up.applied <= 10 && up.value <= session.military.cityTroopsCap);
        assert.equals(3, session.debugSetStat('woundedCamp', 3));
        assert.equals(3, session.military.woundedCamp);
        assert.equals(1, session.debugSetStat('discoveryLevel', 0), '等級至少 1');
    });

    suite.test('debug.setRank／debug.unlockAll（PROG-2-9860）：寫入存檔、太守府（階 3）與招賢館（階 2）隨階位開放，可往下調、參數錯誤與未綁定被拒', async () => {
        installOfficerFeatureUnlocks(JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/officer-feature-unlocks.json'), 'utf8')));
        try {
            const unbound = newBundle({ withHost: false });
            const denied = await unbound.api.cmd('debug.setRank', { tier: 3 });
            assert.isTrue(isApiFail(denied) && denied.errorCode === 'E107', '未綁定回 E107');

            const { api, session } = newBundle({ withHost: true });
            assert.isTrue(!isApiFail(await api.cmd('debug.setRank', { tier: 1 })));
            assert.isTrue(!isLobbyActionUnlocked('governorHall', session.officerState.currentTier), '階 1 太守府鎖著');
            assert.isTrue(!isLobbyActionUnlocked('recruitHall', session.officerState.currentTier), '階 1 招賢館鎖著');

            const r2 = await api.cmd<{ tier: number; exp: number; unlockedActions: string[] }>('debug.setRank', { tier: 2 });
            assert.isTrue(!isApiFail(r2) && r2.result.tier === 2 && r2.result.unlockedActions.indexOf('recruitHall') >= 0);
            assert.isTrue(isLobbyActionUnlocked('recruitHall', session.officerState.currentTier), '階 2 招賢館開');
            assert.isTrue(!isLobbyActionUnlocked('governorHall', session.officerState.currentTier), '階 2 太守府仍鎖');

            const r3 = await api.cmd<{ tier: number; unlockedActions: string[] }>('debug.setRank', { tier: 3 });
            assert.isTrue(!isApiFail(r3) && r3.result.unlockedActions.indexOf('governorHall') >= 0);
            assert.isTrue(isLobbyActionUnlocked('governorHall', session.officerState.currentTier), '階 3 太守府開');
            assert.equals(3, session.createSnapshot().officerState?.currentTier, '寫進存檔快照');
            assert.equals('[1,2,3]', JSON.stringify(session.officerState.unlockHistory));

            const all = await api.cmd<{ tier: number }>('debug.unlockAll', {});
            assert.isTrue(!isApiFail(all) && all.result.tier === 5);
            assert.equals(5, session.officerState.currentTier);

            await api.cmd('debug.setRank', { tier: 1 });
            assert.equals(1, session.officerState.currentTier, '可往下調');
            assert.equals(0, session.officerState.officerExp);
            assert.isTrue(!isLobbyActionUnlocked('governorHall', 1), '調回 1 太守府重新上鎖');

            for (const bad of [0, 6, 2.5, '3', null]) {
                const fail = await api.cmd('debug.setRank', { tier: bad });
                assert.isTrue(isApiFail(fail) && fail.errorCode === 'E001', `tier=${String(bad)} 拒絕`);
            }
        } finally {
            resetOfficerFeatureUnlocks();
        }
    });

    suite.test('面板資料：解鎖分頁的官職按鈕全走 debug.setRank／debug.unlockAll，且 i18n 三語都有鍵', () => {
        const parsed = parseDevToolPanelConfig(panelJson);
        assert.equals(0, parsed.errors.length);
        const tab = parsed.config?.tabs.find((x) => x.id === 'unlock');
        assert.isTrue(!!tab && !tab.skeleton, '解鎖分頁不再是骨架');
        const apiCmds: string[] = [];
        const keys: string[] = [];
        for (const g of tab?.groups ?? []) {
            keys.push(g.titleKey);
            for (const item of g.items) {
                keys.push(item.labelKey);
                if (item.type === 'button' && item.action.kind === 'api') apiCmds.push(`${item.action.cmd}:${JSON.stringify(item.action.args)}`);
            }
        }
        for (let t = 1; t <= 5; t++) assert.isTrue(apiCmds.indexOf(`debug.setRank:{"tier":${t}}`) >= 0, `缺階 ${t} 按鈕`);
        assert.isTrue(apiCmds.indexOf('debug.unlockAll:{}') >= 0, '缺官職拉滿按鈕');
        for (const lang of ['zh-TW', 'zh-CN', 'en']) {
            const dict = JSON.parse(readFileSync(join(ROOT, `assets/resources/i18n/${lang}.json`), 'utf8')) as Record<string, string>;
            for (const key of keys) assert.isTrue(typeof dict[key] === 'string' && dict[key].length > 0, `${lang} 缺 ${key}`);
        }
    });

    return suite;
}
