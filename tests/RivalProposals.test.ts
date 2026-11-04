import { TestSuite, assert } from './TestRunner';
import { createRivalWorld, normalizeRivalWorld, type NationState, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { resolveRivalPlayerEvents } from '../assets/scripts/core/systems/RivalPlayerEvents';
import { PROPOSAL_TUNING, formatRivalProposal, pendingRivalProposal, respondToRivalProposal } from '../assets/scripts/core/systems/RivalProposals';
import { RivalDiplomacyController } from '../assets/scripts/ui/core/RivalDiplomacyController';

const TRADE = { kind: 'TRADE' as const, giveGold: 300, askFood: 600 };

/** 除了指定國家，其他國家都不符合提議條件（邦交 0、沒有黃金） */
function worldWith(id: string, patch: Partial<NationState>): RivalWorld {
    const world = createRivalWorld();
    return {
        nations: world.nations.map((n) => {
            const quiet = { ...n, relation: 0, resources: n.resources && { ...n.resources, gold: 0 } };
            return n.id === id ? { ...quiet, ...patch } : quiet;
        }),
    };
}

function nation(world: RivalWorld, id: string): NationState {
    return world.nations.find((n) => n.id === id) as NationState;
}

function richResources(world: RivalWorld, id: string) {
    return { ...(nation(world, id).resources as NonNullable<NationState['resources']>), gold: 5000 };
}

export function createRivalProposalsSuite(): TestSuite {
    const suite = new TestSuite('RivalProposals');

    suite.test('DIPLOMAT 邦交夠高且擲中時求盟，句子照規格', () => {
        const result = resolveRivalPlayerEvents(worldWith('shu', { relation: 50 }), 1, { troops: 1000, food: 5000 }, () => 0);
        assert.equals('ALLIANCE', nation(result.world, 'shu').proposal?.kind);
        assert.isTrue(result.notices[0].startsWith('蜀 派遣使者求盟：『'));
        assert.isTrue(result.notices[0].includes('接受 / 拒絕？'));
    });

    suite.test('他國金多且玩家糧少時商隊提議；玩家糧不夠交易就不提', () => {
        const base = worldWith('wu', {});
        const world = worldWith('wu', { relation: 10, resources: richResources(base, 'wu') });
        const result = resolveRivalPlayerEvents(world, 1, { troops: 1000, food: 1000 }, () => 0.99);
        assert.equals('TRADE', nation(result.world, 'wu').proposal?.kind);
        assert.equals('吳 商隊抵達：願以 300 黃金 換取 600 糧草。同意 / 拒絕？（請到外交畫面回覆）', result.notices.join());
        const poor = resolveRivalPlayerEvents(world, 1, { troops: 1000, food: 100 }, () => 0.99);
        assert.isTrue(nation(poor.world, 'wu').proposal === undefined);
    });

    suite.test('一季最多一件新提議，等待中與冷卻中不再提', () => {
        const base = worldWith('wu', {});
        const twoRich = {
            nations: base.nations.map((n) => (n.id === 'wu' || n.id === 'wei'
                ? { ...n, relation: 10, resources: richResources(base, n.id) }
                : n)),
        };
        const first = resolveRivalPlayerEvents(twoRich, 1, { troops: 1000, food: 1000 }, () => 0.99);
        assert.equals(1, first.world.nations.filter((n) => n.proposal).length);
        assert.equals(1, first.notices.length);
        const blocked = {
            nations: twoRich.nations.map((n) => ({ ...n, proposalBlockedUntil: 5 })),
        };
        assert.equals(0, resolveRivalPlayerEvents(blocked, 4, { troops: 1000, food: 1000 }, () => 0.99).notices.length);
        assert.equals(1, resolveRivalPlayerEvents(blocked, 5, { troops: 1000, food: 1000 }, () => 0.99).notices.length);
    });

    suite.test('開戰或滅亡時取消提議', () => {
        const atWar = worldWith('shu', { atWar: true, proposal: { kind: 'ALLIANCE' } });
        assert.isTrue(nation(resolveRivalPlayerEvents(atWar, 1, { troops: 1000, food: 5000 }, () => 0.99).world, 'shu').proposal === undefined);
        const fallen = worldWith('shu', { territories: 0, proposal: { kind: 'ALLIANCE' } });
        assert.isTrue(nation(resolveRivalPlayerEvents(fallen, 1, { troops: 1000, food: 5000 }, () => 0.99).world, 'shu').proposal === undefined);
    });

    suite.test('接受求盟：結盟、邦交 +30、進入冷卻', () => {
        const world = worldWith('shu', { relation: 40, proposal: { kind: 'ALLIANCE' } });
        const result = respondToRivalProposal(world, 'shu', true, 0, 3);
        assert.isTrue(result.ok);
        assert.isTrue(nation(result.world, 'shu').allied);
        assert.equals(70, nation(result.world, 'shu').relation);
        assert.equals(3 + PROPOSAL_TUNING.cooldownSeasons, nation(result.world, 'shu').proposalBlockedUntil);
        assert.isTrue(pendingRivalProposal(result.world) === null);
    });

    suite.test('拒絕求盟：不結盟、邦交不變', () => {
        const result = respondToRivalProposal(worldWith('shu', { relation: 40, proposal: { kind: 'ALLIANCE' } }), 'shu', false, 0, 3);
        assert.isFalse(nation(result.world, 'shu').allied);
        assert.equals(40, nation(result.world, 'shu').relation);
    });

    suite.test('同意商隊：交換資源、邦交 +5；糧草不足時失敗且提議保留', () => {
        const base = worldWith('wu', {});
        const world = worldWith('wu', { relation: 10, proposal: TRADE, resources: richResources(base, 'wu') });
        const foodBefore = nation(world, 'wu').resources?.food ?? 0;
        const result = respondToRivalProposal(world, 'wu', true, 700, 1);
        assert.equals(600, result.foodSpent);
        assert.equals(300, result.goldGained);
        assert.equals(15, nation(result.world, 'wu').relation);
        assert.equals(4700, nation(result.world, 'wu').resources?.gold);
        assert.equals(foodBefore + 600, nation(result.world, 'wu').resources?.food);
        const short = respondToRivalProposal(world, 'wu', true, 100, 1);
        assert.isFalse(short.ok);
        assert.equals('TRADE', nation(short.world, 'wu').proposal?.kind);
    });

    suite.test('拒絕商隊：邦交 -5，資源不動', () => {
        const result = respondToRivalProposal(worldWith('wu', { relation: 10, proposal: TRADE }), 'wu', false, 700, 1);
        assert.equals(5, nation(result.world, 'wu').relation);
        assert.equals(0, result.foodSpent);
        assert.equals(0, result.goldGained);
    });

    suite.test('沒有提議時回覆失敗', () => {
        assert.isFalse(respondToRivalProposal(worldWith('wu', {}), 'wu', true, 700, 1).ok);
    });

    suite.test('提議與冷卻可存讀檔，壞資料被丟棄', () => {
        const world = worldWith('wu', { proposal: TRADE, proposalBlockedUntil: 9 });
        const loaded = normalizeRivalWorld(JSON.parse(JSON.stringify(world)));
        assert.equals(600, (nation(loaded, 'wu').proposal as typeof TRADE).askFood);
        assert.equals(9, nation(loaded, 'wu').proposalBlockedUntil);
        const broken = JSON.parse(JSON.stringify(world));
        broken.nations.find((n: NationState) => n.id === 'wu').proposal = { kind: 'TRADE', giveGold: 'x' };
        assert.isTrue(nation(normalizeRivalWorld(broken), 'wu').proposal === undefined);
    });

    suite.test('沒有外交台詞的君主省略台詞段', () => {
        assert.equals('呂布軍 派遣使者求盟。接受 / 拒絕？', formatRivalProposal('lvbu', { kind: 'ALLIANCE' }));
    });

    suite.test('外交畫面：有提議才顯示按鈕，回覆後收起', async () => {
        let world = worldWith('wu', { relation: 10, proposal: TRADE });
        const controller = new RivalDiplomacyController({
            world: () => world,
            setWorld: async (next) => { world = next; },
            squad: () => [],
            gold: () => 0,
            spendGold: () => true,
            grantGold: () => undefined,
            random: () => 0,
            respondProposal: async (nationId, accept) => {
                const result = respondToRivalProposal(world, nationId, accept, 700, 1);
                world = result.world;
                return result;
            },
        });
        const before = controller.getFlowView();
        assert.isTrue(before.actives.proposalGroup);
        assert.equals('同意', before.texts.btnProposalAcceptLabel);
        assert.isTrue(before.texts.proposalLabel.startsWith('吳 商隊抵達'));
        await controller.respondProposal(false);
        const after = controller.getFlowView();
        assert.isFalse(after.actives.proposalGroup);
        assert.equals('已拒絕 吳 的商隊', after.texts.resultLabel);
    });

    return suite;
}
