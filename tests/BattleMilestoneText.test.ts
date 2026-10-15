/**
 * 戰績里程碑字串進語系表（REC-12，PROG-2-0445）
 *
 * 鎖住：每個里程碑都有 record.milestone.* key，四語系同一組；zh-TW 語系檔與 fallback 一致；
 * 語系表沒有 key 時退回 zh-TW 名稱，未知 id 回傳 id 本身。
 */
import { assert, TestSuite } from './TestRunner';
import {
    BATTLE_MILESTONES,
    MILESTONE_TEXT_FALLBACK_ZH_TW,
    localizedMilestoneName,
    milestoneTextKey,
} from '../assets/scripts/core/systems/BattleRecordStats';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;

export function createBattleMilestoneTextSuite(): TestSuite {
    const suite = new TestSuite('BattleMilestoneText (戰績里程碑字串進語系表 REC-12)');

    suite.test('六個里程碑都有 record.milestone.* key，四個語系都有同一組 key', () => {
        const keys = BATTLE_MILESTONES.map((m) => milestoneTextKey(m.id));
        assert.equals(6, keys.length);
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${loc}.json`);
            assert.equals('', keys.filter((k) => !(k in table)).join(','));
        }
    });

    suite.test('zh-TW 語系檔與 fallback 一致，fallback 與 BattleRecordStats 的 displayName 一致', () => {
        const zhTw = readJson<Record<string, string>>('assets/resources/i18n/zh-TW.json');
        for (const m of BATTLE_MILESTONES) {
            const key = milestoneTextKey(m.id);
            assert.equals(m.displayName, MILESTONE_TEXT_FALLBACK_ZH_TW[key]);
            assert.equals(m.displayName, zhTw[key]);
        }
    });

    suite.test('語系查詢命中時使用語系表；未命中（回傳 key）時退回 zh-TW 名稱', () => {
        assert.equals('Hundred Slayer', localizedMilestoneName('KILL_100', () => 'Hundred Slayer'));
        assert.equals('百人斬', localizedMilestoneName('KILL_100', (key) => key));
    });

    suite.test('未知里程碑 id 回傳 id 本身', () => {
        assert.equals('NOPE', localizedMilestoneName('NOPE', (key) => key));
    });

    return suite;
}
