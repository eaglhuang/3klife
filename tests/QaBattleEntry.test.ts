/**
 * QaBattleEntry.test.ts — 網頁 ?qaBattle=1 直進戰場入口（PROG-2-9127）
 *
 * 鎖住：沒帶參數完全不介入；缺省值與大廳新手第一場相同；合法／非法參數的驗證與錯誤文字；
 * 敵軍兵種偏好轉換；直進入口接線（登入場景、戰場、暫時狀態存檔）的關鍵位置。
 *
 * Unity 對照：Editor 啟動參數解析器的單元測試，不開場景也能驗。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { EncounterConfig } from '../assets/scripts/shared/BattleEntryParams';
import { formatBattleEntryLog } from '../assets/scripts/shared/BattleEntryParams';
import { Weather, TroopType } from '../assets/scripts/shared/CommonEnums';
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';
import { TALLY_HAND_SIZE } from '../assets/scripts/battle/views/BattleSceneLoader';
import { deployPreferenceForTroops } from '../assets/scripts/core/systems/AiDeployTroopPick';
import {
    formatQaBattleErrors,
    isQaBattleRequested,
    pickDefaultEncounter,
    QA_MAX_PLAYER_TROOPS,
    resolveQaBattle,
    splitList,
    type QaBattleCatalog,
    type QaBattleResolution,
} from '../assets/scripts/core/systems/QaBattleEntry';
import { executeQaBattleEntry, type QaBattleEntryDeps } from '../assets/scripts/ui/scenes/QaBattleEntryRunner';

const read = (rel: string): string => readFileSync(join(__dirname, '..', rel), 'utf8');
const encounters = (JSON.parse(read('assets/resources/data/encounters.json')) as { encounters: EncounterConfig[] }).encounters;
const generals = JSON.parse(read('assets/resources/data/generals.json')) as Array<{ id: string }>;
const lobbyEncounters = encounters.filter((e) => !e.extreme);

function realCatalog(): QaBattleCatalog {
    const tallyCardByTroop: Record<string, string> = {};
    buildTallyCardCatalog().forEach((card, id) => { if (!(card.unitType in tallyCardByTroop)) tallyCardByTroop[card.unitType] = id; });
    return { encounters, generalIds: generals.map((g) => g.id), tallyCardByTroop, maxPlayerTroops: QA_MAX_PLAYER_TROOPS };
}

function expectOk(result: QaBattleResolution) {
    if (!result.requested || !result.ok) throw new Error(`預期合法，實際：${JSON.stringify(result)}`);
    return result.params;
}

function expectErrors(result: QaBattleResolution): string[] {
    if (!result.requested || result.ok) throw new Error(`預期不合法，實際：${JSON.stringify(result)}`);
    return result.errors;
}

export function createQaBattleEntrySuite(): TestSuite {
    const suite = new TestSuite('QaBattleEntry (網頁直進戰場 PROG-2-9127)');
    const catalog = realCatalog();
    const defaultEncounter = pickDefaultEncounter(lobbyEncounters)!;
    const otherEncounter = lobbyEncounters.find((e) => e.id !== defaultEncounter.id)!;

    suite.test('沒帶 qaBattle：不介入（含空字串、0、false、只有其他參數）', () => {
        for (const search of ['', '?', '?previewMode=true&previewTarget=5', '?qaBattle=0', '?qaBattle=false', '?qaEnemy=lu-bu']) {
            assert.isFalse(isQaBattleRequested(search), search);
            assert.isFalse(resolveQaBattle(search, catalog).requested, search);
        }
        assert.isFalse(isQaBattleRequested(undefined));
        assert.isFalse(isQaBattleRequested(null));
    });

    suite.test('?qaBattle=1：全部缺省時與大廳新手第一場相同（遭遇、主將、教學戰）', () => {
        const params = expectOk(resolveQaBattle('?qaBattle=1', catalog));
        assert.equals('qa', params.entrySource);
        assert.equals(defaultEncounter.id, params.encounterId);
        assert.equals(defaultEncounter.playerGeneralId, params.playerGeneralId);
        assert.equals(defaultEncounter.enemyGeneralId, params.enemyGeneralId);
        assert.isTrue(params.tutorial === true);
        assert.equals('cao-cao', params.teachingSpirit?.spiritId);
        assert.equals(0, (params.selectedCardIds ?? []).length);
        assert.isTrue(params.enemyDeployTroops === undefined);
        assert.isTrue(params.weather !== undefined);
    });

    suite.test('qaBattle=true 也啟用；campaignStageId 由呼叫端提供', () => {
        const params = expectOk(resolveQaBattle('?qaBattle=true', catalog, { resolveCampaignStageId: () => 'stage-x' }));
        assert.equals('stage-x', params.campaignStageId);
    });

    suite.test('指定遭遇／主將／敵將／兵種：全部沿用既有代號，教學戰預設關閉', () => {
        const player = generals.find((g) => g.id !== otherEncounter.playerGeneralId)!.id;
        const enemy = generals.find((g) => g.id !== otherEncounter.enemyGeneralId && g.id !== player)!.id;
        const search = `?qaBattle=1&qaEncounter=${otherEncounter.id}&qaPlayer=${player}&qaEnemy=${enemy}&qaPlayerTroops=archer,cavalry&qaEnemyTroops=Archer, shield`;
        const params = expectOk(resolveQaBattle(search, catalog));
        assert.equals(otherEncounter.id, params.encounterId);
        assert.equals(player, params.playerGeneralId);
        assert.equals(enemy, params.enemyGeneralId);
        assert.isFalse(params.tutorial === true);
        assert.isTrue(params.teachingSpirit === null);
        assert.equals(2, (params.selectedCardIds ?? []).length);
        assert.equals(catalog.tallyCardByTroop.archer, params.selectedCardIds![0]);
        assert.equals(catalog.tallyCardByTroop.cavalry, params.selectedCardIds![1]);
        assert.equals('archer,shield', (params.enemyDeployTroops ?? []).join(','));
        assert.contains(formatBattleEntryLog(params), 'QA直進戰場');
    });

    suite.test('qaTutorial 可強制開關；遭遇天氣照資料表', () => {
        assert.isFalse(expectOk(resolveQaBattle('?qaBattle=1&qaTutorial=0', catalog)).tutorial === true);
        assert.isTrue(expectOk(resolveQaBattle(`?qaBattle=1&qaEncounter=${otherEncounter.id}&qaTutorial=1`, catalog)).tutorial === true);
        const foggy = encounters.find((e) => e.weather === Weather.Fog);
        if (foggy) assert.equals(Weather.Fog, expectOk(resolveQaBattle(`?qaBattle=1&qaEncounter=${foggy.id}`, catalog)).weather);
    });

    suite.test('不合法：不存在的遭遇／武將，錯誤文字點名參數與可用清單', () => {
        const errors = expectErrors(resolveQaBattle('?qaBattle=1&qaEncounter=nope&qaPlayer=ghost&qaEnemy=ghost2', catalog));
        assert.equals(3, errors.length);
        assert.contains(errors[0], 'qaEncounter=nope');
        assert.contains(errors[0], encounters[0].id);
        assert.contains(errors[1], 'qaPlayer=ghost');
        assert.contains(errors[2], 'qaEnemy=ghost2');
    });

    suite.test('不合法：兵種未知、敵軍 AI 不會出、我方沒虎符卡、張數超過、空清單', () => {
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaPlayerTroops=dragon', catalog)).join('|'), '未知兵種 dragon');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaEnemyTroops=medic', catalog)).join('|'), 'AI 不會出');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaEnemyTroops=dragon', catalog)).join('|'), '未知兵種 dragon');
        const noCard: QaBattleCatalog = { ...catalog, tallyCardByTroop: { cavalry: 'c1' } };
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaPlayerTroops=archer', noCard)).join('|'), '沒有對應的虎符卡');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaPlayerTroops=archer,archer,archer,archer,archer', catalog)).join('|'), '最多 4');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaPlayerTroops=', catalog)).join('|'), '是空的');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaEnemyTroops=,', catalog)).join('|'), '是空的');
    });

    suite.test('不合法：qaBattle 值亂填、qaTutorial 亂填、打錯字的 qa 參數、空值', () => {
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=yes', catalog)).join('|'), 'qaBattle=yes');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaTutorial=maybe', catalog)).join('|'), 'qaTutorial=maybe');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaEnemey=lu-bu', catalog)).join('|'), '不認得的參數 qaEnemey');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&qaEnemy=', catalog)).join('|'), 'qaEnemy=');
    });

    suite.test('不合法：與 previewMode 併用會落入 capture 模式，直接拒絕', () => {
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&previewMode=true&previewTarget=5', catalog)).join('|'), 'capture');
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1&previewMode=1', catalog)).join('|'), 'previewMode');
        // previewMode 明確關閉不算衝突
        expectOk(resolveQaBattle('?qaBattle=1&previewMode=false', catalog));
    });

    suite.test('多個錯誤一次全列；畫面文字有標題、條列與回登入提示', () => {
        const errors = expectErrors(resolveQaBattle('?qaBattle=1&qaEncounter=nope&qaEnemyTroops=dragon&qaTutorial=x', catalog));
        assert.equals(3, errors.length);
        const text = formatQaBattleErrors(errors);
        assert.contains(text, '【直進戰場參數錯誤】');
        assert.contains(text, '・');
        assert.contains(text, '已回到登入畫面');
    });

    suite.test('沒有任何遭遇資料時回報錯誤而不是丟例外', () => {
        const empty: QaBattleCatalog = { ...catalog, encounters: [] };
        assert.contains(expectErrors(resolveQaBattle('?qaBattle=1', empty)).join('|'), 'encounters.json');
    });

    suite.test('我方卡組上限與戰場手牌張數一致', () => {
        assert.equals(TALLY_HAND_SIZE, QA_MAX_PLAYER_TROOPS);
    });

    suite.test('splitList：去空白、轉小寫、丟空項', () => {
        assert.equals('archer,cavalry', splitList(' Archer , ,CAVALRY,').join(','));
    });

    suite.test('敵軍兵種偏好：只留 AI 會出的、不剋制；全是不可用兵種回 null', () => {
        const pref = deployPreferenceForTroops([TroopType.Archer, TroopType.Medic, TroopType.Shield])!;
        assert.equals('ARCHER,SHIELD', pref.preferredTroops.slice().sort().join(','));
        assert.isFalse(pref.preferCounter);
        assert.isTrue(deployPreferenceForTroops([TroopType.Medic, TroopType.Navy]) === null);
    });

    suite.test('接線：登入場景只在帶參數時走直進；戰場回登入與敵兵種覆蓋；暫時狀態存檔', () => {
        const login = read('assets/scripts/ui/scenes/LoginScene.ts');
        assert.contains(login, 'isQaBattleRequested(currentSearch())');
        const runner = read('assets/scripts/ui/scenes/QaBattleEntryRunner.ts');
        assert.contains(runner, 'services().useEphemeralStorage()');
        assert.contains(runner, 'services().scene.switchScene(SceneName.Battle, params)');
        assert.contains(runner, 'let consumed = false');
        const scene = read('assets/scripts/battle/views/BattleScene.ts');
        assert.contains(scene, "entrySource === 'qa' ? SceneName.Login : SceneName.Lobby");
        assert.contains(scene, 'overrideEnemyDeployTroops(battleParams.enemyDeployTroops)');
        const loader = read('assets/scripts/core/managers/ServiceLoader.ts');
        assert.contains(loader, 'public useEphemeralStorage()');
        assert.contains(loader, 'if (this.ephemeralStorage) return new MemoryStorageAdapter();');
    });

    suite.test('直進入口順序：全域初始化（語系字串）完成後才切場景（PROG-2-9131）', async () => {
        const calls: string[] = [];
        const deps: QaBattleEntryDeps = {
            loadCatalog: async () => realCatalog(),
            resolveCampaignStageId: () => 'stage',
            prepareBattleGlobals: async () => {
                calls.push('prepare:start');
                await new Promise<void>((resolve) => setTimeout(resolve, 5));
                calls.push('prepare:end');
            },
            clearStalePreviewKeys: () => { calls.push('clearKeys'); },
            useEphemeralStorage: () => { calls.push('ephemeral'); },
            switchToBattle: () => { calls.push('switch'); },
        };
        const outcome = await executeQaBattleEntry('?qaBattle=1', deps);
        assert.isTrue(outcome.entered);
        assert.equals('clearKeys,ephemeral,prepare:start,prepare:end,switch', calls.join(','));
    });

    suite.test('直進入口：參數不合法時不做初始化也不切場景', async () => {
        const calls: string[] = [];
        const deps: QaBattleEntryDeps = {
            loadCatalog: async () => realCatalog(),
            resolveCampaignStageId: () => 'stage',
            prepareBattleGlobals: async () => { calls.push('prepare'); },
            clearStalePreviewKeys: () => { calls.push('clearKeys'); },
            useEphemeralStorage: () => { calls.push('ephemeral'); },
            switchToBattle: () => { calls.push('switch'); },
        };
        const outcome = await executeQaBattleEntry('?qaBattle=1&qaEncounter=nope', deps);
        assert.isFalse(outcome.entered);
        assert.isTrue((outcome.errors?.length ?? 0) > 0);
        assert.equals('', calls.join(','));
    });

    suite.test('直進入口載語系的呼叫與大廳開場相同', () => {
        const runner = read('assets/scripts/ui/scenes/QaBattleEntryRunner.ts');
        assert.contains(runner, 'await services().i18n.setLocale(services().i18n.locale)');
        // 與大廳開場載語系是同一個呼叫
        assert.contains(read('assets/scripts/ui/scenes/LobbyScene.ts'), 'await services().i18n.setLocale(services().i18n.locale)');
    });

    return suite;
}
