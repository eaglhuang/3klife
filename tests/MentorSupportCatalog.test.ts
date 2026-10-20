/**
 * MentorSupportCatalog.test.ts — 教官支援卡目錄（PROG-2-0505）headless 測試
 *
 * 驗證 mentor-support-cards.json 的每筆都能通過 schema、武將 id 都存在、
 * 壞條目被回報但不擋好條目、掛載不覆蓋既有資料，且 LobbyScene 有接上載入。
 */
import { TestSuite, assert } from './TestRunner';
import { parseSupportCatalog, attachSupportToCards } from '../assets/scripts/core/systems/MentorSupportCatalog';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

/** 測試用假值（不進正式 JSON）：只為了驗證家族保底與掛載，正式值待企劃補 */
const GUAN_FIXTURE: unknown = {"General_ID": "guan-yu", "Support": {"Support_ID": "SUP_GUAN_SSR_01", "Name": "關羽", "Rarity": "SSR", "Teaching_Style": "武藝", "Stat_Bonus": {"STR": 10}, "Tactic_Inspire_Events": [{"Event_ID": "EVT_GUAN_01", "Tactic_ID": "TAC_GUAN_BLADE", "Trigger_Window": [1, 24], "Base_Rate": 0.2, "Min_Star": 0}, {"Event_ID": "EVT_GUAN_02", "Tactic_ID": "TAC_GUAN_CHARGE", "Trigger_Window": [12, 36], "Base_Rate": 0.3, "Min_Star": 2}], "Passive_Effects": [{"Effect": "TP_Bonus", "Value": 0.15, "Min_Star": 0}, {"Effect": "Training_Rate", "Value": 0.05, "Min_Star": 0}], "Friendship_Bonus": [1.0, 1.1, 1.2, 1.3, 1.4, 1.5], "Training_Effect": [1.0, 1.05, 1.1, 1.15, 1.2, 1.3], "Training_Slot_Affinity": ["STR"], "Slot_Burst_Rate": 0.55, "Synergy_Partners": [], "Source": "Gacha", "Role_Boundary": "TeachingOnly"}};

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

function card(generalId: string, support?: unknown): MentorCard {
    return {
        uid: `mentor-${generalId}`, sourceGeneralId: generalId, name: generalId, faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'], generalSnapshot: {} as GeneralConfig,
        ...(support ? { support } : {}),
    } as MentorCard;
}

export function createMentorSupportCatalogSuite(): TestSuite {
    const suite = new TestSuite('MentorSupportCatalog (教官支援卡目錄 PROG-2-0505)');

    suite.test('mentor-support-cards.json 每筆都通過 schema，且武將 id 都存在於 generals.json', () => {
        const raw = readJson<unknown[]>('assets/resources/data/mentor-support-cards.json');
        const catalog = parseSupportCatalog(raw);
        assert.equals(0, catalog.problems.length, `問題：${JSON.stringify(catalog.problems)}`);
        assert.equals(raw.length, catalog.byGeneralId.size);
        const generals = readJson<Array<{ id: string }>>('assets/resources/data/generals.json');
        const ids = new Set(generals.map((g) => g.id));
        for (const generalId of catalog.byGeneralId.keys()) {
            assert.isTrue(ids.has(generalId), `${generalId} 不在 generals.json`);
        }
    });

    suite.test('壞條目被回報，不擋其他好條目；重複 General_ID 保留先出現的', () => {
        const good = readJson<unknown[]>('assets/resources/data/mentor-support-cards.json');
        const bad = { General_ID: 'x-bad', Support: { Support_ID: 'SUP_BAD' } };
        const catalog = parseSupportCatalog([bad, ...good, good[0]]);
        assert.equals(good.length, catalog.byGeneralId.size, '好條目全部保留');
        assert.isTrue(good.length >= 1, '至少要有一筆好資料');
        assert.equals(2, catalog.problems.length, '壞條目與重複各一筆');
        assert.equals(0, catalog.problems[0].index);
        assert.isTrue(catalog.problems[1].errors.some((e) => e.includes('重複')));
    });

    suite.test('非陣列目錄回報錯誤並回傳空目錄', () => {
        const catalog = parseSupportCatalog({ not: 'array' });
        assert.equals(0, catalog.byGeneralId.size);
        assert.equals(1, catalog.problems.length);
    });

    suite.test('掛載：沒有支援卡的教官卡補上資料；已有的不覆蓋；目錄外的原樣保留', () => {
        const catalog = parseSupportCatalog([...readJson<unknown[]>('assets/resources/data/mentor-support-cards.json'), GUAN_FIXTURE]);
        const existing = { Support_ID: 'SUP_KEEP' };
        const out = attachSupportToCards([card('zhao-yun'), card('guan-yu', existing), card('cao-cao')], catalog);
        assert.equals('SUP_ZHAO_SSR_01', (out[0].support as { supportId: string }).supportId);
        assert.equals('SUP_KEEP', (out[1].support as unknown as { Support_ID: string }).Support_ID);
        assert.equals('SUP_GUAN_SSR_01', (attachSupportToCards([card('guan-yu')], catalog)[0].support as { supportId: string }).supportId);
        assert.isTrue(out[2].support === undefined);
    });

    suite.test('LobbyScene 以 resources 讀取 mentor-support-cards 並掛到教官卡載入', () => {
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8') as string;
        assert.isTrue(lobby.includes("'data/mentor-support-cards'"));
        assert.isTrue(lobby.includes('attachSupportToCards('));
    });

    return suite;
}
