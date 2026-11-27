/**
 * MercenaryOath.test.ts — 傭兵結義條件清單、儀式步驟、i18n 文案、義兄弟士氣加成（PROG-2-10201）
 */
import { assert, TestSuite } from './TestRunner';
import {
    BOND_POINTS_MAX_CAP, OATH_TEXTS, SWORN_MORALE_BONUS, buildOathRitual, clampBondPoints, evaluateOath,
    oathConditionLines, oathText, swornMoraleBonus, swornPartnerOf,
} from '../assets/scripts/core/systems/MercenaryOath';
import { buildMercenaryPanelView } from '../assets/scripts/core/systems/MercenaryPanelView';
import { createTrialMercenary } from '../assets/scripts/core/systems/MercenaryBond';
import { MercenaryPanelController } from '../assets/scripts/ui/core/MercenaryPanelController';
import type { MercenaryState } from '../assets/scripts/core/systems/MercenaryBond';
import * as fs from 'fs';
import * as path from 'path';

const READY: MercenaryState = { ...createTrialMercenary('m1'), daysLeft: 0, bond: 6, affection: 60, generalId: 'zhao-yun' };

export function createMercenaryOathSuite(): TestSuite {
    const suite = new TestSuite('MercenaryOath (PROG-2-10201 傭兵結義條件／儀式／i18n／義兄弟)');

    suite.test('條件清單：試用中三項皆未滿足，逐項顯示目前值', () => {
        const state = { ...createTrialMercenary('m1'), daysLeft: 4, bond: 2, affection: 20 };
        const ev = evaluateOath(state, { cost: 300, bondPoints: 100 });
        assert.isFalse(ev.allMet);
        assert.equals(3, ev.conditions.length);
        assert.equals('○ 試用滿六日（2/6）\n○ 好感達 60（目前 20）\n○ 結義點數達 300（目前 100）', oathConditionLines(ev));
    });

    suite.test('條件清單：三項都滿足才 allMet，✓ 開頭', () => {
        const ev = evaluateOath(READY, { cost: 300, bondPoints: 300 });
        assert.isTrue(ev.allMet);
        assert.isTrue(oathConditionLines(ev).split('\n').every((line) => line.startsWith('✓')));
    });

    suite.test('條件清單：已結義只顯示「已結義」，離隊者空白，且都不能再結義', () => {
        const bonded = evaluateOath({ ...READY, status: 'Bonded' }, { cost: 300, bondPoints: 999 });
        assert.equals('✓ 已結義', oathConditionLines(bonded));
        assert.isFalse(bonded.allMet);
        const expired = evaluateOath({ ...READY, status: 'Expired' }, { cost: 300, bondPoints: 999 });
        assert.equals('', oathConditionLines(expired));
    });

    suite.test('好感沒滿時面板結義鈕不可按（與 GameSession 結義判定一致），好感文字與點數文字顯示', () => {
        const view = buildMercenaryPanelView({ ...READY, affection: 40 }, { originalOwnerName: '曹操', generalName: '趙雲', bondPoints: 999, rarity: 'SR' });
        assert.isFalse(view.bondEnabled);
        assert.equals('好感：40/60', view.affectionText);
        assert.equals('結義點數：持有 999／需要 300', view.pointsText);
    });

    suite.test('i18n：有查到就用 i18n 並代入參數；查不到（回傳 key）退回 zh-TW 預設', () => {
        const en = (key: string): string => (key === 'oath.countdown' ? 'Oath countdown: {0} days' : key);
        assert.equals('Oath countdown: 3 days', oathText(en, 'countdown', 3));
        assert.equals('原主：甲', oathText(en, 'nametag', '甲'));
        assert.equals('原主：甲', oathText(undefined, 'nametag', '甲'));
    });

    suite.test('四語系都有全部 oath.* 文案 key（不寫死中文）', () => {
        const dir = path.join(__dirname, '..', 'assets', 'resources', 'i18n');
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(dir, `${locale}.json`), 'utf8')) as Record<string, string>;
            for (const key of Object.keys(OATH_TEXTS)) {
                assert.isTrue(typeof table[`oath.${key}`] === 'string' && table[`oath.${key}`].length > 0, `${locale} 缺 oath.${key}`);
            }
        }
        const tw = JSON.parse(fs.readFileSync(path.join(dir, 'zh-TW.json'), 'utf8')) as Record<string, string>;
        for (const key of Object.keys(OATH_TEXTS) as Array<keyof typeof OATH_TEXTS>) {
            assert.equals(OATH_TEXTS[key], tw[`oath.${key}`], `zh-TW oath.${key} 與預設不同步`);
        }
    });

    suite.test('儀式步驟：有義兄弟點名兩人，沒有則單人；依序焚香、對飲、立誓、完成', () => {
        const withPartner = buildOathRitual('趙雲', '劉備');
        assert.equals(4, withPartner.length);
        assert.equals('焚香祭天，趙雲 與 劉備 並肩立於桃林之下。', withPartner[0].text);
        assert.equals('斟滿酒盞，對飲三巡。', withPartner[1].text);
        assert.equals('趙雲 願誓死追隨主公！桃園之義，永世不渝！', withPartner[2].text);
        assert.equals('結義完成：趙雲 成為永久武將', withPartner[3].text);
        assert.equals('焚香祭天，趙雲 立於主公座前。', buildOathRitual('趙雲', null)[0].text);
        assert.isTrue(withPartner.reduce((sum, step) => sum + step.ms, 0) <= 8000);
    });

    suite.test('義兄弟：DYNAMIC_SWORN／SWORN 都找得到另一端，其他關係不算', () => {
        const rels = [
            { uidA: 'a', uidB: 'b', type: 'COMRADE' },
            { uidA: 'zhao-yun', uidB: 'liu-bei', type: 'DYNAMIC_SWORN' },
        ];
        assert.equals('liu-bei', swornPartnerOf('zhao-yun', rels));
        assert.equals('zhao-yun', swornPartnerOf('liu-bei', rels));
        assert.equals(null, swornPartnerOf('a', rels));
    });

    suite.test('義兄弟同陣士氣上限 +20：任兩人同在出征名單才加，不疊加', () => {
        const rels = [
            { uidA: 'x', uidB: 'y', type: 'DYNAMIC_SWORN' },
            { uidA: 'x', uidB: 'z', type: 'SWORN' },
        ];
        assert.equals(SWORN_MORALE_BONUS, swornMoraleBonus(['x', 'y'], rels));
        assert.equals(SWORN_MORALE_BONUS, swornMoraleBonus(['x', 'y', 'z'], rels));
        assert.equals(0, swornMoraleBonus(['x', 'q'], rels));
        assert.equals(0, swornMoraleBonus([], rels));
    });

    suite.test('結義點數錢包夾制：上限 50000、負數與非數值為 0、小數捨去', () => {
        assert.equals(BOND_POINTS_MAX_CAP, clampBondPoints(49990 + 1200));
        assert.equals(0, clampBondPoints(-5));
        assert.equals(0, clampBondPoints(Number.NaN));
        assert.equals(120, clampBondPoints(120.9));
    });

    suite.test('面板控制器：條件清單、好感、點數、義兄弟文字進 FlowView，且走傳入的 lookup', async () => {
        const controller = new MercenaryPanelController({
            mercenaries: () => [{ ...READY, status: 'Bonded' as const }],
            info: () => ({ originalOwnerName: '曹操', generalName: '趙雲', rarity: 'SR' as const }),
            bondPoints: () => 500,
            bond: async () => true,
            lookup: (key: string) => (key === 'oath.panelTitle' ? 'Mercenaries - Oath' : key),
            swornPartnerName: () => '劉備',
        });
        const flow = controller.getFlowView();
        assert.equals('Mercenaries - Oath', flow.texts.mercPanelTitle);
        assert.equals('好感：60/60', flow.texts.mercAffection);
        assert.equals('✓ 已結義', flow.texts.mercConditions);
        assert.equals('義兄弟：劉備　同陣出征士氣上限 +20', flow.texts.mercSworn);
        assert.isTrue(flow.actives.mercSworn);
        assert.isTrue(flow.actives.mercConditions);
    });

    return suite;
}
