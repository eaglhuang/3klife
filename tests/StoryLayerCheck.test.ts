/**
 * StoryLayerCheck.test.ts — 角色雙故事層檢核（PROG-2-1376，STORY-05）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';

const { checkStoryLayers } = require('../tools_node/validate-story-layers.js') as {
    checkStoryLayers: (generals: unknown[]) => Array<{ id: string; message: string }>;
};

interface StoryGeneral {
    id: string;
    historicalAnecdote: string;
    bloodlineRumor: string;
    storyStripCells: Array<{ slot: string; text: string }>;
}

function sampleGeneral(): StoryGeneral {
    return {
        id: 'test-general',
        historicalAnecdote: '史書記載他少年時便以勇聞名。',
        bloodlineRumor: '民間相傳他的血脈裡藏著古老的軍魂。',
        storyStripCells: [
            { slot: 'origin', text: '出身草莽' },
            { slot: 'faction', text: '投身陣營' },
            { slot: 'role', text: '征戰沙場' },
            { slot: 'awakening', text: '覺醒之夜' },
            { slot: 'bloodline', text: '血脈回響' },
            { slot: 'future', text: '餘韻長存' },
        ],
    };
}

export function createStoryLayerCheckSuite(): TestSuite {
    const suite = new TestSuite('StoryLayerCheck (PROG-2-1376 角色雙故事層)');

    suite.test('正式資料全部通過：每位武將六格順序正確、文字與兩條敘事都非空', () => {
        const generals = JSON.parse(readFileSync(join(__dirname, '..', 'assets', 'resources', 'data', 'generals.json'), 'utf8'));
        assert.equals(0, checkStoryLayers(generals).length);
    });

    suite.test('完整樣本沒有問題', () => {
        assert.equals(0, checkStoryLayers([sampleGeneral()]).length);
    });

    suite.test('六格順序錯誤時回報', () => {
        const general = sampleGeneral();
        [general.storyStripCells[2], general.storyStripCells[3]] = [general.storyStripCells[3], general.storyStripCells[2]];
        const issues = checkStoryLayers([general]);
        assert.isTrue(issues.some((i) => i.message.includes('六格順序錯誤')));
    });

    suite.test('缺少格子或格子文字為空時回報', () => {
        const general = sampleGeneral();
        general.storyStripCells[4].text = '   ';
        general.storyStripCells.pop();
        const messages = checkStoryLayers([general]).map((i) => i.message);
        assert.isTrue(messages.some((m) => m.includes('六格順序錯誤')));
        assert.isTrue(messages.some((m) => m.includes('bloodline 格文字為空')));
    });

    suite.test('含 ??? 佔位字（格子或兩條敘事）時回報', () => {
        const general = sampleGeneral();
        general.storyStripCells[0].text = '???';
        general.bloodlineRumor = '血脈傳聞???';
        const messages = checkStoryLayers([general]).map((i) => i.message);
        assert.isTrue(messages.some((m) => m.includes('origin 格含佔位字')));
        assert.isTrue(messages.some((m) => m.includes('bloodlineRumor 含佔位字')));
    });

    suite.test('缺少 storyStripCells 或歷史趣聞為空時回報，並帶上武將 id', () => {
        const general = sampleGeneral() as Partial<StoryGeneral>;
        delete general.storyStripCells;
        general.historicalAnecdote = '';
        const issues = checkStoryLayers([general]);
        assert.isTrue(issues.every((i) => i.id === 'test-general'));
        assert.isTrue(issues.some((i) => i.message === '缺少 storyStripCells'));
        assert.isTrue(issues.some((i) => i.message === 'historicalAnecdote 為空'));
    });

    return suite;
}
