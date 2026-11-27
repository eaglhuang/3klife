// @spec-source → 戰前情報偵查面板與戰法對策槽位容量規格書.md（doc_spec_0347）；PROG-2-10135 偵察面板「幫我換上」
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { EncounterConfig } from '../assets/scripts/shared/BattleEntryParams';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { DEFAULT_AUTOFILL_RULES, parseAutofillRules, planTacticAutofill, type TacticAutofillInput } from '../assets/scripts/core/systems/TacticAutofill';
import { buildScoutAutofillHooks, effectiveTacticSlots } from '../assets/scripts/ui/core/ScoutAutofillBinding';
import { buildLobbyScout, ScoutPanelController } from '../assets/scripts/ui/core/ScoutPanelController';
import { buildBattleConfig, COMMON_TACTIC_ID } from '../assets/scripts/core/systems/BattleRoster';
import { Faction } from '../assets/scripts/shared/CommonEnums';

const ROOT = path.resolve(__dirname, '..');
const TAGS = {
    TAC_LANCE_THRUST: ['破城'],
    TAC_FIRE_ATTACK: ['火攻', '破城'],
    TAC_INSPIRE: ['鼓舞', '抗混亂'],
    TAC_SHIELD: ['守城'],
    TAC_SLOW: ['牽制'],
    TAC_EMPTY_FORT: ['守城'],
    TAC_HASTE: ['突破'],
};

function input(extra: Partial<TacticAutofillInput>): TacticAutofillInput {
    return {
        required: ['破城'], recommended: ['鼓舞'], equipped: [], owned: [], capacity: 3, tagTable: TAGS,
        levelOf: () => 1, enemyTroops: [], rules: DEFAULT_AUTOFILL_RULES, ...extra,
    };
}

