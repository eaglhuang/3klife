/**
 * NpcPersonaCard.test.ts — Persona Card 結構驗證（PROG-2-0461）
 *
 * 驗證佔位資料檔能通過驗證，並確認壞資料會被逐項列出（不改輸入）。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { NPC_LINE_MAX_CHARS, validateNpcPersonaCards } from '../assets/scripts/core/systems/NpcPersonaCard';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function validCard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        General_ID: 'zhang-fei', Display_Name: '張飛', Core_Traits: ['忠義'], Voice_Style: '短句',
        Required_Tone_Tags: ['bold'], Forbidden_Claims: [], Relationship_Anchors: [],
        Safe_Fallback_Line: '此事俺記下了。', Golden_Lines: [], ...overrides,
    };
}

export function createNpcPersonaCardSuite(): TestSuite {
    const suite = new TestSuite('NpcPersonaCard (NPC-01 Persona Card 結構)');

    suite.test('佔位資料檔 npc-persona-cards.json 通過驗證，張飛卡欄位齊全', () => {
        const result = validateNpcPersonaCards(readJson('assets/resources/data/npc-persona-cards.json'));
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('張飛', result.cards['zhang-fei'].Display_Name);
        assert.equals(2, result.cards['zhang-fei'].Relationship_Anchors.length);
    });

    suite.test('核心武將 provisional 卡齊全：關係錨點都指向表內武將，台詞不超過字數上限', () => {
        const result = validateNpcPersonaCards(readJson('assets/resources/data/npc-persona-cards.json'));
        assert.isTrue(result.ok);
        if (!result.ok) return;
        for (const id of ['liu-bei', 'guan-yu', 'zhang-fei', 'zhuge-liang', 'zhao-yun', 'cao-cao']) {
            const card = result.cards[id];
            assert.isTrue(card !== undefined, `缺少 ${id}`);
            assert.equals('PROVISIONAL', card.Content_Status ?? '');
            for (const anchor of card.Relationship_Anchors) {
                assert.isTrue(result.cards[anchor.Target_General_ID] !== undefined, `${id} 錨點指向不存在的 ${anchor.Target_General_ID}`);
            }
            for (const line of card.Golden_Lines) {
                assert.isTrue([...line].length <= NPC_LINE_MAX_CHARS, `${id} 台詞過長：${line}`);
            }
        }
    });

    suite.test('缺少名稱、核心性格為空、General_ID 與 key 不一致都會被列出', () => {
        const result = validateNpcPersonaCards({
            Npc_Persona_Cards: { 'zhang-fei': validCard({ Display_Name: '', Core_Traits: [], General_ID: 'guan-yu' }) },
        });
        assert.isFalse(result.ok);
        const paths = result.issues.map((issue) => issue.path);
        assert.isTrue(paths.includes('Npc_Persona_Cards.zhang-fei.Display_Name'));
        assert.isTrue(paths.includes('Npc_Persona_Cards.zhang-fei.Core_Traits'));
        assert.isTrue(paths.includes('Npc_Persona_Cards.zhang-fei.General_ID'));
    });

    suite.test('安全回退句超過字數上限不通過；關係錨點缺欄位會指出路徑', () => {
        const tooLong = '啊'.repeat(NPC_LINE_MAX_CHARS + 1);
        const result = validateNpcPersonaCards({
            Npc_Persona_Cards: {
                'zhang-fei': validCard({
                    Safe_Fallback_Line: tooLong,
                    Relationship_Anchors: [{ Target_General_ID: 'liu-bei', Relation: '義兄' }],
                }),
            },
        });
        assert.isFalse(result.ok);
        const paths = result.issues.map((issue) => issue.path);
        assert.isTrue(paths.includes('Npc_Persona_Cards.zhang-fei.Safe_Fallback_Line'));
        assert.isTrue(paths.includes('Npc_Persona_Cards.zhang-fei.Relationship_Anchors[0].Tone'));
    });

    suite.test('缺少 Npc_Persona_Cards 或表為空都不通過，且不改輸入', () => {
        const empty = { Npc_Persona_Cards: {} };
        const snapshot = JSON.stringify(empty);
        assert.isFalse(validateNpcPersonaCards({}).ok);
        assert.isFalse(validateNpcPersonaCards(empty).ok);
        assert.equals(snapshot, JSON.stringify(empty));
    });

    return suite;
}
