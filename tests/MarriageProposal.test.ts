/**
 * MarriageProposal.test.ts — 名門求親（PROG-2-1811）
 *
 * 鎖住：門第與對象條件、年末才提親、回覆結果、存讀檔、彈窗節點對得上版面。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import {
    buildSuitorGeneral, marriageAcceptLabel, marriageProposalLine, marriageSuitorLine, marriageTargetOf,
    normalizeMarriageProposal, rollMarriageProposal, type MarriageProposal,
} from '../assets/scripts/core/systems/MarriageProposal';
import { MarriageProposalPopupController } from '../assets/scripts/ui/core/MarriageProposalPopupController';
import { isFemale, isMale } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const person = (id: string, gender: string, age: number, ep: number, extra: Record<string, unknown> = {}): GeneralConfig => ({
    id, name: `趙${id}`, faction: 'player', gender, age, ep, role: 'Combat', fatherId: 'founder', ...extra,
} as unknown as GeneralConfig);

function proposalOf(roster: GeneralConfig[], tier: 0 | 1 | 2 | 3 = 2): MarriageProposal | null {
    return rollMarriageProposal(roster, tier, 'suitor-1', () => 0);
}

function build(roster: GeneralConfig[], tier: number): { session: GameSession; store: InMemoryRosterStore } {
    const session = new GameSession();
    const store = new InMemoryRosterStore(roster);
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0);
    (session as unknown as { _clanTier: number })._clanTier = tier;
    return { session, store };
}

function setProposal(session: GameSession, proposal: MarriageProposal | null): void {
    (session as unknown as { _marriageProposal: MarriageProposal | null })._marriageProposal = proposal;
}

function collectIds(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const c of node.children ?? []) collectIds(c as { id?: string; children?: unknown[] }, out);
    return out;
}

export function createMarriageProposalSuite(): TestSuite {
    const suite = new TestSuite('MarriageProposal (名門求親 PROG-2-1811)');

    suite.test('門第未達郡望不提親', () => {
        const roster = [person('a', '男', 20, 50)];
        assert.equals(null, proposalOf(roster, 1));
        assert.isTrue(proposalOf(roster, 2) !== null);
        assert.isTrue(proposalOf(roster, 3) !== null);
    });

    suite.test('對象是適齡未婚的子嗣，EP 高者優先', () => {
        const roster = [
            person('kid', '男', 10, 99),
            person('wed', '男', 20, 98, { breedingCount: 1 }),
            person('outsider', '男', 20, 97, { fatherId: '', motherId: '' }),
            person('low', '男', 20, 50),
            person('high', '女', 20, 60),
        ];
        assert.equals('high', marriageTargetOf(roster)?.id ?? '');
        assert.equals(null, marriageTargetOf([person('kid', '男', 10, 99)]));
    });

    suite.test('對象性別與提親子弟相反', () => {
        assert.equals('女', proposalOf([person('a', '男', 20, 50)])?.suitor.gender ?? '');
        assert.equals('男', proposalOf([person('a', '女', 20, 50)])?.suitor.gender ?? '');
    });

    suite.test('高門的聘禮與對象都比郡望好', () => {
        const low = proposalOf([person('a', '男', 20, 50)], 2) as MarriageProposal;
        const high = proposalOf([person('a', '男', 20, 50)], 3) as MarriageProposal;
        assert.isTrue(high.giftGold > low.giftGold);
        assert.isTrue(high.suitor.ep > low.suitor.ep);
        assert.isTrue(high.suitor.str > low.suitor.str);
    });

    suite.test('句子只有公開資訊，同姓時標出', () => {
        const proposal = proposalOf([person('a', '男', 20, 50, { name: '王統' })]) as MarriageProposal;
        assert.equals('太原王氏遣媒人攜重禮上門，願以王蘭與王統結親。', marriageProposalLine(proposal));
        assert.equals('應允：王蘭嫁入我門', marriageAcceptLabel(proposal));
        const line = marriageSuitorLine(proposal);
        assert.isTrue(line.indexOf('鄉評風聞') >= 0);
        assert.isTrue(line.indexOf('同宗同姓：皆為王氏') >= 0);
        assert.isTrue(marriageSuitorLine(proposalOf([person('a', '男', 20, 50)]) as MarriageProposal).indexOf('同宗同姓') < 0);
        assert.equals('應允：王彥入贅我門', marriageAcceptLabel(proposalOf([person('a', '女', 20, 50)]) as MarriageProposal));
    });

    suite.test('對象進名冊後可以結緣：滿年齡、性別正確', () => {
        const female = buildSuitorGeneral(proposalOf([person('a', '男', 20, 50)]) as MarriageProposal);
        const male = buildSuitorGeneral(proposalOf([person('a', '女', 20, 50)]) as MarriageProposal);
        assert.isTrue(isFemale(female));
        assert.isTrue(isMale(male));
        assert.isTrue((female.age ?? 0) >= 16);
    });

    suite.test('年末且門第足夠才提親，其他季不提親', async () => {
        const { session } = build([person('a', '男', 30, 50)], 2);
        const seasons: Array<boolean> = [];
        for (let i = 0; i < 4; i++) {
            await session.advanceSeason();
            seasons.push(session.marriageProposal !== null);
        }
        assert.equals('false,false,false,true', seasons.join());
    });

    suite.test('門第不足時年末也不提親', async () => {
        const { session } = build([person('a', '男', 30, 50)], 1);
        for (let i = 0; i < 4; i++) await session.advanceSeason();
        assert.equals(null, session.marriageProposal);
    });

    suite.test('應允：對象進名冊、收聘禮、提親清掉', async () => {
        const roster = [person('a', '男', 20, 50)];
        const { session, store } = build(roster, 2);
        setProposal(session, proposalOf(roster));
        let gold = 0;
        const result = await session.respondMarriageProposal(true, (n) => { gold += n; });
        assert.isTrue(result.ok);
        assert.equals(500, gold);
        assert.isTrue(store.getAll().some((g) => g.id === 'suitor-1'));
        assert.equals(null, session.marriageProposal);
    });

    suite.test('婉拒：不進名冊、沒有聘禮；沒有提親時回覆無效', async () => {
        const roster = [person('a', '男', 20, 50)];
        const { session, store } = build(roster, 2);
        setProposal(session, proposalOf(roster));
        let gold = 0;
        assert.isTrue((await session.respondMarriageProposal(false, (n) => { gold += n; })).ok);
        assert.equals(0, gold);
        assert.lengthEquals(1, store.getAll());
        assert.isFalse((await session.respondMarriageProposal(true, (n) => { gold += n; })).ok);
        assert.equals(0, gold);
    });

    suite.test('存讀檔後還是同一筆提親', async () => {
        const roster = [person('a', '男', 20, 50)];
        const { session } = build(roster, 2);
        const adapter = new PlayerSaveService(new MemoryStorageAdapter());
        session.setSaveService(adapter);
        const proposal = proposalOf(roster) as MarriageProposal;
        setProposal(session, proposal);
        await session.save();
        const next = new GameSession();
        next.setRosterStore(new InMemoryRosterStore(roster));
        next.setSaveService(adapter);
        assert.isTrue(await next.load());
        assert.equals(proposal.suitor.name, next.marriageProposal?.suitor.name ?? '');
        assert.equals(proposal.giftGold, next.marriageProposal?.giftGold ?? 0);
    });

    suite.test('欄位不齊的存檔資料視同沒有提親', () => {
        const proposal = proposalOf([person('a', '男', 20, 50)]) as MarriageProposal;
        assert.equals(proposal.suitor.name, normalizeMarriageProposal(JSON.parse(JSON.stringify(proposal)))?.suitor.name ?? '');
        assert.equals(null, normalizeMarriageProposal(undefined));
        assert.equals(null, normalizeMarriageProposal({ ...proposal, giftGold: 'x' }));
        assert.equals(null, normalizeMarriageProposal({ ...proposal, suitor: { ...proposal.suitor, gender: '?' } }));
    });

    suite.test('彈窗：有提親顯示內容，回覆後顯示結果', async () => {
        const roster = [person('a', '男', 20, 50)];
        const { session } = build(roster, 2);
        setProposal(session, proposalOf(roster));
        const popup = new MarriageProposalPopupController({ session, grantGold: () => undefined });
        assert.isTrue(popup.hasPending());
        const before = popup.getView();
        assert.isTrue(before.actives.mpPanel);
        assert.equals('聘禮：黃金 500', before.texts.mpGift);
        assert.equals('稍後', before.texts.closeMpLabel);
        assert.isTrue(await popup.respond(true));
        const after = popup.getView();
        assert.isFalse(popup.hasPending());
        assert.isFalse(after.actives.mpPanel);
        assert.isFalse(after.actives.mpEmptyHint);
        assert.equals('王蘭 入我門下，收下聘禮黃金 500。', after.texts.mpNotice);
        assert.equals('關閉', after.texts.closeMpLabel);
    });

    suite.test('彈窗 view 的 key 都對得上版面節點', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/ui-spec/layouts/marriage-proposal-main.json'), 'utf8'));
        const ids = collectIds(layout.root, new Set<string>());
        const { session } = build([], 2);
        const view = new MarriageProposalPopupController({ session, grantGold: () => undefined }).getView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(ids.has(key), `layout 缺節點 ${key}`);
        }
    });

    return suite;
}