export function createTacticAutofillSuite(): TestSuite {
    const suite = new TestSuite('TacticAutofill (偵察面板幫我換上 PROG-2-10135)');

    suite.test('有空槽先填空槽；一招同時補兩個缺口的優先', () => {
        const plan = planTacticAutofill(input({ owned: ['TAC_LANCE_THRUST', 'TAC_FIRE_ATTACK', 'TAC_INSPIRE'], recommended: ['火攻', '鼓舞'] }));
        // 火攻戰法同時補 破城＋火攻，先選；鼓舞再補
        assert.equals('tactic-insp-fire-attack,tactic-insp-inspire', plan.changes.map((c) => c.tacticId).join(','));
        assert.isTrue(plan.changes.every((c) => c.replaces === null));
        assert.equals(0, plan.remainingGaps.length);
    });

    suite.test('缺口為空或沒有可補的持有戰法：不動，並標示尚未持有', () => {
        const ready = planTacticAutofill(input({ equipped: [{ slotId: 'slot-1', tacticId: 'TAC_LANCE_THRUST' }, { slotId: 'slot-2', tacticId: 'TAC_INSPIRE' }], owned: ['TAC_SLOW'] }));
        assert.equals(0, ready.changes.length);
        const none = planTacticAutofill(input({ owned: ['TAC_SLOW'] }));
        assert.equals(0, none.changes.length);
        assert.isTrue(none.nothingOwned);
        assert.equals('破城,鼓舞', none.remainingGaps.join(','));
    });

    suite.test('槽滿：只換不含本關標籤、等級最低的一格；已涵蓋缺口的絕不換', () => {
        const equipped = [
            { slotId: 'slot-1', tacticId: 'TAC_INSPIRE' },
            { slotId: 'slot-2', tacticId: 'TAC_SLOW' },
            { slotId: 'slot-3', tacticId: 'TAC_EMPTY_FORT' },
        ];
        const levels: Record<string, number> = { TAC_SLOW: 3, TAC_EMPTY_FORT: 1 };
        const plan = planTacticAutofill(input({ equipped, owned: ['TAC_LANCE_THRUST'], levelOf: (id) => levels[id] ?? 1 }));
        assert.equals(1, plan.changes.length);
        assert.equals('slot-3', plan.changes[0].slotId);
        assert.equals('TAC_EMPTY_FORT', plan.changes[0].replaces);
        assert.isTrue(plan.nextSlots.some((s) => s.tacticId === 'TAC_INSPIRE'));
    });

    suite.test('槽全被本關標籤佔滿：不換、標示 slotsBlocked，不超過槽位上限', () => {
        const plan = planTacticAutofill(input({
            required: ['守城', '鼓舞', '破城'], recommended: [], capacity: 2,
            equipped: [{ slotId: 'slot-1', tacticId: 'TAC_SHIELD' }, { slotId: 'slot-2', tacticId: 'TAC_INSPIRE' }],
            owned: ['TAC_LANCE_THRUST'],
        }));
        assert.equals(0, plan.changes.length);
        assert.isTrue(plan.slotsBlocked);
        assert.equals(2, plan.nextSlots.length);
    });

    suite.test('通用計謀算涵蓋、不重複補；同分時依資料檔的排序（兵種加權、等級）決定', () => {
        const covered = planTacticAutofill(input({ required: ['突破'], recommended: [], alwaysOn: ['tactic-insp-haste'], owned: ['TAC_HASTE'] }));
        assert.equals(0, covered.remainingGaps.length);
        assert.equals(0, covered.changes.length);
        // 兩招都補「破城」：長槍等級高、火攻戰法吃到敵軍弓兵加權（火攻）
        const owned = ['TAC_LANCE_THRUST', 'TAC_FIRE_ATTACK'];
        const levelOf = (id: string): number => (id === 'tactic-insp-lance-thrust' ? 5 : 1);
        const byLevel = planTacticAutofill(input({ recommended: [], owned, levelOf, rules: parseAutofillRules({ scoreOrder: ['requiredCovered', 'level'] }) }));
        assert.equals('tactic-insp-lance-thrust', byLevel.changes[0].tacticId);
        const byTroop = planTacticAutofill(input({
            recommended: [], owned, levelOf, enemyTroops: ['archer'],
            rules: parseAutofillRules({ scoreOrder: ['requiredCovered', 'troopBonus', 'level'], troopTypeTags: { archer: ['火攻'] } }),
        }));
        assert.equals('tactic-insp-fire-attack', byTroop.changes[0].tacticId);
    });

    suite.test('規則資料檔存在、可解析，未知排序鍵退回預設', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/tactic-autofill-rules.json'), 'utf8'));
        const rules = parseAutofillRules(raw);
        assert.equals('requiredCovered,totalCovered,troopBonus,level', rules.scoreOrder.join(','));
        assert.isTrue((rules.troopTypeTags.cavalry ?? []).length > 0);
        assert.equals(DEFAULT_AUTOFILL_RULES.scoreOrder.join(','), parseAutofillRules({ scoreOrder: ['nope'] }).scoreOrder.join(','));
    });

    suite.test('面板流程：預覽不寫入→按鈕換上→情資更新→復原還原戰法槽；出征不被鎖', () => {
        const encounter = { id: 'e', name: 'e', theme: '攻城', playerGeneralId: 'a', enemyGeneralId: 'b', requiredLoadout: ['破城'], highlyRecommendedLoadout: ['鼓舞'], enemyInitialDeployment: [{ type: 'cavalry', lane: 1 }] } as unknown as EncounterConfig;
        let lead = { id: 'a', name: 'A', int: 90, tacticSlots: [{ slotId: 'slot-1', tacticId: 'tactic-insp-slow', source: 'gacha' }], learnedTactics: ['TAC_LANCE_THRUST', 'TAC_INSPIRE'] } as unknown as GeneralConfig;
        const writes: string[][] = [];
        const rebuild = () => buildLobbyScout(encounter, null, effectiveTacticSlots(lead).map((s) => s.tacticId), TAGS);
        const hooks = buildScoutAutofillHooks({
            encounter, currentLead: () => lead, tagTable: TAGS, rules: DEFAULT_AUTOFILL_RULES, nameOf: (id) => `N:${id}`,
            writeSlots: (_id, slots) => { writes.push(slots.map((s) => s.tacticId)); lead = { ...lead, tacticSlots: [...slots] } as GeneralConfig; return true; },
            rebuild,
        });
        const ctrl = new ScoutPanelController();
        void ctrl.ask(rebuild(), hooks);
        const before = ctrl.getView();
        assert.isTrue(before.actives.btnScoutAutofill);
        assert.isTrue(before.texts.scoutAutofillNote.includes('N:tactic-insp-lance-thrust'));
        assert.equals('幫我換上', before.texts.scoutAutofillLabel);
        assert.equals(0, writes.length);
        ctrl.autofill();
        const after = ctrl.getView();
        assert.equals(1, writes.length);
        assert.isTrue(after.actives.scoutLoadoutReady);
        assert.equals('復原', after.texts.scoutAutofillLabel);
        assert.isTrue(after.texts.scoutAutofillNote.startsWith('已換上'));
        ctrl.autofill();
        assert.equals('tactic-insp-slow', (lead.tacticSlots ?? []).map((s) => s.tacticId).join(','));
        assert.isFalse(ctrl.getView().actives.scoutLoadoutReady);
        // 復原後缺口回來，按出征先進確認框（高風險），不是鎖死
        assert.isFalse(ctrl.sortie());
        assert.isTrue(ctrl.isConfirming());
    });

    suite.test('兩個智力槽：偵察面板預覽的槽位＝戰場實際帶的槽位（通用計謀排在前面也不吃掉智力槽）', () => {
        // 智力 30 → 2 槽；存檔裡通用計謀排第一格（轉蛋／舊資料常見）
        const lead = { id: 'a', name: 'A', int: 30, tacticSlots: [
            { slotId: 'slot-1', tacticId: COMMON_TACTIC_ID, source: 'inborn' },
            { slotId: 'slot-2', tacticId: 'tactic-insp-lance-thrust', source: 'gacha' },
            { slotId: 'slot-3', tacticId: 'tactic-insp-inspire', source: 'gacha' },
        ] } as unknown as GeneralConfig;
        const previewIds = [COMMON_TACTIC_ID, ...effectiveTacticSlots(lead).map((s) => s.tacticId)];
        const battleIds = (buildBattleConfig(lead, Faction.Player).tacticSlots ?? []).map((s) => s.tacticId);
        assert.equals(previewIds.slice().sort().join(','), battleIds.slice().sort().join(','));
        assert.equals(3, battleIds.length);
        // 套用後存回去的槽位，戰場同樣要帶滿「加速＋A＋B」
        const stored = [{ slotId: 'slot-1', tacticId: 'tactic-insp-lance-thrust', source: 'learned' }, { slotId: 'slot-2', tacticId: 'tactic-insp-inspire', source: 'learned' }, { slotId: 'slot-3', tacticId: COMMON_TACTIC_ID, source: 'inborn' }];
        const after = buildBattleConfig({ ...lead, tacticSlots: stored } as unknown as GeneralConfig, Faction.Player).tacticSlots ?? [];
        assert.equals('tactic-insp-lance-thrust,tactic-insp-inspire,tactic-insp-haste', after.map((s) => s.tacticId).join(','));
    });

    const writeCase = (write: (leadRef: { v: GeneralConfig }, slots: readonly { slotId: string; tacticId: string }[]) => boolean) => {
        const encounter = { id: 'e', name: 'e', theme: '攻城', playerGeneralId: 'a', enemyGeneralId: 'b', requiredLoadout: ['破城'], highlyRecommendedLoadout: ['鼓舞'], enemyInitialDeployment: [] } as unknown as EncounterConfig;
        const ref = { v: { id: 'a', name: 'A', int: 90, tacticSlots: [{ slotId: 'slot-1', tacticId: 'tactic-insp-slow', source: 'gacha' }], learnedTactics: ['TAC_LANCE_THRUST', 'TAC_INSPIRE'] } as unknown as GeneralConfig };
        const rebuild = () => buildLobbyScout(encounter, null, effectiveTacticSlots(ref.v).map((s) => s.tacticId), TAGS);
        const hooks = buildScoutAutofillHooks({
            encounter, currentLead: () => ref.v, tagTable: TAGS, rules: DEFAULT_AUTOFILL_RULES, nameOf: (id) => `N:${id}`,
            writeSlots: (_id, slots) => write(ref, slots), rebuild,
        });
        const ctrl = new ScoutPanelController();
        void ctrl.ask(rebuild(), hooks);
        return { ctrl, ref };
    };

    suite.test('寫入回傳失敗：面板不顯示已換上、不改狀態、顯示失敗訊息，戰法槽維持原樣', () => {
        const { ctrl, ref } = writeCase(() => false);
        ctrl.autofill();
        const view = ctrl.getView();
        assert.isFalse(ctrl.isAutofillApplied());
        assert.isFalse(view.texts.scoutAutofillNote.startsWith('已換上'));
        assert.isTrue(view.texts.scoutAutofillNote.includes('失敗'));
        assert.equals('tactic-insp-slow', (ref.v.tacticSlots ?? []).map((s) => s.tacticId).join(','));
        assert.equals('幫我換上', view.texts.scoutAutofillLabel);
    });

    suite.test('寫入回傳成功但實際資料沒變：從最新資料重讀驗證，不顯示已換上', () => {
        const { ctrl } = writeCase(() => true);
        ctrl.autofill();
        assert.isFalse(ctrl.isAutofillApplied());
        assert.isFalse(ctrl.getView().texts.scoutAutofillNote.startsWith('已換上'));
        assert.isTrue(ctrl.getView().texts.scoutAutofillNote.includes('失敗'));
    });

    suite.test('寫入成功且資料確實更新：才顯示已換上；復原寫入失敗時維持已換上並提示失敗', () => {
        let allow = true;
        const { ctrl, ref } = writeCase((leadRef, slots) => {
            if (!allow) return false;
            leadRef.v = { ...leadRef.v, tacticSlots: slots.map((s) => ({ ...s })) } as GeneralConfig;
            return true;
        });
        ctrl.autofill();
        assert.isTrue(ctrl.isAutofillApplied());
        assert.isTrue(ctrl.getView().texts.scoutAutofillNote.startsWith('已換上'));
        assert.isTrue((ref.v.tacticSlots ?? []).some((s) => s.tacticId === 'tactic-insp-lance-thrust'));
        allow = false;
        ctrl.autofill();
        assert.isTrue(ctrl.isAutofillApplied());
        assert.isTrue(ctrl.getView().texts.scoutAutofillNote.includes('失敗'));
    });

    suite.test('四語系字串齊全、版面與大廳接線都有新節點', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/i18n/${lang}.json`), 'utf8')) as Record<string, string>;
            for (const k of ['autofillBtn', 'autofillUndo', 'autofillPreview', 'autofillDone', 'autofillSwap', 'autofillFill', 'autofillNone', 'autofillBlocked', 'autofillFailed']) {
                assert.isTrue(typeof table[`scout.${k}`] === 'string' && table[`scout.${k}`].length > 0, `${lang} ${k}`);
            }
        }
        const layout = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/scout-panel-main.json'), 'utf8');
        assert.isTrue(layout.includes('btnScoutAutofill') && layout.includes('scoutAutofillNote'));
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("buttonId: 'btnScoutAutofill'"));
    });

    return suite;
}
