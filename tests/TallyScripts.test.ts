import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { tallyLegendDeployLine, tallyProducedLine, tallyStarUpLine } from '../assets/scripts/core/systems/TallyScripts';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, name: string, status = 'alive'): GeneralConfig {
    return {
        id, name, faction: 'shu', gender: '男', age: 40, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, careerClass: 'Warrior', role: 'Combat', status,
        troopAptitude: { CAVALRY: 'S' }, isHistorical: true,
    } as unknown as GeneralConfig;
}

async function build(roster: GeneralConfig[]): Promise<GameSession> {
    const adapter = new MemoryStorageAdapter();
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0.99);
    await session.load();
    return session;
}

export function createTallyScriptsSuite(): TestSuite {
    const suite = new TestSuite('TallyScripts');

    suite.test('產出句：名稱有無「虎符：」前綴都只出現一次', () => {
        const expected = '公孫瓚 殞落沙場後留下了【虎符：白馬】，精銳永存！';
        assert.equals(expected, tallyProducedLine('公孫瓚', '虎符：白馬'));
        assert.equals(expected, tallyProducedLine('公孫瓚', '白馬'));
    });

    suite.test('升星句帶入名稱、星級與兵種', () => {
        assert.equals('【虎符：白馬】升至 3★！騎兵 戰力大幅提升！', tallyStarUpLine('虎符：白馬', 3, '騎兵'));
    });

    suite.test('白馬義從、陷陣營有部署句，死亡傳承模板也算，其他虎符沒有', () => {
        const baiMa = '白馬如雪、銀槍似霜——白馬義從，天下無敵！';
        assert.equals(baiMa, tallyLegendDeployLine('tiger-tally-bai-ma-yi-cong'));
        assert.equals(baiMa, tallyLegendDeployLine('gongsun-zan'));
        assert.equals('陷陣之志，有死無生——高順的鐵軍重現人間！', tallyLegendDeployLine('tiger-tally-xian-zhen'));
        assert.equals(null, tallyLegendDeployLine('tiger-tally-hu-bao'));
        assert.equals(null, tallyLegendDeployLine(null));
    });

    suite.test('戰後升星留下提示，取走一次後清空；沒升星不留', async () => {
        const session = await build([]);
        await session.registerTallyCards([
            { uid: 't1', templateId: 'tiger-tally-bai-ma-yi-cong', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0, stars: 1, battleExp: 90, troopType: 'cavalry' },
            { uid: 't2', templateId: 'tiger-tally-xian-zhen', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0, stars: 1, battleExp: 0, troopType: 'infantry' },
        ] as never);
        await session.recordBattle([], 'draw', { deployedTallyIds: ['t2'] });
        assert.equals(0, session.consumeTallyNotices().length);
        await session.recordBattle([], 'draw', { deployedTallyIds: ['t1'] });
        const notices = session.consumeTallyNotices();
        assert.equals(1, notices.length);
        assert.isTrue(notices[0].startsWith('【虎符：白馬】升至 2★！'));
        assert.equals(0, session.consumeTallyNotices().length);
    });

    suite.test('武將陣亡產出虎符時留下產出句', async () => {
        const session = await build([person('gongsun-zan', '公孫瓚')]);
        const internal = session as unknown as { _settleDeaths(before: GeneralConfig[], after: GeneralConfig[], season: number): void };
        internal._settleDeaths([person('gongsun-zan', '公孫瓚')], [person('gongsun-zan', '公孫瓚', 'dead')], 1);
        const notices = session.consumeTallyNotices();
        assert.equals(1, notices.length);
        assert.isTrue(notices[0].startsWith('公孫瓚 殞落沙場後留下了【虎符：'));
    });

    return suite;
}
