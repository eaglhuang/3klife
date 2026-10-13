/**
 * JobChangeController.test.ts — 20 歲成人禮轉職選單流程 headless 測試（PROG-2-0227）
 *
 * 不開 Cocos、不建節點：驗證 JobChangeController 吐出的 view，以及確認轉職後
 * GameSession 的名冊、轉職令與存檔是否一致。
 *
 * Unity 對照：EditMode Test 測 Presenter 與 GameManager，不實例化 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { JobChangeController } from '../assets/scripts/ui/core/JobChangeController';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_JOB_CHANGE_ORDER } from '../assets/scripts/core/systems/PlayerInventory';
import { JobWiringGeneral } from '../assets/scripts/core/systems/JobChangeWiring';
import { GENERAL_STATUS_DEAD } from '../assets/scripts/core/systems/GeneralAging';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function layoutIds(): Set<string> {
    const layout = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/ui-spec/layouts/job-change-main.json'), 'utf8'));
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        for (const child of node.children ?? []) walk(child as { id?: string; children?: unknown[] });
    };
    walk(layout.root);
    return ids;
}

function youth(id: string, extra: Partial<JobWiringGeneral> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 20, hp: 1000,
        str: 80, lea: 60, int: 50, pol: 70, primaryClass: 'Warrior', ...extra,
    } as unknown as GeneralConfig;
}

async function makeRig(generals: GeneralConfig[], orders: number, adapter?: MemoryStorageAdapter) {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(generals));
    if (adapter) session.setSaveService(new PlayerSaveService(adapter));
    if (orders > 0) await session.addItem(ITEM_JOB_CHANGE_ORDER, orders);
    const controller = new JobChangeController({
        roster: { getAll: () => session.roster },
        ordersOwned: () => session.itemCount(ITEM_JOB_CHANGE_ORDER),
        changeJob: (generalId, subClass) => session.changeJob(generalId, subClass),
    });
    return { session, controller };
}

export function createJobChangeControllerSuite(): TestSuite {
    const suite = new TestSuite('JobChangeController (PROG-2-0227 成人禮轉職選單)');

    suite.test('名單只列出滿 20 歲、存活、有主職、尚無副職的武將', async () => {
        const { controller } = await makeRig([
            youth('young', { age: 19 }),
            youth('ok'),
            youth('dead', { status: GENERAL_STATUS_DEAD }),
            youth('nomain', { primaryClass: undefined }),
            youth('hasSub', { subClass: 'Scholar' }),
        ], 1);
        assert.equals('ok', controller.eligibleGenerals().map((general) => general.id).join(','));
    });

    suite.test('名單為空時 view 顯示無可轉職武將，確認鈕不可按', async () => {
        const { controller } = await makeRig([youth('young', { age: 18 })], 1);
        const view = controller.getView();
        assert.isTrue(view.generalId === null);
        assert.isFalse(view.confirmEnabled);
        assert.isTrue(view.blockedText !== null);
    });

    suite.test('副職選項排除主職，並附預估副職能力', async () => {
        const { controller } = await makeRig([youth('liu')], 1);
        const view = controller.getView();
        assert.equals('Scholar', view.choices.map((choice) => choice.subClass).join(','));
        assert.equals(Math.floor(70 * 0.6), view.choices[0].projectedSubAbility);
    });

    suite.test('未選副職前確認鈕不可按；選了且條件成立才可按', async () => {
        const { controller } = await makeRig([youth('liu')], 1);
        assert.isFalse(controller.getView().confirmEnabled);
        controller.selectSubClass('Scholar');
        assert.isTrue(controller.getView().confirmEnabled);
        assert.isTrue(controller.getView().blockedText === null);
    });

    suite.test('沒有轉職令時確認鈕不可按，並說明原因', async () => {
        const { controller } = await makeRig([youth('liu')], 0);
        controller.selectSubClass('Scholar');
        const view = controller.getView();
        assert.isFalse(view.confirmEnabled);
        assert.equals('轉職令不足', view.blockedText!);
    });

    suite.test('確認轉職：名冊寫入副職、扣一張轉職令、提示成功，並寫進存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, controller } = await makeRig([youth('liu')], 2, adapter);
        controller.selectSubClass('Scholar');
        const result = await controller.confirm();
        assert.isTrue(result!.ok);
        const view = controller.getView();
        assert.equals(1, view.orders);
        assert.isTrue(view.notice!.includes('已追加副職'));
        assert.isTrue(view.subClass === null);
        assert.equals('Scholar', (session.roster[0] as JobWiringGeneral).subClass!);

        await session.save();
        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals('Scholar', (restored.roster[0] as JobWiringGeneral).subClass!);
    });

    suite.test('已轉職的武將不再出現在名單，選單會切到下一位可轉職者', async () => {
        const { controller } = await makeRig([youth('liu'), youth('guan', { primaryClass: 'Scholar' })], 2);
        controller.selectSubClass('Scholar');
        await controller.confirm();
        assert.equals('guan', controller.getView().generalId!);
    });

    suite.test('條件不符時確認不會扣道具，並回報原因', async () => {
        const { session, controller } = await makeRig([youth('liu')], 0);
        controller.selectSubClass('Scholar');
        const result = await controller.confirm();
        assert.isTrue(result === null);
        assert.equals(0, session.itemCount(ITEM_JOB_CHANGE_ORDER));
    });

    suite.test('flow view 的 key 都對得到 job-change-main.json 的節點 id', async () => {
        const { controller } = await makeRig([youth('liu')], 1);
        const view = controller.getFlowView();
        const ids = layoutIds();
        const keys = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)];
        for (const key of keys) {
            assert.isTrue(ids.has(key));
        }
    });

    suite.test('flow view：有武將時顯示副職能力與轉職令，選了副職後按鈕文字打勾', async () => {
        const { controller } = await makeRig([youth('liu')], 2);
        let view = controller.getFlowView();
        assert.equals('轉職令 ×2', view.texts.ordersLabel);
        assert.equals('文官能力 42', view.texts.subInfo);
        assert.isTrue(view.actives.contentPanel);
        assert.isFalse(view.actives.emptyHint);
        assert.isFalse(view.enabled.btnConfirmJob);
        controller.selectSubClass('Scholar');
        view = controller.getFlowView();
        assert.equals('✓ 追加文官', view.texts.btnSubScholarLabel);
        assert.isTrue(view.enabled.btnConfirmJob);
        assert.isFalse(view.enabled.btnSubWarrior);
    });

    suite.test('flow view：沒有可轉職武將時只顯示提示，內容區隱藏', async () => {
        const { controller } = await makeRig([youth('young', { age: 18 })], 1);
        const view = controller.getFlowView();
        assert.isFalse(view.actives.contentPanel);
        assert.isTrue(view.actives.emptyHint);
        assert.isFalse(view.actives.blockedLabel);
        assert.isFalse(view.enabled.btnConfirmJob);
    });

    return suite;
}
