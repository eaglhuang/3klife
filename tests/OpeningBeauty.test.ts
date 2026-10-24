/**
 * OpeningBeauty.test.ts — 開局紅顏（PROG-2-1084）
 *
 * 六位初始名將全是男性，開局結緣沒有母方；規格（新手開場第四幕、§8）安排紅顏池作血統定錨。
 * 這裡驗：紅顏池支援卡 id 轉武將 id、只收女性武將、開新局後紅顏在名冊且能當結緣母方。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { buildStarterRoster, STARTER_GENERAL_IDS } from '../assets/scripts/core/services/StarterRosterService';
import { openingBeautyCandidates, rollOpeningBeauty, OPENING_BEAUTY_POOL_ID } from '../assets/scripts/core/systems/OpeningBeauty';
import { DestinyOpeningController } from '../assets/scripts/ui/core/DestinyOpeningController';

function readJson<T>(relative: string): T {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8')) as T;
}

const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
const pools = readJson<GachaConfig[]>('assets/resources/data/gacha-config.json');
const heroPool = pools.find(c => c.poolId === 'hero-pool')!;
const beautyPool = pools.find(c => c.poolId === OPENING_BEAUTY_POOL_ID)!;

export function createOpeningBeautySuite(): TestSuite {
    const suite = new TestSuite('OpeningBeauty');

    suite.test('紅顏池五位都轉得到資料表裡的女性武將', () => {
        const ids = openingBeautyCandidates(beautyPool, generals);
        assert.equals(JSON.stringify(['da-qiao', 'xiao-qiao', 'zhen-ji', 'huang-yue-ying', 'cai-yan']), JSON.stringify(ids));
        for (const id of ids) assert.equals('女', generals.find(g => g.id === id)!.gender);
    });

    suite.test('不存在或非女性的人選被略過；全部無效時回 null', () => {
        const pool = { ...beautyPool, candidateIds: ['zhang-fei', 'no-such-id'] };
        assert.equals(0, openingBeautyCandidates(pool, generals).length);
        assert.equals(null, rollOpeningBeauty(pool, generals, () => 0));
        assert.equals(null, rollOpeningBeauty(undefined, generals, () => 0));
    });

    suite.test('亂數決定抽中誰，random 接近 1 也不越界', () => {
        assert.equals('da-qiao', rollOpeningBeauty(beautyPool, generals, () => 0));
        assert.equals('cai-yan', rollOpeningBeauty(beautyPool, generals, () => 0.999999));
    });

    suite.test('起始名冊帶入紅顏：排在六位名將之後、深複製', () => {
        const roster = buildStarterRoster(generals, { beautyGeneralId: 'xiao-qiao' });
        assert.equals(7, roster.length);
        assert.equals('xiao-qiao', roster[6].id);
        roster[6].name = '已修改';
        assert.equals('小喬', generals.find(g => g.id === 'xiao-qiao')!.name);
        assert.equals(6, buildStarterRoster(generals, { beautyGeneralId: STARTER_GENERAL_IDS[0] }).length);
    });

    suite.test('宿命開局後名冊有紅顏、開局訊息提到她', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setRandomSource(() => 0.99);
        const controller = new DestinyOpeningController({
            config: () => heroPool, generals: () => generals, session, random: () => 0.3, seed: () => 7,
            beauty: () => rollOpeningBeauty(beautyPool, generals, () => 0.5),
            onStarted: () => undefined,
        });
        controller.roll();
        assert.isTrue(await controller.select(0) || await controller.confirm());
        assert.equals('zhen-ji', controller.beautyId);
        const beauty = session.roster.find(g => g.id === 'zhen-ji');
        assert.isTrue(!!beauty, '紅顏應在名冊');
        assert.isTrue((beauty!.age ?? 0) >= 20, '紅顏應已成年、可結緣');
        assert.isTrue(controller.getFlowView().texts.destinyMessage.includes('甄姬'));
    });

    return suite;
}
