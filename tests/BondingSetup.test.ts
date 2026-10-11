/**
 * BondingSetup.test.ts — 結緣配置畫面流程 headless 測試（PROG-2-0045）
 *
 * 不開 Cocos、不建節點：驗證 BondingSetupController 吐出的 view、結緣寫回名冊與存檔，
 * 季度推進的待產倒數，並比對 view 的 key 都對得到 bonding-setup-main.json 的節點 id。
 *
 * Unity 對照：EditMode Test 測 Presenter 與 GameManager，不實例化 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { BondingSetupController, BondingView } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { BreedingGeneral, PREGNANCY_LOCK_SEASONS } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

/** 固定序列的亂數；用完後回到最後一個值 */
function seq(...values: number[]): () => number {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

function general(id: string, gender: '男' | '女', extra: Partial<BreedingGeneral> = {}): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        ...extra,
    } as BreedingGeneral;
}

interface Rig {
    roster: InMemoryRosterStore;
    flow: BondingSetupController;
    saves: { count: number };
}

function makeRig(generals: GeneralConfig[], options: { random?: () => number; failSave?: boolean } = {}): Rig {
    const roster = new InMemoryRosterStore(generals);
    const service = new BreedingService(roster, new BloodlineGraph(), { random: options.random ?? seq(0.01, 0.5) });
    const saves = { count: 0 };
    const flow = new BondingSetupController({
        roster,
        breeding: service,
        prepare: async () => service.syncGraphFromRoster(),
        persist: async () => {
            saves.count += 1;
            if (options.failSave) throw new Error('disk full');
        },
    });
    return { roster, flow, saves };
}

function collectLayoutIds(node: { id?: string; children?: unknown[] }, out: Set<string>): void {
    if (node.id) out.add(node.id);
    for (const c of node.children ?? []) collectLayoutIds(c as { id?: string; children?: unknown[] }, out);
}

function findById(node: { id?: string; children?: unknown[] }, id: string): Record<string, unknown> | null {
    if (node.id === id) return node as Record<string, unknown>;
    for (const c of node.children ?? []) {
        const found = findById(c as { id?: string; children?: unknown[] }, id);
        if (found) return found;
    }
    return null;
}

