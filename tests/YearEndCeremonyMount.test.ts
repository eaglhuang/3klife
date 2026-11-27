/**
 * YearEndCeremonyMount.test.ts — 年終頒獎典禮掛載（PROG-2-10046）
 * 資料組裝、三幕文字（四語系無原始 key／殘留佔位）、播放時間、持久化旗標、畫面規格與主題登錄。
 */
import * as fs from 'fs';
import * as path from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import {
    CEREMONY_ACT_SECONDS,
    CEREMONY_MAX_TOTAL_SECONDS,
    buildYearEndCeremonyResult,
    ceremonyActDialogue,
    ceremonyActHeadline,
    ceremonyStandingsText,
    type CeremonyAct,
} from '../assets/scripts/core/systems/YearEndCeremonyRuntime';

/** 湊出剛好 score 分的原料（只動年收入：分數 = 850 + 年收入×0.1，基底 850，PM 11/26 校準），score 須 ≥ 850 */
function inputForScore(score: number) {
    return { annualIncome: (score - 850) * 10, prestige: 0, childCount: 0, spouseCount: 0, academyScore: 0 };
}

const ROOT = path.resolve(__dirname, '..');
const readJson = <T = any>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];
const generals = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];

function collectIds(node: any, out: Set<string>): void {
    if (node?.id) out.add(node.id);
    for (const child of node?.children ?? []) collectIds(child, out);
}

function translatorOf(locale: string): (key: string, ...args: string[]) => string {
    const table = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
    return (key, ...args) => (table[key] ?? key).replace(/\{(\d+)\}/g, (_m, i) => args[Number(i)] ?? '');
}

async function freshSession(adapter = new MemoryStorageAdapter()): Promise<GameSession> {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    await session.startNewGameWithStarters(1, generals);
    return session;
}

