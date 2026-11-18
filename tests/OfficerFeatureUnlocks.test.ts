/**
 * OfficerFeatureUnlocks — 官職晉升解鎖節奏（PROG-2-9151）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    buildRankUnlockPopupView,
    installOfficerFeatureUnlocks,
    isFeatureUnlocked,
    isLobbyActionUnlocked,
    lobbyActionLock,
    lockedActionLabel,
    newlyUnlocked,
    nextRankPreview,
    nextRankPreviewLine,
    parseOfficerFeatureUnlocks,
    RANK_UNLOCK_POPUP_ROWS,
    resetOfficerFeatureUnlocks,
} from '../assets/scripts/core/systems/OfficerFeatureUnlocks';
import { buildLobbyCityHubView, LOBBY_CATEGORIES } from '../assets/scripts/ui/core/LobbyCityHubController';
import { buildSeasonReportPanelTexts } from '../assets/scripts/core/systems/SeasonReportPanel';

const DATA = path.resolve(__dirname, '../assets/resources/data/officer-feature-unlocks.json');
const UI_SPEC = path.resolve(__dirname, '../assets/resources/ui-spec');
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

interface SpecNode { id?: string; children?: SpecNode[] }
function ids(node: SpecNode, out = new Set<string>()): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) ids(child, out);
    return out;
}

const CORE_ACTIONS = ['battle', 'hallBoard', 'gacha', 'generalList', 'bonding'];

export function createOfficerFeatureUnlocksSuite(): TestSuite {
    const suite = new TestSuite('OfficerFeatureUnlocks (官職晉升解鎖節奏 PROG-2-9151)');
    const load = (): void => {
        const result = installOfficerFeatureUnlocks(readJson(DATA));
        assert.isTrue(result.ok, `資料檔驗證：${result.ok ? '' : (result as { issues: string[] }).issues.join('；')}`);
    };

    suite.test('資料檔通過驗證；選單上每個功能 id 都有登記，且 lobbyAction 都是真的選單項目', () => {
        load();
        const actions = LOBBY_CATEGORIES.flatMap((c) => c.items.map((i) => i.id as string));
        for (const action of actions) assert.isTrue(lobbyActionLock(action, 1).locked || isLobbyActionUnlocked(action, 1), action);
        const parsed = parseOfficerFeatureUnlocks(readJson(DATA));
        assert.isTrue(parsed.ok);
        if (!parsed.ok) return;
        for (const f of parsed.features) if (f.lobbyAction) assert.isTrue(actions.includes(f.lobbyAction), `未知 lobbyAction ${f.lobbyAction}`);
        // 22 個選單項目全部有對應功能，漏登記會永遠全開
        for (const action of actions) assert.isTrue(parsed.features.some((f) => f.lobbyAction === action), `選單項目 ${action} 沒有登記解鎖階位`);
    });

    suite.test('核心功能（任務、轉蛋、武將名冊、出戰、結緣）開局階位 1 就開放', () => {
        load();
        for (const action of CORE_ACTIONS) assert.isTrue(isLobbyActionUnlocked(action, 1), `${action} 應開局開放`);
        assert.isTrue(isFeatureUnlocked('CORE_BATTLE', 1));
    });

    suite.test('非核心功能開局鎖著，升到門檻才開；階位越界被夾住', () => {
        load();
        assert.isFalse(isLobbyActionUnlocked('sandtable', 1));
        assert.isFalse(isLobbyActionUnlocked('sandtable', 2));
        assert.isTrue(isLobbyActionUnlocked('sandtable', 3));
        assert.isTrue(isLobbyActionUnlocked('floodBattle', 99), '階位超過上限視為最高階');
        assert.isFalse(isLobbyActionUnlocked('floodBattle', -5), '負數視為階位 1');
        assert.isFalse(isLobbyActionUnlocked('floodBattle', Number.NaN));
    });

    suite.test('舊存檔官職已高：依目前階位全開，不會鎖掉用過的功能', () => {
        load();
        for (const category of LOBBY_CATEGORIES) {
            for (const item of category.items) assert.isTrue(isLobbyActionUnlocked(item.id, 5), `${item.id} 在最高階應已開放`);
        }
        assert.equals(0, newlyUnlocked(5, 5).length);
    });

    suite.test('資料沒載入或查不到的功能一律視為已開放', () => {
        resetOfficerFeatureUnlocks();
        assert.isTrue(isLobbyActionUnlocked('sandtable', 1));
        assert.isTrue(isFeatureUnlocked('SANDTABLE', 1));
        assert.equals(0, newlyUnlocked(1, 5).length);
        assert.equals(null, nextRankPreview(1));
        load();
        assert.isTrue(isFeatureUnlocked('NO_SUCH_FEATURE', 1));
        assert.isTrue(isLobbyActionUnlocked('noSuchAction', 1));
    });

    suite.test('驗證失敗不覆寫既有資料', () => {
        load();
        const bad = installOfficerFeatureUnlocks({ tiers: [{ unlockTier: 9, features: [] }] });
        assert.isFalse(bad.ok);
        assert.isFalse(isLobbyActionUnlocked('sandtable', 1), '壞資料不應蓋掉已安裝的表');
        const dup = parseOfficerFeatureUnlocks({ tiers: [{ unlockTier: 1, features: [{ id: 'A', name: 'a', description: 'a' }, { id: 'A', name: 'b', description: 'b' }] }] });
        assert.isFalse(dup.ok);
    });

    suite.test('newlyUnlocked：單階、連升多階、沒晉升', () => {
        load();
        assert.equals('RECRUIT_HALL,NURTURE_FLOW,SUPPORT_CARD,MERCENARY,SEASON_PASS,SHRINE,QUEST_NORMAL', newlyUnlocked(1, 2).map((f) => f.id).join(','));
        const multi = newlyUnlocked(1, 3).map((f) => f.id);
        assert.isTrue(multi.includes('NURTURE_FLOW') && multi.includes('SANDTABLE'), '連升兩階兩階的功能都列出');
        assert.equals(0, newlyUnlocked(3, 3).length);
        assert.equals(0, newlyUnlocked(4, 2).length, '降階不會有新解鎖');
        assert.isFalse(newlyUnlocked(1, 5).some((f) => f.unlockTier === 1), '核心功能不算晉升解鎖');
    });

    suite.test('nextRankPreview：列出下一階功能；最高階沒有預告', () => {
        load();
        const preview = nextRankPreview(1);
        assert.equals(2, preview?.tier);
        assert.equals('縣府佐官', preview?.title);
        assert.isTrue((preview?.features.length ?? 0) > 0);
        assert.equals(null, nextRankPreview(5));
        assert.equals('', nextRankPreviewLine(5));
        assert.isTrue(nextRankPreviewLine(2).startsWith('下一官職「郡守」將開放：天下沙盤'));
        assert.isTrue(nextRankPreviewLine(2).includes('等 5 項'), '超過 4 項時標總數');
    });

    suite.test('大廳選單：階位 1 的鎖頭標籤與開放標籤；沒給階位不鎖', () => {
        load();
        const base = {
            leadName: null, officerRank: '鄉里義士', gold: 0, gems: 0, food: 0, cityTroops: 0, cityTroopsCap: 0,
            totalSeasonsElapsed: 0, fame: 0, territoryCount: 1, rivals: { nations: [] } as never, openCategory: 'domestic' as const,
        };
        const locked = buildLobbyCityHubView({ ...base, officerTier: 1 });
        assert.equals('內政', locked.texts.sub0Label, '核心功能維持原名');
        assert.equals('🔒招賢館\n縣府佐官開放', locked.texts.sub1Label);
        assert.equals('任務牆', locked.texts.sub2Label);
        assert.equals('🔒天下沙盤\n郡守開放', locked.texts.sub3Label, '鎖頭優先於沙盤狀態文字');
        assert.equals(5, locked.visibleSubCount, '鎖著的按鈕仍然顯示，讓玩家看得到目標');
        const open = buildLobbyCityHubView({ ...base, officerTier: 3, actionLabels: { sandtable: '沙盤・第一階段' } });
        assert.equals('招賢館', open.texts.sub1Label);
        assert.equals('沙盤・第一階段', open.texts.sub3Label);
        const noTier = buildLobbyCityHubView(base);
        assert.equals('天下沙盤', noTier.texts.sub3Label);
        assert.equals('🔒沙盤\n郡守開放', lockedActionLabel('沙盤', lobbyActionLock('sandtable', 1)));
    });

    suite.test('晉升彈窗：列出新功能、預告下一階；沒有新功能不彈窗；key 都在畫面規格裡', () => {
        load();
        assert.equals(null, buildRankUnlockPopupView(2, 2));
        const view = buildRankUnlockPopupView(2, 3);
        assert.isTrue(view !== null);
        if (!view) return;
        assert.equals('晉升「郡守」', view.texts.rankUnlockTitle);
        assert.equals('新開放 5 項功能', view.texts.rankUnlockSub);
        assert.isTrue(view.texts.rankUnlockLine0.startsWith('天下沙盤：'));
        assert.isTrue(view.texts.rankUnlockNext.includes('州牧'));
        assert.equals('', view.texts.rankUnlockMore);
        const multi = buildRankUnlockPopupView(1, 4);
        assert.isTrue((multi?.texts.rankUnlockMore ?? '').startsWith('…另有'), '連升多階超過列數時標示剩餘');
        assert.equals(RANK_UNLOCK_POPUP_ROWS, Object.keys(multi!.actives).length);
        const layout = readJson<{ root: SpecNode }>(path.join(UI_SPEC, 'layouts/rank-unlock-popup-main.json'));
        const layoutIds = ids(layout.root);
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), 'btnRankUnlockOk']) assert.isTrue(layoutIds.has(key), `畫面規格缺節點 ${key}`);
        const screen = readJson<{ layout: string; skin: string }>(path.join(UI_SPEC, 'screens/rank-unlock-popup-screen.json'));
        assert.equals('rank-unlock-popup-main', screen.layout);
        assert.isTrue(fs.existsSync(path.join(UI_SPEC, `skins/${screen.skin}.json`)));
    });

    suite.test('季報：預告一行接在提示列，沒預告時維持原樣', () => {
        const none = buildSeasonReportPanelTexts('第 1 年 春季', [], ['任務'], '');
        assert.equals('', none['DialogCard/ScrollView/ScrollContent/EmptyHintLabel']);
        const withLine = buildSeasonReportPanelTexts('第 1 年 春季', [], ['任務'], '下一官職「郡守」將開放：天下沙盤');
        assert.equals('下一官職「郡守」將開放：天下沙盤', withLine['DialogCard/ScrollView/ScrollContent/EmptyHintLabel']);
        const emptyBoth = buildSeasonReportPanelTexts('第 1 年 春季', [], [], '預告');
        assert.equals('本季風平浪靜，無事可報。\n預告', emptyBoth['DialogCard/ScrollView/ScrollContent/EmptyHintLabel']);
    });

    return suite;
}
