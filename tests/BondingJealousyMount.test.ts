import * as fs from 'fs';
import * as path from 'path';
import { TestSuite } from './TestRunner';
import { BondingSuccessService } from '../assets/scripts/core/systems/BondingSuccessService';
import { BondingJealousyRuntime, JEALOUSY_MIN_SPOUSES, pairSynergyK, seedOfText } from '../assets/scripts/core/systems/BondingJealousyRuntime';
import { JealousyAndDynastyService } from '../assets/scripts/core/systems/JealousyAndDynastyService';
import { emptyFamilySynergyLedger, familyPairKey } from '../assets/scripts/core/systems/FamilySynergy';

const ROOT = path.resolve(__dirname, '..');
const readJson = <T = any>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];

function collectIds(node: any, out: Set<string>): void {
    if (node?.id) out.add(node.id);
    for (const child of node?.children ?? []) collectIds(child, out);
}

/** PROG-2-10043 提親機率面板與吃醋彈窗掛載：資料組裝、四語系、畫面規格與主題登錄 */
export function createBondingJealousyMountSuite(): TestSuite {
    const suite = new TestSuite('BondingJealousyMount');

    suite.test('提親成功率 = clamp(25 + (K-0.8)*45 + F/2 + 誠意 + 媒人, 15, 95)', () => {
        const cases = [
            { k: 1.0, f: 40, rejects: 0, m: 0 },
            { k: 0, f: 0, rejects: 0, m: 0 },
            { k: 1.0, f: 100, rejects: 3, m: 10 },
        ];
        for (const c of cases) {
            const sincerity = BondingSuccessService.getSincerityBonus(c.rejects);
            const got = BondingSuccessService.calculateBondingProbability({ compatibilityK: c.k, favorF: c.f, sincerityBonus: sincerity, matchmakerBonus: c.m }).finalRate;
            const raw = 25 + Math.round((c.k - 0.8) * 45) + Math.round(c.f / 2) + sincerity + c.m;
            const want = Math.max(15, Math.min(95, raw));
            if (got !== want) throw new Error(`K=${c.k} F=${c.f} 預期 ${want} 實際 ${got}`);
        }
    });

    suite.test('pairSynergyK：缺家族編號或無紀錄回 0，有紀錄回帳本值', () => {
        const ledger = emptyFamilySynergyLedger();
        if (pairSynergyK(ledger, { familyUid: 'A' }, {}) !== 0) throw new Error('缺家族編號應為 0');
        if (pairSynergyK(ledger, { familyUid: 'A' }, { familyUid: 'B' }) !== 0) throw new Error('無紀錄應為 0');
        ledger.pairs[familyPairKey('A', 'B')] = { recentBitmap: 0xff, recentCount: 8, lifetimeQualified: 8 };
        if (!(pairSynergyK(ledger, { familyUid: 'B' }, { familyUid: 'A' }) > 0)) throw new Error('有合譜紀錄 K 應大於 0');
    });

    suite.test('提親狀態：被拒次數與保底旗標暫存、好感取真實值', () => {
        const rt = new BondingJealousyRuntime();
        const first = rt.proposalStateFor('m1', 30, false);
        if (first.rejectCount !== 0 || first.favorF !== 30) throw new Error('初始狀態不對');
        rt.commitProposal('m1', { ...first, rejectCount: 2, cooldownSeasons: 2, matchmakerFallbackUsed: true });
        const again = rt.proposalStateFor('m1', 18, false);
        if (again.rejectCount !== 2 || again.favorF !== 18 || !again.matchmakerFallbackUsed) throw new Error('暫存沒帶回');
        if (rt.proposalStateFor('m2', 0, false).rejectCount !== 0) throw new Error('不同對象不該共用被拒次數');
    });

    suite.test('吃醋觸發：配偶不足兩位不觸發；每位配偶每年一次；換年再來', () => {
        const rt = new BondingJealousyRuntime();
        if (rt.pickJealousySpouse(['a'], 1) !== null) throw new Error(`少於 ${JEALOUSY_MIN_SPOUSES} 位配偶不該觸發`);
        if (rt.pickJealousySpouse(['a', 'b'], 1) !== 'a') throw new Error('應先挑第一位');
        const real = { favor: 50, stamina: 0, silver: 999 };
        rt.commitJealousy(JealousyAndDynastyService.resolveJealousyOption(rt.jealousyStateFor(real), 'A', 1, 'a', 0).nextState);
        if (rt.pickJealousySpouse(['a', 'b'], 1) !== 'b') throw new Error('a 本年已哄過，應換 b');
        rt.commitJealousy(JealousyAndDynastyService.resolveJealousyOption(rt.jealousyStateFor(real), 'A', 1, 'b', 0).nextState);
        if (rt.pickJealousySpouse(['a', 'b'], 1) !== null) throw new Error('兩位本年都哄過應回 null');
        if (rt.pickJealousySpouse(['a', 'b'], 2) !== 'a') throw new Error('隔年應重新有名額');
    });

    suite.test('seedOfText 穩定且非負', () => {
        if (seedOfText('f|m') !== seedOfText('f|m') || seedOfText('f|m') < 0) throw new Error('種子不穩定');
    });

    suite.test('新增與面板用到的 i18n 鍵在四語系都有', () => {
        const keys = [
            'ui.bonding.title', 'ui.bonding.breakdown.base', 'ui.bonding.breakdown.compatibility', 'ui.bonding.breakdown.favor',
            'ui.bonding.breakdown.sincerity', 'ui.bonding.breakdown.matchmaker',
            'ui.bonding.proposal.open', 'ui.bonding.proposal.target', 'ui.bonding.proposal.none', 'ui.bonding.proposal.propose',
            'ui.bonding.proposal.close', 'ui.bonding.proposal.age', 'ui.bonding.proposal.result.success', 'ui.bonding.proposal.result.fail',
            'ui.bonding.proposal.result.fallback', 'ui.bonding.proposal.result.partner', 'ui.bonding.proposal.result.enrollBlocked',
            'ui.jealousy.optionA.label', 'ui.jealousy.optionB.label', 'ui.jealousy.optionC.label', 'ui.jealousy.title.sleep_god',
            'ui.jealousy.caught.1', 'ui.jealousy.caught.2', 'ui.jealousy.caught.3',
            'ui.jealousy.popup.title', 'ui.jealousy.popup.hint', 'ui.jealousy.popup.spouse', 'ui.jealousy.popup.outcome',
            'ui.jealousy.popup.blocked', 'ui.jealousy.popup.noSilver', 'ui.jealousy.popup.close',
        ];
        for (const locale of LOCALES) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
            for (const key of keys) {
                const value = table[key];
                if (!value || value === key) throw new Error(`${locale} 缺少 ${key}`);
            }
        }
    });

    suite.test('畫面規格：LobbyScene 綁的節點 id 都存在，且兩張皮膚登記進 settle 家族', () => {
        const bp = new Set<string>();
        collectIds(readJson('assets/resources/ui-spec/layouts/bonding-proposal-main.json').root, bp);
        for (const id of ['bpTitle', 'bpTarget', 'bpBreakdown', 'bpEpithet', 'bpMessage', 'btnPropose', 'btnClose', 'btnAge8', 'btnAge12', 'btnAge15',
            'btnProposeLabel', 'btnCloseLabel', 'btnAge8Label', 'btnAge12Label', 'btnAge15Label']) {
            if (!bp.has(id)) throw new Error(`提親面板缺節點 ${id}`);
        }
        const jp = new Set<string>();
        collectIds(readJson('assets/resources/ui-spec/layouts/jealousy-popup-main.json').root, jp);
        for (const id of ['jpTitle', 'jpSpouse', 'jpHint', 'jpBody', 'jpTitleUnlocked', 'btnOptionA', 'btnOptionB', 'btnOptionC', 'btnJealousyClose',
            'btnOptionALabel', 'btnOptionBLabel', 'btnOptionCLabel', 'btnJealousyCloseLabel']) {
            if (!jp.has(id)) throw new Error(`吃醋彈窗缺節點 ${id}`);
        }
        const setup = new Set<string>();
        collectIds(readJson('assets/resources/ui-spec/layouts/bonding-setup-main.json').root, setup);
        if (!setup.has('btnProposalOdds')) throw new Error('結緣畫面缺提親機率按鈕');
        const settle = readJson('assets/resources/ui-spec/themes/theme-registry.json').familyBindings.settle;
        for (const skin of ['bonding-proposal-screen.skin', 'jealousy-popup-screen.skin']) {
            if (!settle.appliesToSkins.includes(skin)) throw new Error(`${skin} 未登記 settle 家族`);
            for (const slot of Object.keys(readJson(`assets/resources/ui-spec/skins/${skin}.json`).slots)) {
                if (!settle.slotRoles[slot]) throw new Error(`${slot} 沒有 settle 角色對應`);
            }
        }
    });

    return suite;
}
