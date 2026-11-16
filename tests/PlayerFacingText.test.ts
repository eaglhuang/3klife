/**
 * 玩家看得到的字不能有開發用語；大廳子選單每一項都要有動作對應（PROG-2-9121）
 * 禁用字清單集中在 FORBIDDEN_PLAYER_TEXT，之後要擋新字只改這一處。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { LOBBY_ACTION_NOT_OPEN_TEXT, LOBBY_CATEGORIES } from '../assets/scripts/ui/core/LobbyCityHubController';
import { createSeasonPassState } from '../assets/scripts/core/systems/SeasonPass';
import { seasonPassView } from '../assets/scripts/ui/core/SeasonPassController';
import { STAR_UP_MATERIAL_TEXT } from '../assets/scripts/ui/core/UltimateActionView';

const ROOT = path.join(__dirname, '..');

/** 開發用語（不分大小寫比對）。戰場的「暫代圖 待替換」是刻意保留，不在此檢查範圍。 */
export const FORBIDDEN_PLAYER_TEXT: readonly string[] = ['mock', '模擬', '尚未接', '未接', 'todo', 'placeholder', '測試用', 'lorem', '暫定資料'];

function offenders(text: string): string[] {
    const lower = text.toLowerCase();
    return FORBIDDEN_PLAYER_TEXT.filter((word) => lower.includes(word));
}

function readJson(rel: string): any {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

/** 收集版面 JSON 裡所有 text 欄位的字串 */
function layoutTexts(node: any, out: string[] = []): string[] {
    if (node && typeof node === 'object') {
        if (typeof node.text === 'string') out.push(node.text);
        for (const value of Object.values(node)) layoutTexts(value, out);
    }
    return out;
}

export function createPlayerFacingTextSuite(): TestSuite {
    const suite = new TestSuite('PlayerFacingText');

    suite.test('大廳子選單 22 項：每一項都有非空的動作對應', () => {
        const items = LOBBY_CATEGORIES.flatMap((c) => c.items);
        assert.equals(22, items.length);
        const source = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        const start = source.indexOf('private _runCityHubAction');
        const body = source.slice(start, source.indexOf('run[action]()', start));
        for (const item of items) {
            const line = body.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith(`${item.id}:`)) ?? '';
            const handler = line.split('=>')[1] ?? '';
            assert.isTrue(handler.replace(/[{}\s;,]/g, '').length > 0, `子選單 ${item.id} 沒有動作對應`);
        }
        assert.isTrue(source.includes('run[action]()'), '動作表要以 run[action]() 執行');
    });

    suite.test('子選單項目名稱不含開發用語，未開放的寫法一致', () => {
        for (const item of LOBBY_CATEGORIES.flatMap((c) => c.items)) {
            assert.equals(0, offenders(item.label).length, item.label);
        }
        assert.equals('此功能尚未開放', LOBBY_ACTION_NOT_OPEN_TEXT);
    });

    suite.test('通行證畫面：30 級每一頁的文字都不含開發用語', () => {
        const state = createSeasonPassState();
        for (let page = 1; page <= 30; page += 1) {
            const view = seasonPassView(state, page);
            for (const [id, text] of Object.entries(view.texts)) {
                assert.equals(0, offenders(text).length, `${id}：${text}`);
            }
        }
        assert.equals(0, offenders(Object.values(seasonPassView({ ...state, premium: true }, 1).texts).join('\n')).length);
    });

    suite.test('通行證版面預設字不含開發用語', () => {
        const texts = layoutTexts(readJson('assets/resources/ui-spec/layouts/season-pass-main.json'));
        assert.isTrue(texts.length > 0);
        for (const text of texts) assert.equals(0, offenders(text).length, text);
    });

    suite.test('升星素材說明、技能說明、NPC 好友名稱不含開發用語', () => {
        for (const text of Object.values(STAR_UP_MATERIAL_TEXT)) assert.equals(0, offenders(text).length, text);
        for (const skill of readJson('assets/resources/data/skills.json')) {
            assert.equals(0, offenders(String(skill.description ?? '')).length, `${skill.id}：${skill.description}`);
        }
        for (const friend of readJson('assets/resources/data/npc-friend-mentors.json').data) {
            assert.equals(0, offenders(String(friend.displayName ?? '')).length, String(friend.displayName));
            assert.isFalse(String(friend.displayName).includes('暫定'), String(friend.displayName));
        }
    });

    return suite;
}
