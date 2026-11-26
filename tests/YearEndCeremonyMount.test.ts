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
        const high = buildYearEndCeremonyResult(1, 1200, '本府');
        assert.equals(high.standings.length, 4);
        assert.equals(high.playerRank, 2);
        assert.equals(high.playerReward.gold, 1200);
        const low = buildYearEndCeremonyResult(1, 0, '本府');
        assert.equals(low.playerRank, 4);
        assert.equals(low.playerReward.gold, 500);
    });

    suite.test('三幕文字在四語系都沒有原始 key 與殘留佔位（前三名／落榜／驚喜獎）', () => {
        const scenarios = [
            buildYearEndCeremonyResult(1, 1200, 'H'),
            buildYearEndCeremonyResult(2, 0, 'H'),
            buildYearEndCeremonyResult(3, 1200, 'H', ['dark_horse']),
            buildYearEndCeremonyResult(2, 1200, 'H', ['spoiled']),
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
        const surprise = buildYearEndCeremonyResult(1, 1200, 'H', ['dark_horse']);
        assert.isTrue(ceremonyActDialogue(surprise, 3, t).includes('500'));
        const plain = buildYearEndCeremonyResult(1, 1200, 'H');
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
        for (const id of ['ycTitle', 'ycStandings', 'ycDialogue', 'ycReward', 'btnYcSkip', 'btnYcClose', 'btnYcSkipLabel', 'btnYcCloseLabel']) {
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
        assert.isTrue(tokens.length >= 3);
        const themeText = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/themes/theme-registry.json'), 'utf8');
        for (const token of tokens) {
            assert.isTrue(themeText.includes(`"${token}"`), `主題沒有 token ${token}`);
        }
    });

    return suite;
}
