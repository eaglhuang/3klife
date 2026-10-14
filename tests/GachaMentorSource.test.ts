/**
 * GachaMentorSource.test.ts — 轉蛋抽到支援卡產生 Gacha 來源教官卡（PROG-2-0506）headless 測試
 *
 * 純邏輯部分直接驗證；LegacyService 與 LobbyScene 的接線以文字檢查確認有呼叫。
 */
import { TestSuite, assert } from './TestRunner';
import {
    addGachaMentorCards,
    mentorCardFromGachaDraw,
    parseSupportCatalog,
} from '../assets/scripts/core/systems/MentorSupportCatalog';
import { mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const TIME = { currentYear: 2, currentSeason: 1 };

function general(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', str: 90, int: 40, lea: 70, pol: 30, cha: 50, luk: 60, hiddenFlags: [], genes: [] } as unknown as GeneralConfig;
}

function catalog() {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/mentor-support-cards.json'), 'utf8')) as unknown[];
    const result = parseSupportCatalog(raw);
    assert.equals(0, result.problems.length);
    return result;
}

export function createGachaMentorSourceSuite(): TestSuite {
    const suite = new TestSuite('GachaMentorSource (轉蛋支援卡來源 PROG-2-0506)');

    suite.test('抽到支援卡武將：產生 Gacha 來源的教官卡，帶支援資料，時間用抽卡當下', () => {
        const drawn = [general('zhao-yun', '趙雲')];
        const cards = addGachaMentorCards([], drawn, catalog(), TIME);
        assert.equals(1, cards.length);
        assert.equals('Gacha', cards[0].source!);
        assert.equals('mentor-zhao-yun', cards[0].uid);
        assert.equals('SUP_ZHAO_SSR_01', (cards[0].support as { supportId: string }).supportId);
        assert.equals(TIME.currentSeason, cards[0].retiredSeason);
        assert.equals(TIME.currentYear, cards[0].retiredYear);
    });

    suite.test('抽到非支援卡武將：不產生教官卡', () => {
        const cards = addGachaMentorCards([], [general('cao-cao', '曹操')], catalog(), TIME);
        assert.equals(0, cards.length);
    });

    suite.test('同一武將重複抽到不重複新增；已有的退役來源卡保留原來源', () => {
        const retired: MentorCard = { ...mentorCardFromGachaDraw(general('zhao-yun', '趙雲'), (catalog().byGeneralId.get('zhao-yun'))!, TIME), source: 'Retire' };
        const cards = addGachaMentorCards([retired], [general('zhao-yun', '趙雲'), general('zhao-yun', '趙雲')], catalog(), TIME);
        assert.equals(1, cards.length);
        assert.equals('Retire', cards[0].source!);
    });

    suite.test('不改傳入的持有清單', () => {
        const holdings: MentorCard[] = [];
        addGachaMentorCards(holdings, [general('zhao-yun', '趙雲')], catalog(), TIME);
        assert.equals(0, holdings.length);
    });

    suite.test('轉蛋產生的教官卡可以直接用於培育（帶靈感資料）', () => {
        const card = addGachaMentorCards([], [general('zhao-yun', '趙雲')], catalog(), TIME)[0];
        const mentor = mentorFromCard(card);
        assert.isTrue(mentor.inspire !== undefined);
        assert.equals(4, mentor.inspire!.events.length);
    });

    suite.test('LegacyService 與 LobbyScene 都有接上轉蛋產生教官卡', () => {
        const legacy = fs.readFileSync(path.join(ROOT, 'assets/scripts/core/services/LegacyService.ts'), 'utf8') as string;
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8') as string;
        assert.isTrue(legacy.includes('public async addGachaMentors('));
        assert.isTrue(lobby.includes('addGachaMentors('));
    });

    return suite;
}