export function createYearEndCeremonyMountSuite(): TestSuite {
    const suite = new TestSuite('YearEndCeremonyMount');

    suite.test('三幕停留合計不超過 30 秒', () => {
        const total = CEREMONY_ACT_SECONDS.reduce((a, b) => a + b, 0);
        assert.isTrue(total <= CEREMONY_MAX_TOTAL_SECONDS, `合計 ${total} 秒`);
    });

    suite.test('結算：4 位名門，玩家名次與獎勵取自 YearEndRankingService 真資料', () => {
        const high = buildYearEndCeremonyResult(1, inputForScore(1300), '本府');
        assert.equals(high.standings.length, 5);
        assert.equals(high.playerRank, 1);
        assert.equals(high.playerReward.gold, 2000);
        const mid = buildYearEndCeremonyResult(1, inputForScore(1100), '本府');
        assert.equals(mid.playerRank, 3);
        assert.equals(mid.playerReward.gold, 1000);
        const low = buildYearEndCeremonyResult(1, inputForScore(850), '本府');
        assert.equals(low.playerRank, 5);
        assert.equals(low.playerReward.gold, 500);
    });

    suite.test('三幕文字在四語系都沒有原始 key 與殘留佔位（前三名／落榜／驚喜獎）', () => {
        const scenarios = [
            buildYearEndCeremonyResult(1, inputForScore(1200), 'H'),
            buildYearEndCeremonyResult(2, inputForScore(850), 'H'),
            buildYearEndCeremonyResult(3, inputForScore(1200), 'H', { lastYearScore: 800, childInteractions: 0 }),
            buildYearEndCeremonyResult(2, inputForScore(1200), 'H', { lastYearScore: null, childInteractions: 3 }),
        ];
        for (const locale of LOCALES) {
            const t = translatorOf(locale);
            for (const result of scenarios) {
                const texts: string[] = [ceremonyStandingsText(result, t)];
                for (const act of [1, 2, 3] as CeremonyAct[]) {
                    texts.push(ceremonyActHeadline(act, t), ceremonyActDialogue(result, act, t));
                }
                texts.push(t('ui.ceremony.title', '1'), t('ui.ceremony.reward', '1', '2'), t('ui.ceremony.skip'), t('ui.ceremony.close'));
                for (const text of texts) {
                    assert.isTrue(text.length > 0, `${locale} 出現空字串`);
                    assert.isFalse(/ui\.ceremony\./.test(text), `${locale} 殘留原始 key：${text}`);
                    assert.isFalse(/\{\d+\}/.test(text), `${locale} 殘留佔位：${text}`);
                }
            }
        }
    });

    suite.test('第 3 幕：有驚喜獎念賀詞，沒有念明年展望（帶明年冠軍賞）', () => {
        const t = translatorOf('zh-TW');
        const surprise = buildYearEndCeremonyResult(2, inputForScore(1200), 'H', { lastYearScore: 800, childInteractions: 0 });
        assert.isTrue(ceremonyActDialogue(surprise, 3, t).includes('500'));
        const plain = buildYearEndCeremonyResult(1, inputForScore(1200), 'H');
        assert.isTrue(ceremonyActDialogue(plain, 3, t).includes('2300'));
    });

    suite.test('「已看過」旗標：新局 false；標記後存檔讀回為 true；舊檔缺欄位視為沒看過', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await freshSession(adapter);
        assert.isFalse(session.yearEndCeremonySeen);
        await session.markYearEndCeremonySeen();
        assert.isTrue(session.yearEndCeremonySeen);
        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.isTrue(restored.yearEndCeremonySeen);

        const old = JSON.parse(JSON.stringify(session.createSnapshot()));
        delete old.resources.yearEndCeremonySeen;
        const oldSave = new PlayerSaveService(new MemoryStorageAdapter());
        await oldSave.save(old);
        const loaded = new GameSession(3);
        loaded.setRosterStore(new InMemoryRosterStore([]));
        loaded.setSaveService(oldSave);
        assert.isTrue(await loaded.load());
        assert.isFalse(loaded.yearEndCeremonySeen);
    });

    suite.test('畫面規格：LobbyScene 綁的節點 id 存在、皮膚登記 settle 家族、顏色只用存在的 token', () => {
        const ids = new Set<string>();
        collectIds(readJson('assets/resources/ui-spec/layouts/year-end-ceremony-main.json').root, ids);
        for (const id of ['ycStage', 'ycDialogue', 'ycReward', 'btnYcSkip', 'btnYcClose', 'btnYcSkipLabel', 'btnYcCloseLabel']) {
            assert.isTrue(ids.has(id), `缺節點 ${id}`);
        }
        const registry = readJson('assets/resources/ui-spec/themes/theme-registry.json');
        const settle = registry.familyBindings.settle;
        assert.isTrue(settle.appliesToSkins.includes('year-end-ceremony-screen.skin'));
        for (const slot of Object.keys(readJson('assets/resources/ui-spec/skins/year-end-ceremony-screen.skin.json').slots)) {
            assert.isTrue(!!settle.slotRoles[slot], `${slot} 沒有 settle 角色對應`);
        }
        const panelSrc = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/YearEndCeremonyPanel.ts'), 'utf8');
        const tokens = [...panelSrc.matchAll(/token\('(settle\.[a-z.]+)'/g)].map((m) => m[1]);
        assert.isTrue(tokens.length >= 2);
        const themeText = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/themes/theme-registry.json'), 'utf8');
        for (const token of tokens) {
            assert.isTrue(themeText.includes(`"${token}"`), `主題沒有 token ${token}`);
        }
    });

    // ── 擋輸入護欄（PROG-2-10054）：典禮宿主 YearEndCeremonyHost 帶 BlockInputEvents，
    //    只有「播放中／等玩家收下賞賜」才允許作用中；未播放、已關閉都必須 active=false，否則會擋住結算彈窗關閉鈕與底欄 ──
    const lobbySrc = (): string => fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
    const methodBody = (src: string, signature: RegExp): string => {
        const start = src.search(signature);
        assert.isTrue(start >= 0, `找不到方法 ${signature}`);
        const open = src.indexOf('{', start);
        let depth = 0;
        for (let i = open; i < src.length; i++) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
        }
        throw new Error(`方法 ${signature} 沒有結尾`);
    };

    suite.test('擋輸入護欄：掛載完成時典禮宿主 active=false（未播放不擋輸入）', () => {
        const body = methodBody(lobbySrc(), /private async _mountYearEndCeremony\(/);
        const tail = body.slice(body.lastIndexOf('this._ceremonyPanel = panel;'));
        assert.isTrue(/host\.node\.active = false;/.test(tail), '_mountYearEndCeremony 結尾沒有把宿主收起');
    });

    suite.test('擋輸入護欄：只有 _openYearEndCeremony 會把典禮宿主打開，且必須有待播年份才開', () => {
        const src = lobbySrc();
        const opener = methodBody(src, /private _openYearEndCeremony\(/);
        assert.isTrue(/year <= 0\) return false/.test(opener), '沒有待播年份仍會開典禮');
        assert.isTrue(/host\.node\.active = true/.test(opener));
        // 其他地方不得再把 _ceremonyHost 設成 active=true
        const stripped = src.replace(opener, '');
        assert.isFalse(/_ceremonyHost[^;\n]*\.active\s*=\s*true/.test(stripped), '有別處把 _ceremonyHost 打開');
    });

    suite.test('擋輸入護欄：收下賞賜成功後一定走 _closeYearEndCeremony 收起宿主，關閉就是 active=false', () => {
        const src = lobbySrc();
        const close = methodBody(src, /private _closeYearEndCeremony\(/);
        assert.isTrue(/_ceremonyHost\.node\.active = false/.test(close));
        const claim = methodBody(src, /private async _claimYearEndCeremonyReward\(/);
        assert.isTrue(/this\._closeYearEndCeremony\(\)/.test(claim), '收下賞賜成功後沒有關閉宿主');
        assert.isTrue(/finally\s*\{[^}]*_ceremonyClaiming = false/.test(claim), '領取旗標沒有在 finally 釋放，失敗後會卡死');
    });

    suite.test('擋輸入護欄：典禮面板播放中收下鈕隱藏；播完或跳過一律走 _finish 釋放（收下鈕出現、播放旗標歸零、完成回呼只觸發一次）', () => {
        const src = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/YearEndCeremonyPanel.ts'), 'utf8');
        const bind = methodBody(src, /public bindRankingResult\(/);
        assert.isTrue(/_playing = true/.test(bind) && /closeButton\.active = false/.test(bind), '開播時要隱藏收下鈕');
        const finish = methodBody(src, /private _finish\(/);
        assert.isTrue(/_playing = false/.test(finish), '收尾沒有清播放旗標');
        assert.isTrue(/closeButton\.active = true/.test(finish), '收尾沒有露出收下鈕，玩家會被宿主卡住');
        assert.isTrue(/_onFinished = null/.test(finish), '完成回呼沒有只觸發一次');
        const tick = methodBody(src, /public tick\(/);
        assert.isTrue(/this\._finish\(\)/.test(tick), '第 3 幕時間到沒有收尾');
        const skip = methodBody(src, /public skip\(/);
        assert.isTrue(/_canSkip/.test(skip) && /this\._finish\(\)/.test(skip), '跳過沒有走 _finish 或沒擋首次');
    });

    suite.test('實跑腳本護欄：playtest-online 認得典禮（等播完按收下賞賜）且殘留檢查含 YearEndCeremonyHost', () => {
        const tool = fs.readFileSync(path.join(ROOT, 'tools_node/playtest-online.js'), 'utf8');
        assert.isTrue(tool.includes("'^BtnYcClose$'"), 'playtest-online 沒有處理「收下賞賜」');
        assert.isTrue(/settleYearEndCeremony\(\);\s*\n\s*const closers/.test(tool), 'backToLobbyBar 開頭沒有先收掉典禮');
        assert.isTrue(/\|YearEndCeremonyHost\)\$'\)\)/.test(tool), '彈窗殘留檢查沒有包含 YearEndCeremonyHost');
    });

    return suite;
}
