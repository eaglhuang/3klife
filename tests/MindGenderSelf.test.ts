/**
 * MindGenderSelf.test.ts — 台詞性別化（PROG-2-10083）
 *
 * 鎖住：離線台詞模板不再寫死「某」（一律 {self}）；女武將（小喬、大喬、甄姬）所有性格×所有模板類別輸出不含「某」；
 * 男武將仍用「某／咱」；未滿 16 歲自稱「我」；同輸入同輸出。
 */
import { assert, TestSuite } from './TestRunner';
import * as Barks from '../assets/scripts/core/mind/MindBarks';
import * as Templates from '../assets/scripts/core/mind/MindLineTemplates';
import { selfOf, voiceAgeGroupOf, voiceGenderOf, voiceSlots } from '../assets/scripts/core/mind/SpeakerVoice';
import { MIND_REQUEST_KINDS, type MindEvent } from '../assets/scripts/core/mind/MindTypes';
import type { GeneralPersonalityType } from '../assets/scripts/core/models/GeneralUnit';

const TYPES: readonly GeneralPersonalityType[] = ['Brave', 'Wise', 'Loyal', 'Playful'];
const FEMALES = [
    { id: 'xiao-qiao', name: '小喬' },
    { id: 'da-qiao', name: '大喬' },
    { id: 'zhen-ji', name: '甄姬' },
];
const MALE_SELF = ['某', '咱'];
const BANNED_FOR_FEMALE = ['某', '老夫', '大丈夫', '鬚眉'];
const DUMMY = { name: '測試', cite: '第1年春的河北押運', n: '3', win: '2', fame: '10', next: '20', title: '校尉', opponent: '敵將', partner: '搭檔', label: '押運', season: '第1年春' };