export function createBondingSetupSuite(): TestSuite {
    const suite = new TestSuite('BondingSetup (結緣配置畫面流程)');

    suite.test('流程控制器不 import cc（可 headless 測）', () => {
        const text = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/core/BondingSetupController.ts'), 'utf8');
        assert.isFalse(/from\s+['"]cc['"]/.test(text));
    });

    suite.test('沒有可配對的雙方：只顯示提示，確認按鈕不可按', () => {
        const view = makeRig([general('liu', '男')]).flow.getView();
        assert.isTrue(view.actives.bondEmptyHint);
        assert.isFalse(view.actives.bondPanel);
        assert.isFalse(view.enabled.btnConfirmBond);
        assert.equals('母方：無人可選', view.texts.motherName);
    });

    suite.test('只列出存活、滿 20 歲、未轉教官的武將；上一位 / 下一位循環切換', () => {
        const { flow } = makeRig([
            general('a', '男'),
            general('kid', '男', { age: 12 }),
            general('ghost', '男', { status: 'dead' }),
            general('mentor', '男', { isMentorCard: true }),
            general('b', '男'),
            general('x', '女'),
        ]);
        assert.equals('a,b', flow.fathers().map((g) => g.id).join(','));
        assert.equals('x', flow.mothers().map((g) => g.id).join(','));
        assert.equals('a', flow.fatherId);
        flow.cycleFather(1);
        assert.equals('b', flow.fatherId);
        flow.cycleFather(1);
        assert.equals('a', flow.fatherId);
        flow.cycleFather(-1);
        assert.equals('b', flow.fatherId);
        const view = flow.getView();
        assert.equals('2 / 2', view.texts.fatherPager);
        assert.isTrue(view.enabled.btnNextFather);
        assert.isFalse(view.enabled.btnNextMother);
    });

    suite.test('可結緣的一對：顯示 EP 預估、受孕率、消耗與模式摘要，確認可按', () => {
        const view = makeRig([general('liu', '男'), general('sun', '女')]).flow.getView();
        assert.isTrue(view.actives.bondPanel);
        assert.isTrue(view.enabled.btnConfirmBond);
        assert.equals('Standard', view.mode);
        assert.isTrue(view.texts.epEstimate.startsWith('預估爆發力：'));
        assert.isTrue(view.texts.epDetail.includes('基礎 50'));
        assert.isTrue(/^受孕率 \d+%$/.test(view.texts.conceptionLabel));
        assert.equals('消耗 liu 精力 50 與 sun 精力 100，確認結緣？', view.texts.costLabel);
        assert.isTrue(view.texts.eligibilityLabel.includes('良緣天成'));
        assert.isTrue(view.texts.fatherInfo.includes('精力 100 / 100'));
    });

    suite.test('確認結緣（受孕）：子嗣加入名冊、扣精力、母方待產、存檔一次', async () => {
        const rig = makeRig([general('liu', '男'), general('sun', '女')]);
        const result = await rig.flow.confirm();
        assert.equals('conceived', result.outcome);
        assert.equals(1, rig.saves.count);

        const roster = rig.roster.getAll() as BreedingGeneral[];
        assert.equals(3, roster.length);
        const child = roster.find((g) => g.fatherId === 'liu' && g.motherId === 'sun');
        assert.isTrue(!!child);
        assert.equals(0, child!.age);
        assert.equals(50, roster.find((g) => g.id === 'liu')!.vitality);
        const mother = roster.find((g) => g.id === 'sun')!;
        assert.equals(0, mother.vitality);
        assert.equals(PREGNANCY_LOCK_SEASONS, mother.pregnancySeasonsLeft);

        const view = rig.flow.getView();
        assert.isTrue(view.texts.bondNotice.startsWith('恭喜主公！liu 與 sun 喜獲'));
        // 0 歲子嗣不會出現在父母清單；母方待產中不可再結緣
        assert.equals('liu', rig.flow.fathers().map((g) => g.id).join(','));
        assert.isFalse(view.enabled.btnConfirmBond);
        assert.isTrue(view.texts.eligibilityLabel.includes('母方待產中'));
        assert.isTrue(view.texts.motherInfo.includes(`待產 ${PREGNANCY_LOCK_SEASONS} 季`));
    });

    suite.test('受孕失敗：精力照扣、名冊沒有子嗣，提示說明', async () => {
        const rig = makeRig([general('liu', '男'), general('sun', '女')], { random: seq(0.999) });
        const result = await rig.flow.confirm();
        assert.equals('failed', result.outcome);
        assert.equals(2, rig.roster.getAll().length);
        assert.isTrue(rig.flow.getView().texts.bondNotice.includes('未能結緣受孕'));
        assert.equals(1, rig.saves.count);
    });

    suite.test('近親（兄妹）：顯示近親警告與原因，確認不可按；硬按也不扣精力', async () => {
        const rig = makeRig([
            general('dad', '男', { age: 50 }),
            general('mom', '女', { age: 48 }),
            general('bro', '男', { fatherId: 'dad', motherId: 'mom' }),
            general('sis', '女', { fatherId: 'dad', motherId: 'mom' }),
        ]);
        await rig.flow.open();
        rig.flow.selectFather('bro');
        rig.flow.selectMother('sis');
        const view = rig.flow.getView();
        assert.isFalse(view.enabled.btnConfirmBond);
        assert.isTrue(view.texts.inbreedingLabel.startsWith('近親警告：1 代內'));
        assert.isTrue(view.texts.eligibilityLabel.includes('同源血脈過於濃厚'));

        const result = await rig.flow.confirm();
        assert.equals('blocked', result.outcome);
        assert.equals(0, rig.saves.count);
        assert.equals(100, rig.roster.getAll().find((g) => g.id === 'bro')!.vitality);
    });

    suite.test('退役年齡後仍在世的武將結緣：模式摘要為和平血統線', () => {
        const view = makeRig([general('old', '男', { age: 66 }), general('sun', '女')]).flow.getView();
        assert.equals('Peace_Lineage', view.mode);
        assert.isTrue(view.texts.modeChip.includes('和平血統線'));
    });

    suite.test('存檔失敗不回滾結緣結果，只在提示後面註記', async () => {
        const rig = makeRig([general('liu', '男'), general('sun', '女')], { failSave: true });
        await rig.flow.confirm();
        assert.equals(3, rig.roster.getAll().length);
        assert.isTrue(rig.flow.getView().texts.bondNotice.endsWith('（存檔失敗）'));
    });

    suite.test('沒選齊雙方就按確認會丟錯（畫面層會 toast）', async () => {
        let thrown = false;
        try {
            await makeRig([general('liu', '男')]).flow.confirm();
        } catch {
            thrown = true;
        }
        assert.isTrue(thrown);
    });

    suite.test('季度推進：待產倒數 −1，待產期間母方精力不回補，滿期後恢復回補；存讀檔保留', async () => {
        const rig = makeRig([general('liu', '男'), general('sun', '女')]);
        await rig.flow.confirm();

        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(rig.roster);
        session.setSaveService(new PlayerSaveService(adapter));
        session.setRandomSource(() => 0.99);

        await session.advanceSeason();
        let mother = rig.roster.getAll().find((g) => g.id === 'sun') as BreedingGeneral;
        const father = rig.roster.getAll().find((g) => g.id === 'liu') as BreedingGeneral;
        assert.equals(PREGNANCY_LOCK_SEASONS - 1, mother.pregnancySeasonsLeft);
        assert.equals(0, mother.vitality);
        assert.isTrue((father.vitality ?? 0) > 50, '父方照常回補');

        const restored = new InMemoryRosterStore();
        const reloaded = new GameSession();
        reloaded.setRosterStore(restored);
        reloaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reloaded.load());
        assert.equals(PREGNANCY_LOCK_SEASONS - 1, (restored.getAll().find((g) => g.id === 'sun') as BreedingGeneral).pregnancySeasonsLeft);

        for (let i = 1; i < PREGNANCY_LOCK_SEASONS; i++) await session.advanceSeason();
        mother = rig.roster.getAll().find((g) => g.id === 'sun') as BreedingGeneral;
        assert.equals(0, mother.pregnancySeasonsLeft);
        assert.equals(0, mother.vitality);

        await session.advanceSeason();
        mother = rig.roster.getAll().find((g) => g.id === 'sun') as BreedingGeneral;
        assert.isTrue((mother.vitality ?? 0) > 0, '待產結束後恢復回補');
    });

    suite.test('view 的所有 key 都對得到 bonding-setup-main.json 的節點 id；screen / skin 串得起來', async () => {
        const layout = readJson<{ root: { id?: string; children?: unknown[] } }>('assets/resources/ui-spec/layouts/bonding-setup-main.json');
        const ids = new Set<string>();
        collectLayoutIds(layout.root, ids);

        const views: BondingView[] = [];
        views.push(makeRig([]).flow.getView());
        const rig = makeRig([general('liu', '男'), general('sun', '女')]);
        views.push(rig.flow.getView());
        await rig.flow.confirm();
        views.push(rig.flow.getView());

        const missing = new Set<string>();
        for (const view of views) {
            for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
                if (!ids.has(key)) missing.add(key);
            }
        }
        assert.equals('', [...missing].join(','), `view 有 key 在版面找不到節點 id：${[...missing].join(', ')}`);
        for (const id of Object.keys(views[1].enabled)) {
            assert.equals('button', findById(layout.root, id)?.type, `${id} 應為 button`);
        }

        const screen = readJson<{ layout: string; skin: string; uiId: string }>('assets/resources/ui-spec/screens/bonding-setup-screen.json');
        assert.equals('bonding-setup-main', screen.layout);
        assert.equals('BondingSetup', screen.uiId);
        assert.isTrue(fs.existsSync(path.join(ROOT, `assets/resources/ui-spec/skins/${screen.skin}.json`)));
    });

    suite.test('每個 skinSlot / styleSlot 都在 bonding-setup-screen.skin.json 有定義', () => {
        const layout = readJson<{ root: unknown }>('assets/resources/ui-spec/layouts/bonding-setup-main.json');
        const skin = readJson<{ slots: Record<string, unknown> }>('assets/resources/ui-spec/skins/bonding-setup-screen.skin.json');
        const used = new Set<string>();
        const walk = (node: { skinSlot?: string; styleSlot?: string; children?: unknown[] }): void => {
            if (node.skinSlot) used.add(node.skinSlot);
            if (node.styleSlot) used.add(node.styleSlot);
            for (const c of node.children ?? []) walk(c as never);
        };
        walk(layout.root as never);
        assert.equals('', [...used].filter((slot) => !(slot in skin.slots)).join(','));
    });

    suite.test('大廳季度 HUD 有「結緣」入口，LobbyScene 綁了它；HUD / 選卡 / 選主將卡片不重疊', () => {
        const hud = readJson<{ root: { id?: string; children?: unknown[] } }>('assets/resources/ui-spec/layouts/lobby-season-hud-main.json');
        const ids = new Set<string>();
        collectLayoutIds(hud.root, ids);
        assert.isTrue(ids.has('btnOpenBonding'));
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("buttonId: 'btnOpenBonding'"));
        assert.isTrue(lobby.includes("'bonding-setup-screen'"));
        assert.isTrue(lobby.includes('services().breeding'));

        const ranges = ['lobby-season-hud-main', 'lobby-deck-select-main', 'lobby-lead-select-main'].map((id) => {
            const card = readJson<{ root: { children: Array<{ widget: { top: number }; height: number }> } }>(
                `assets/resources/ui-spec/layouts/${id}.json`,
            ).root.children[0];
            return { id, top: card.widget.top, bottom: card.widget.top + card.height };
        }).sort((a, b) => a.top - b.top);
        for (let i = 1; i < ranges.length; i++) {
            assert.isTrue(ranges[i].top >= ranges[i - 1].bottom, `${ranges[i - 1].id} 與 ${ranges[i].id} 重疊`);
        }
    });

    return suite;
}
