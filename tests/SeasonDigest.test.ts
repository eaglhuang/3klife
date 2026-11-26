// @spec-source → 新手前 10～20 分鐘稽核 C6（artifacts/newbie-audit-1126.md）、PM 裁決 A；PROG-2-10068
/**
 * SeasonDigest.test.ts — 首年前 2 季季報精簡：前 2 季合併、第 3 季完整、決策彈窗不被吞、信箱收到彙整。
 *
 * Unity 對照：EditMode Test，驗純邏輯與 session 存讀檔，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    EARLY_QUIET_BOND_ROWS, SEASON_DIGEST_LIMIT, appendSeasonDigest, buildChronicleDigestNote, buildMissionDigestNote, isEarlyQuietSeason,
    markSeasonDigestRead, normalizeSeasonDigest, planSeasonAdvanceFlow, seasonDigestUnreadCount, type SeasonDigestNote,
} from '../assets/scripts/core/systems/SeasonDigest';
import { mindBadgeText } from '../assets/scripts/ui/components/mind/MindRequestView';
import { SEASON_DIGEST_TEXTS, buildDigestRows } from '../assets/scripts/ui/components/mind/SeasonDigestView';
import { buildSeasonReportPanelRows, buildSeasonReportPanelTexts } from '../assets/scripts/core/systems/SeasonReportPanel';
import type { QuarterlyBattleReportRow } from '../assets/scripts/core/systems/RetireReviewCopy';

function general(id: string): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 70, str: 50, int: 50, cha: 50, luk: 10 } as unknown as GeneralConfig;
}

function note(season: number, kind: 'mission' | 'chronicle' = 'mission', read = false): SeasonDigestNote {
    return { id: `${kind}-${season}`, season, kind, args: ['a', 'b', 'c'], read };
}

function report(name: string): QuarterlyBattleReportRow {
    return { generalName: name, vitalityPct: 100, bondRecommended: true } as unknown as QuarterlyBattleReportRow;
}

const readSource = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf-8').replace(/\r\n/g, '\n');

export function createSeasonDigestSuite(): TestSuite {
    const suite = new TestSuite('SeasonDigest（PROG-2-10068：首年前 2 季季報精簡）');

    suite.test('前 2 次換季（Y1 春、夏）走精簡流程；第 3 季起恢復完整流程', () => {
        assert.isFalse(isEarlyQuietSeason(0), '開局還沒換季');
        assert.isTrue(isEarlyQuietSeason(1));
        assert.isTrue(isEarlyQuietSeason(2));
        for (const total of [3, 4, 5, 8, 40]) assert.isFalse(isEarlyQuietSeason(total), `第 ${total} 季`);
        for (const total of [1, 2]) {
            const plan = planSeasonAdvanceFlow(total);
            assert.isFalse(plan.showMissionStack, '任務回報改進信箱');
            assert.isFalse(plan.openChronicle, '市井奇遇改進信箱');
            assert.isTrue(plan.fileDigest);
            assert.equals(EARLY_QUIET_BOND_ROWS, plan.bondRowLimit, '結緣名單只列 3 位');
        }
        for (const total of [3, 4, 9]) {
            const plan = planSeasonAdvanceFlow(total);
            assert.isTrue(plan.showMissionStack);
            assert.isTrue(plan.openChronicle);
            assert.isFalse(plan.fileDigest);
            assert.equals(undefined, plan.bondRowLimit, '第 3 季起維持原樣');
        }
    });

    suite.test('戰報結緣名單：精簡季只列 3 位、其餘併成「另有 N 位」；預設仍 6 位', () => {
        const reports = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'].map(report);
        assert.equals(3, buildSeasonReportPanelRows(reports, EARLY_QUIET_BOND_ROWS).length);
        const quiet = buildSeasonReportPanelTexts('春', reports, [], '', [], undefined, EARLY_QUIET_BOND_ROWS);
        assert.isTrue(quiet['DialogCard/FooterBar/HintLabel'].includes('另有 5 位'), quiet['DialogCard/FooterBar/HintLabel']);
        assert.equals('—', quiet['DialogCard/ScrollView/ScrollContent/Row3/LineLabel'], '第 4 列起是占位');
        const full = buildSeasonReportPanelTexts('春', reports);
        assert.isTrue(full['DialogCard/FooterBar/HintLabel'].includes('另有 2 位'));
    });

    suite.test('紀要：沒任務結算不寫任務回報；季報未產生不寫奇遇；同 id 不重複；超過上限丟最舊', () => {
        assert.equals(null, buildMissionDigestNote(1, null));
        assert.equals(null, buildMissionDigestNote(1, { settled: 0, succeeded: 0, lines: [] }));
        const mission = buildMissionDigestNote(1, { settled: 2, succeeded: 1, lines: ['一', '二', '三'] });
        assert.equals('mission-1', mission?.id);
        assert.equals('一\n二', mission?.args[2], '最多帶 2 行');
        assert.equals(null, buildChronicleDigestNote(1, { season: -1, trend: '' }));
        const chronicle = buildChronicleDigestNote(1, { season: 1, trend: '袁紹坐擁河北', encounterTitle: '西域胡商', encounterDesc: '索要重金' });
        assert.equals('chronicle-1', chronicle?.id);
        assert.isFalse(chronicle?.read ?? true, '新紀要未讀');
        let list: SeasonDigestNote[] = [];
        list = appendSeasonDigest(list, mission as SeasonDigestNote);
        list = appendSeasonDigest(list, mission as SeasonDigestNote);
        assert.equals(1, list.length, '同一季同一種不重複');
        for (let s = 2; s < SEASON_DIGEST_LIMIT + 5; s += 1) list = appendSeasonDigest(list, note(s));
        assert.equals(SEASON_DIGEST_LIMIT, list.length);
        assert.isFalse(list.some((n) => n.id === 'mission-1'), '最舊的被擠掉');
    });

    suite.test('未讀數與已讀：開信箱標已讀後紅點熄滅', () => {
        let list = [note(1), note(1, 'chronicle')];
        assert.equals(2, seasonDigestUnreadCount(list));
        list = markSeasonDigestRead(list, 'mission-1');
        assert.equals(1, seasonDigestUnreadCount(list));
        list = markSeasonDigestRead(list, 'chronicle-1');
        assert.equals(0, seasonDigestUnreadCount(list));
    });

    suite.test('讀檔正規化：舊檔沒有欄位視為空；亂格式、未知種類（例如決策事件）一律丟掉', () => {
        assert.equals(0, normalizeSeasonDigest(undefined).length);
        assert.equals(0, normalizeSeasonDigest('x').length);
        const out = normalizeSeasonDigest([
            note(1), note(1), { id: 'event-1', season: 1, kind: 'event', args: [], read: false },
            { id: 'bad', season: -3, kind: 'mission', args: [], read: false }, null, { id: 'mission-2', season: 2, kind: 'mission', args: [1, 'x'], read: 'yes' },
        ]);
        assert.equals('mission-1,mission-2', out.map((n) => n.id).join(','));
        assert.equals('x', out[1].args.join(','), '非字串參數丟掉');
        assert.isFalse(out[1].read);
    });

    suite.test('信箱列：未讀在前；市井奇遇還能抉擇才出「去看看」；文字走 i18n、查不到退回 zh-TW', () => {
        const notes = [note(1, 'mission', true), { ...note(2, 'chronicle'), args: ['袁紹坐擁河北', '西域胡商', '索要重金'] }, { ...note(1, 'chronicle', true), args: ['天下', '', ''] }];
        const rows = buildDigestRows(notes, undefined, (n) => n.season === 2);
        assert.equals('chronicle-2', rows[0].id, '未讀排最前');
        assert.isTrue(rows[0].canOpen);
        assert.isTrue(rows[0].text.includes('西域胡商') && rows[0].text.includes('袁紹坐擁河北'));
        assert.isTrue(rows.slice(1).every((r) => !r.canOpen));
        assert.isTrue(rows.find((r) => r.id === 'chronicle-1')!.text.includes('只有一堆八卦'), '沒有奇遇的季報改寫成八卦句');
        const mission = rows.find((r) => r.id === 'mission-1')!;
        assert.isTrue(mission.text.startsWith('任務回報彙整：本季完成 a 件、成功 b 件'));
        const lookup = (key: string, ...args: string[]): string => (key === SEASON_DIGEST_TEXTS.open.key ? 'LOOK' : key === SEASON_DIGEST_TEXTS.ack.key ? `OK${args.length}` : key);
        const localized = buildDigestRows([{ ...note(2, 'chronicle'), args: ['t', 'e', 'd'] }], lookup, () => true)[0];
        assert.equals('LOOK', localized.openLabel);
        assert.equals('OK0', localized.ackLabel);
    });

    suite.test('四語系都有紀要與任務導讀的 key，且保留 {0}/{1}/{2} 參數', () => {
        const keys = [...Object.values(SEASON_DIGEST_TEXTS).map((e) => e.key), 'ui.mission.jargon_guide'];
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = JSON.parse(readSource(`assets/resources/i18n/${lang}.json`)) as Record<string, string>;
            for (const key of keys) assert.isTrue(typeof dict[key] === 'string' && dict[key].length > 0, `${lang} 缺 ${key}`);
            const mission = dict['ui.season_digest.mission'];
            assert.isTrue(mission.includes('{0}') && mission.includes('{1}') && mission.includes('{2}'), `${lang} mission 參數`);
            assert.isTrue(dict['ui.season_digest.chronicle_encounter'].includes('{2}'), `${lang} chronicle 參數`);
            assert.isTrue(dict['ui.mission.jargon_guide'].includes('{0}'), `${lang} 導讀參數`);
        }
    });

    suite.test('信箱改名「季報信箱」（PROG-2-10092）：標題與入口走 i18n，四語系不同字；入口數字沿用 mindBadgeText', () => {
        const zh = JSON.parse(readSource('assets/resources/i18n/zh-TW.json')) as Record<string, string>;
        assert.equals('季報信箱', zh['ui.season_digest.mailbox_title']);
        assert.equals('季報信箱', zh['ui.season_digest.mailbox_entry']);
        assert.equals('季報信箱 3', mindBadgeText(3, zh['ui.season_digest.mailbox_entry']));
        assert.equals('信箱', mindBadgeText(0), '沒給 label 維持舊字');
        const panel = readSource('assets/scripts/ui/components/mind/MindRequestPanel.ts');
        assert.isFalse(panel.includes("'武將信箱'"), '標題不再寫死字串');
    });

    suite.test('session：換季後寫入紀要；存讀檔保留未讀狀態；舊存檔沒有欄位也能讀', async () => {
        const adapter = new MemoryStorageAdapter();
        const make = (store: MemoryStorageAdapter): GameSession => {
            const s = new GameSession();
            s.setRosterStore(new InMemoryRosterStore([general('zhang-fei')]));
            s.setSaveService(new PlayerSaveService(store));
            s.setAutoSave(false);
            s.setChronicleRandom(() => 0);
            return s;
        };
        const session = make(adapter);
        await session.advanceSeason();
        const total = session.gameTime.totalSeasonsElapsed;
        assert.isTrue(planSeasonAdvanceFlow(total).fileDigest, '第 1 次換季屬精簡季');
        const chronicle = session.seasonChronicle;
        const added = session.fileSeasonDigest([
            buildMissionDigestNote(total, { settled: 1, succeeded: 1, lines: ['任務成功'] }) as SeasonDigestNote,
            buildChronicleDigestNote(total, { season: chronicle.season, trend: chronicle.trend }) as SeasonDigestNote,
        ]);
        assert.equals(2, added);
        assert.equals(0, session.fileSeasonDigest([note(total)]), '同一季同一種不重複寫入、不重複提示');
        assert.isTrue(session.seasonChronicleUnread, '季報本身仍未讀：內政日誌紅點也在');
        await session.save();
        const loaded = make(adapter);
        await loaded.load();
        assert.equals(2, loaded.seasonDigest.length);
        assert.equals(2, seasonDigestUnreadCount(loaded.seasonDigest));
        loaded.markSeasonDigestRead(`mission-${total}`);
        loaded.dismissSeasonDigest(`chronicle-${total}`);
        assert.equals(1, loaded.seasonDigest.length);
        assert.equals(0, seasonDigestUnreadCount(loaded.seasonDigest));
        const legacy = make(new MemoryStorageAdapter());
        await legacy.load();
        assert.equals(0, legacy.seasonDigest.length, '沒有欄位的舊檔視為空信箱');
    });

    suite.test('決策彈窗不被吞：換季流程只動任務回報與市井奇遇，性格事件與血統里程碑照舊開', () => {
        const scene = readSource('assets/scripts/ui/scenes/LobbyScene.ts');
        const start = scene.indexOf('private async _onClickAdvanceSeason');
        const body = scene.slice(start, scene.indexOf('private async _applyGachaMentorJournal', start));
        // followUps 仍照舊開性格事件與血統里程碑；只有季報（市井奇遇）受 flow 控制
        assert.isTrue(body.includes('this._syncSeasonEventPopup();') && body.includes('this._syncLineagePopup();'), '決策彈窗照舊');
        assert.isTrue(body.includes('flow.showMissionStack'));
        assert.isFalse(/flow\.[a-zA-Z]*(Event|Lineage)/.test(body), '精簡旗標不控制決策彈窗');
        assert.isTrue(body.includes('bondRowLimit: flow.bondRowLimit'), '戰報照開（只縮結緣名單）');
        assert.isTrue(body.includes('UIID.SeasonReport'), '戰報仍彈');
        // 紀要的種類只有純資訊報表
        const kindLine = /export type SeasonDigestKind = ([^;]+);/.exec(readSource('assets/scripts/core/systems/SeasonDigest.ts'));
        assert.equals("'mission' | 'chronicle'", kindLine?.[1]);
    });

    suite.test('信箱面板：有紀要就顯示入口、未讀紅點與去看看／知道了回呼（宿主可選接線，舊接線不受影響）', () => {
        const panel = readSource('assets/scripts/ui/components/mind/MindRequestPanel.ts');
        assert.isTrue(panel.includes('UnreadDot') && panel.includes('this._dot.active'));
        assert.isTrue(panel.includes('digest?: () => SeasonDigestNote[]'), '紀要來源是可選的');
        assert.isTrue(panel.includes('requests.length > 0 || notes.length > 0'), '只有紀要時入口也要顯示');
        const scene = readSource('assets/scripts/ui/scenes/LobbyScene.ts');
        assert.isTrue(scene.includes('openDigest: (id) => { this._openChronicleFromDigest(id); }'));
        assert.isTrue(scene.includes('if (!planSeasonAdvanceFlow(services().session.gameTime.totalSeasonsElapsed).openChronicle)'), '快進與隔天登入也走信箱');
    });

    return suite;
}