/** 把匯出物件裡所有字串模板（含陣列、巢狀物件）攤平 */
function collectTemplates(mod: Record<string, unknown>): string[] {
    const out: string[] = [];
    const walk = (v: unknown): void => {
        if (typeof v === 'string') out.push(v);
        else if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    for (const [k, v] of Object.entries(mod)) {
        if (/^(BARK_|REQUEST_|REPLY_|OPINION_)/.test(k)) walk(v);
    }
    return out;
}

function allTemplates(): string[] {
    return [...collectTemplates(Barks as unknown as Record<string, unknown>), ...collectTemplates(Templates as unknown as Record<string, unknown>)];
}

function ev(partial: Partial<MindEvent> & Pick<MindEvent, 'id' | 'kind'>): MindEvent {
    return { season: 9, tags: [], valence: -2, weight: 2, ...partial } as MindEvent;
}

export function createMindGenderSelfSuite(): TestSuite {
    const suite = new TestSuite('MindGenderSelf (PROG-2-10083 台詞依性別換自稱)');

    suite.test('SpeakerVoice：性別＋性格＋年齡查表', () => {
        assert.equals('某', selfOf({ gender: '男', type: 'Brave' }));
        assert.equals('咱', selfOf({ gender: '男', type: 'Playful' }));
        assert.equals('某', selfOf({}), '缺值視為男、忠');
        assert.equals('本姑娘', selfOf({ gender: '女', type: 'Brave' }));
        assert.equals('妾身', selfOf({ gender: '女', type: 'Wise' }));
        assert.equals('妾身', selfOf({ gender: '女', type: 'Loyal' }));
        assert.equals('人家', selfOf({ gender: '女', type: 'Playful' }));
        assert.equals('我', selfOf({ gender: '女', type: 'Brave', age: 10 }));
        assert.equals('我', selfOf({ gender: '男', type: 'Wise', age: 15 }));
        assert.equals('某', selfOf({ gender: '男', type: 'Wise', age: 16 }));
        assert.equals('老夫', selfOf({ gender: '男', type: 'Playful', age: 60 }));
        assert.equals('某', selfOf({ gender: '男', type: 'Wise', age: 59 }));
        assert.equals('老身', selfOf({ gender: '女', type: 'Brave', age: 75 }));
        assert.equals('妾身', selfOf({ gender: '女', type: 'Wise', age: 59 }));
        assert.equals('ELDER', voiceAgeGroupOf(60));
        assert.equals('F', voiceGenderOf('female'));
        assert.equals('ADULT', voiceAgeGroupOf(undefined));
        assert.equals(selfOf({ gender: '女', type: 'Wise' }), voiceSlots({ gender: '女', type: 'Wise' }).self);
    });

    suite.test('模板本身不再寫死「某」，一律走 {self}', () => {
        const all = allTemplates();
        assert.isTrue(all.length > 100, '應掃到大量模板');
        const hard = all.filter((t) => t.includes('某'));
        assert.equals(0, hard.length, `寫死「某」的模板：${hard.join(' / ')}`);
        assert.isTrue(all.some((t) => t.includes('{self}')), '至少有模板使用 {self}');
    });

    suite.test('女武將：所有性格×所有模板輸出不含男性自稱', () => {
        const all = allTemplates();
        for (const f of FEMALES) {
            for (const type of TYPES) {
                for (const t of all) {
                    const text = Templates.fillSlots(t, { ...DUMMY, name: f.name, ...voiceSlots({ gender: '女', type }) });
                    for (const bad of BANNED_FOR_FEMALE) assert.isTrue(!text.includes(bad), `${f.name}/${type} 出現「${bad}」：${text}`);
                    assert.isTrue(!/\{\w+\}/.test(text), `${f.name}/${type} 有未代入槽位：${text}`);
                }
            }
        }
    });

    suite.test('男武將：模板仍可輸出「某」或「咱」', () => {
        const all = allTemplates();
        let hits = 0;
        for (const type of TYPES) {
            for (const t of all) {
                const text = Templates.fillSlots(t, { ...DUMMY, ...voiceSlots({ gender: '男', type }) });
                if (MALE_SELF.some((s) => text.includes(s))) hits++;
            }
        }
        assert.isTrue(hits > 100, '男性輸出應含某／咱');
    });

    suite.test('走完整函式：女將 requestText／replyText／opinionLine／selectBark 全不含「某」', () => {
        const advises = ['CAUTION', 'IDLE', 'WINNING', 'BOND'] as const;
        const causes = ['CAUTION', 'REDEEM', 'CONFIDENT', 'BOND', 'GRUDGE', 'MOOD_LOW', 'NONE'] as const;
        const moods = ['EAGER', 'HIGH', 'LOW', 'NORMAL'] as const;
        for (const f of FEMALES) {
            for (const type of TYPES) {
                const slots = { ...DUMMY, name: f.name, gender: '女' };
                const texts: string[] = [];
                for (let seed = 0; seed < 12; seed++) {
                    for (const kind of MIND_REQUEST_KINDS) {
                        texts.push(Templates.requestText(kind, type, slots, seed, { grudge: seed % 2 === 0, advise: advises[seed % 4] }));
                        texts.push(Templates.replyText(kind, true, type, slots, seed), Templates.replyText(kind, false, type, slots, seed));
                    }
                    for (const cause of causes) texts.push(Templates.opinionLine(cause, type, slots, seed));
                    const events = [
                        ev({ id: 'e1', kind: 'TASK_DONE', label: '河北押運', valence: -2 }),
                        ev({ id: 'e2', kind: 'BOND_FORMED', partnerId: 'ma-chao', valence: 2 }),
                    ];
                    for (const mood of moods) {
                        for (const evs of [events, [events[1]], [] as MindEvent[]]) {
                            for (const idleSeasons of [0, 99]) {
                                const line = Barks.selectBark({
                                    generalId: f.id, type, mood, events: evs, now: 10, seed, gender: '女',
                                    ledger: { idleSeasons, byTag: {} } as never,
                                    nameOf: () => '馬超',
                                });
                                texts.push(line.text);
                            }
                        }
                    }
                }
                for (const text of texts) {
                    for (const bad of BANNED_FOR_FEMALE) assert.isTrue(!text.includes(bad), `${f.name}/${type} 出現「${bad}」：${text}`);
                }
                assert.isTrue(texts.filter((t) => t.length > 0).length > 100, '應產生大量非空台詞');
            }
        }
    });

    suite.test('小喬的結緣泡泡：有馬超在旁，不再說某', () => {
        const events = [ev({ id: 'b1', kind: 'BOND_FORMED', partnerId: 'ma-chao', valence: 2, weight: 3 })];
        let said = 0;
        for (let seed = 0; seed < 60; seed++) {
            const line = Barks.selectBark({ generalId: 'xiao-qiao', type: 'Wise', mood: 'NORMAL', events, now: 10, seed, gender: '女', nameOf: () => '馬超' });
            if (line.source !== 'BOND') continue;
            said++;
            assert.isTrue(!line.text.includes('某'), line.text);
        }
        assert.isTrue(said > 0, '應至少有一次引用結緣');
    });

    suite.test('同輸入同輸出（seed 可重現）；缺性別視為男', () => {
        const a = Templates.requestText('REDEEM', 'Brave', { ...DUMMY, gender: '女' }, 7);
        const b = Templates.requestText('REDEEM', 'Brave', { ...DUMMY, gender: '女' }, 7);
        assert.equals(a, b);
        assert.isTrue(a.includes('本姑娘'), a);
        assert.isTrue(Templates.requestText('REDEEM', 'Brave', { ...DUMMY }, 7).includes('某'));
    });

    suite.test('資料檔守門：轉蛋登場台詞含男性自稱的，必須是男武將專屬（每將一句，不共用）', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const dataDir = path.resolve(__dirname, '..', 'assets', 'resources', 'data');
        const rawGenerals = JSON.parse(fs.readFileSync(path.join(dataDir, 'generals.json'), 'utf-8')) as unknown;
        const list = (Array.isArray(rawGenerals) ? rawGenerals : Object.values(rawGenerals as Record<string, unknown>)) as Array<{ id?: string; gender?: string }>;
        const genderOf = new Map(list.map((g) => [g.id, g.gender] as const));
        const lines = (JSON.parse(fs.readFileSync(path.join(dataDir, 'general-gacha-lines.json'), 'utf-8')) as { lines: Record<string, string> }).lines;
        let checked = 0;
        for (const [id, text] of Object.entries(lines)) {
            if (!/某|老夫|大丈夫|在下|鬚眉/.test(text)) continue;
            checked++;
            assert.equals('男', genderOf.get(id), `${id} 的台詞含男性自稱但不是男武將：${text}`);
        }
        assert.isTrue(checked >= 6, '至少掃到太史慈、陶謙、劉焉等男將專屬句');
    });

    return suite;
}
