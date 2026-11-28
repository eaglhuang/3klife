/**
 * FunBloodlineMarriage.test.ts — PROG-2-10223 幼兒近況小卡、義叔／義母贈禮、胎教祈福、義兄／義姊作媒
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { childFavorOf, emptyChildLedger } from '../assets/scripts/core/systems/BloodlineChildLedger';
import { emptyInfantCareState, infantAnecdoteKey, infantAnecdoteLine, INFANT_ANECDOTE_VARIANTS, INFANT_CARE_CONFIG, isInfant, patInfant, patsLeft } from '../assets/scripts/core/systems/BloodlineInfantCare';
import { OATH_GIFT_CONFIG, oathGiftLine, oathKinOfParents, rollOathGift } from '../assets/scripts/core/systems/BloodlineOathGift';
import { applyBlessingToHighTierWeight, emptyPrenatalBlessingState, performPrenatalBlessing, PRENATAL_BLESSING_CONFIG, prenatalCountdownLine, prenatalRemainingSeasons } from '../assets/scripts/core/systems/MarriagePrenatalBlessing';
import { applyOathMatchmakerBonus, OATH_MATCHMAKER_CONFIG, oathMatchmakerBonus, oathMatchmakerLine } from '../assets/scripts/core/systems/MarriageOathMatchmaker';
import { DEFAULT_OATH_CONFIG } from '../assets/scripts/core/systems/OathConfig';
import { emptySwornState, formPact } from '../assets/scripts/core/systems/SwornPact';
import { cloneFunState, emptyFunState, isEmptyFunState, normalizeFunState } from '../assets/scripts/core/fun/FunState';
import { claimToddlerBond, normalizeToddlerPool, toddlerGrantKey } from '../assets/scripts/core/fun/FunToddlerBark';
import { infantPrenatalView } from '../assets/scripts/ui/core/InfantPrenatalView';

const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];

function dict(locale: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, `../assets/resources/i18n/${locale}.json`), 'utf8')) as Record<string, string>;
}

function pactOf(ids: string[]) {
    const r = formPact(emptySwornState(), ids, 1, () => 100, DEFAULT_OATH_CONFIG);
    if (!r.ok) throw new Error('formPact failed: ' + r.reason);
    return r.state;
}

export function createFunBloodlineMarriageSuite(): TestSuite {
    const suite = new TestSuite('FunBloodlineMarriage (PROG-2-10223)');

    suite.test('設定值與規格預設一致', () => {
        assert.equals(4, INFANT_CARE_CONFIG.maxInfantAge);
        assert.equals(1, INFANT_CARE_CONFIG.patFavorGain);
        assert.equals(0.65, OATH_GIFT_CONFIG.giftTriggerChance);
        assert.equals(120, PRENATAL_BLESSING_CONFIG.costSilver);
        assert.equals(10, OATH_MATCHMAKER_CONFIG.oathMatchmakerBonusPct);
        assert.isTrue(!OATH_MATCHMAKER_CONFIG.stackable);
    });

    suite.test('幼兒小卡：0～4 歲才顯示，同一季趣事固定、換季可換', () => {
        assert.isTrue(isInfant(0) && isInfant(4) && !isInfant(5));
        assert.equals(infantAnecdoteKey('c1', 3), infantAnecdoteKey('c1', 3));
        const keys = new Set<string>();
        for (let s = 0; s < 40; s += 1) keys.add(infantAnecdoteKey('c1', s));
        assert.isTrue(keys.size > 1 && keys.size <= INFANT_ANECDOTE_VARIANTS);
    });

    suite.test('摸頭：好感 +1、每季限 1 次、換季重置、5 歲不可摸', () => {
        let st = emptyInfantCareState();
        let ledger = emptyChildLedger();
        const base = childFavorOf(ledger, 'c1');
        const r1 = patInfant(st, ledger, 'c1', 2, 5);
        assert.isTrue(r1.ok);
        st = r1.state;
        ledger = r1.ledger;
        assert.equals(base + 1, childFavorOf(ledger, 'c1'));
        const r2 = patInfant(st, ledger, 'c1', 2, 5);
        assert.isTrue(!r2.ok && r2.reason === 'limit');
        assert.equals(0, patsLeft(st, 'c1', 5));
        const r3 = patInfant(st, ledger, 'c1', 2, 6);
        assert.isTrue(r3.ok);
        const r4 = patInfant(emptyInfantCareState(), ledger, 'c1', 5, 7);
        assert.isTrue(!r4.ok && r4.reason === 'not-infant');
    });

    suite.test('義叔／義母贈禮：階段、上限、無結義、機率、屬性或小名', () => {
        const state = pactOf(['f', 'b1', 'b2']);
        const kin = oathKinOfParents(state, 'f', 'm');
        assert.equals(2, kin.length);
        assert.equals(0, oathKinOfParents(emptySwornState(), 'f', 'm').length);
        const always = () => 0;
        assert.isTrue(rollOathGift({ stage: 'birth', oathKinIds: [], giftsGiven: 0, random: always }) === null);
        assert.isTrue(rollOathGift({ stage: 'birth', oathKinIds: kin, giftsGiven: 1, random: always }) === null);
        assert.isTrue(rollOathGift({ stage: 'birth', oathKinIds: kin, giftsGiven: 0, random: () => 0.9 }) === null);
        const stat = rollOathGift({ stage: 'zhouzhua', oathKinIds: kin, giftsGiven: 0, random: always });
        assert.isTrue(!!stat && stat.kind === 'stat' && stat.bonus === 1 && stat.stat === 'str');
        let n = 0;
        const seq = [0.1, 0.5, 0.9];
        const tag = rollOathGift({ stage: 'birth', oathKinIds: kin, giftsGiven: 0, random: () => seq[n++ % 3] });
        assert.isTrue(!!tag && tag.kind === 'tag');
    });

    suite.test('胎教祈福：只扣銀兩、限 1 次、銀兩不足不成立、只動稀有度權重', () => {
        const st0 = emptyPrenatalBlessingState();
        const low = performPrenatalBlessing(st0, 119);
        assert.isTrue(!low.ok && low.reason === 'silver-low' && low.silver === 119);
        const ok = performPrenatalBlessing(st0, 200);
        assert.isTrue(ok.ok);
        assert.equals(80, ok.silver);
        const again = performPrenatalBlessing(ok.state, 500);
        assert.isTrue(!again.ok && again.reason === 'limit' && again.silver === 500);
        assert.isTrue(Math.abs(applyBlessingToHighTierWeight(0.1, ok.state) - 0.18) < 1e-9);
        assert.equals(1, applyBlessingToHighTierWeight(0.99, ok.state));
        assert.equals(2, prenatalRemainingSeasons(10, 10, 2));
        assert.equals(0, prenatalRemainingSeasons(10, 15, 2));
    });

    suite.test('義兄／義姊作媒：對象結義兄弟在我方名冊才 +10%，不疊加；上限 100', () => {
        const state = pactOf(['t', 'a', 'b']);
        const one = oathMatchmakerBonus(state, 't', ['a', 'x']);
        assert.equals(10, one.bonusPct);
        assert.equals(1, one.mediatorIds.length);
        const two = oathMatchmakerBonus(state, 't', ['a', 'b']);
        assert.equals(10, two.bonusPct);
        const stacked = oathMatchmakerBonus(state, 't', ['a', 'b'], { oathMatchmakerBonusPct: 10, stackable: true });
        assert.equals(20, stacked.bonusPct);
        assert.equals(0, oathMatchmakerBonus(state, 't', ['x']).bonusPct);
        assert.equals(0, oathMatchmakerBonus(emptySwornState(), 't', ['a']).bonusPct);
        assert.equals(60, applyOathMatchmakerBonus(50, one));
        assert.equals(100, applyOathMatchmakerBonus(95, one));
    });

    suite.test('四語系皆有台詞鍵，且具名參數能填入、帶性別', () => {
        const keys = [
            'ui.bloodline.infant_anecdote.0', 'ui.bloodline.infant_anecdote.1', 'ui.bloodline.infant_anecdote.2', 'ui.bloodline.infant_anecdote.3',
            'ui.bloodline.infant_pat_reply.0', 'ui.bloodline.infant_pat_reply.1', 'ui.bloodline.infant_pat_reply.2',
            'ui.bloodline.gender.male', 'ui.bloodline.gender.female',
            'ui.bloodline.oath_gift.tag', 'ui.bloodline.oath_gift.stat',
            'ui.bloodline.oath_gift.title.male', 'ui.bloodline.oath_gift.title.female',
            'ui.bloodline.oath_gift.pronoun.male', 'ui.bloodline.oath_gift.pronoun.female',
            'ui.marriage.prenatal_countdown', 'ui.marriage.prenatal_blessing_done',
            'ui.marriage.gender.male', 'ui.marriage.gender.female',
            'ui.marriage.oath_matchmaker_bonus', 'ui.marriage.oath_role.male', 'ui.marriage.oath_role.female',
        ];
        for (const locale of LOCALES) {
            const d = dict(locale);
            for (const k of keys) assert.isTrue(typeof d[k] === 'string' && d[k].length > 0, `${locale} 缺少 ${k}`);
            const lookup = (k: string) => d[k];
            const all = [
                infantAnecdoteLine(lookup, 'c1', '小寶', '女', 3),
                oathGiftLine(lookup, { kind: 'stat', giverId: 'g', stage: 'birth', stat: 'int', bonus: 1 }, '女', '小寶'),
                oathGiftLine(lookup, { kind: 'tag', giverId: 'g', stage: 'birth' }, '男', '小寶'),
                prenatalCountdownLine(lookup, 2, '貂蟬', '女'),
                oathMatchmakerLine(lookup, { bonusPct: 10, mediatorIds: ['a'] }, '關羽', '男'),
            ];
            for (const line of all) assert.isTrue(!/\{[A-Za-z]+\}/.test(line) && line.length > 0, `${locale} 參數未填完：${line}`);
        }
        const zh = dict('zh-TW');
        const female = oathGiftLine((k) => zh[k], { kind: 'tag', giverId: 'g', stage: 'birth' }, '女', '小寶');
        const male = oathGiftLine((k) => zh[k], { kind: 'tag', giverId: 'g', stage: 'birth' }, '男', '小寶');
        assert.isTrue(female.includes('義母') && male.includes('義叔'));
    });

    suite.test('接線（PROG-2-10235）：funState 摸頭與祈福紀錄可存讀、壞資料不丟錯', () => {
        const s = normalizeFunState({ infantPats: { patSeason: 7, pats: { c1: 1, bad: 0 } }, prenatal: { m1: { uses: 1, rarityWeightDelta: 0.08 }, m2: { uses: 0 } } });
        assert.isFalse(isEmptyFunState(s));
        assert.equals(7, s.infantPats.patSeason);
        assert.equals(1, Object.keys(s.infantPats.pats).length);
        assert.equals(1, Object.keys(s.prenatal).length);
        const copy = cloneFunState(s);
        copy.prenatal.m1.uses = 9;
        assert.equals(1, s.prenatal.m1.uses);
        assert.isTrue(isEmptyFunState(normalizeFunState(emptyFunState())));
    });

    suite.test('接線（PROG-2-10235）：檢視模型只在有幼兒／待產時顯示，摸過與祈福過鎖鈕', () => {
        const zh = dict('zh-TW');
        const t = (k: string, ...a: string[]): string => (zh[k] ?? k).replace(/\{(\d)\}/g, (_m, i: string) => a[Number(i)] ?? '');
        const none = infantPrenatalView({ infant: null, childId: null, lastPat: null, prenatal: null, t });
        assert.isFalse(none.actives.btnInfantPat);
        assert.isFalse(none.actives.btnPrenatalBlessing);
        const infant = { season: 3, infants: [{ id: 'c1', name: '小寶', age: 2, gender: '男', patsLeft: 1, favor: 50 }] };
        const prenatal = { silver: 500, costSilver: 120, mothers: [{ id: 'm1', name: '貂蟬', gender: '女', remainingSeasons: 2, blessed: false }] };
        const v = infantPrenatalView({ infant, childId: 'c1', lastPat: null, prenatal, t });
        assert.isTrue(v.actives.btnInfantPat && v.enabled.btnInfantPat);
        assert.isTrue(v.texts.shrinePrenatalLine.includes('2'));
        assert.isTrue(v.texts.btnPrenatalBlessingLabel.includes('120'));
        const done = infantPrenatalView({ infant: { ...infant, infants: [{ ...infant.infants[0], patsLeft: 0 }] }, childId: 'c1', lastPat: null, prenatal: { ...prenatal, mothers: [{ ...prenatal.mothers[0], blessed: true }] }, t });
        assert.isFalse(done.enabled.btnInfantPat);
        assert.isFalse(done.enabled.btnPrenatalBlessing);
        const age5 = infantPrenatalView({ infant, childId: 'other', lastPat: null, prenatal: null, t });
        assert.isFalse(age5.actives.btnInfantPat);
    });

    suite.test('接線（PROG-2-10235）：新增 UI 文字鍵四語齊備', () => {
        for (const locale of LOCALES) {
            const d = dict(locale);
            for (const key of ['ui.bloodline.infant_pat_btn', 'ui.bloodline.infant_pat_done_btn', 'ui.bloodline.infant_pat_gain', 'ui.bloodline.infant_pat_limit', 'ui.marriage.prenatal_bless_btn', 'ui.marriage.prenatal_bless_done_btn', 'ui.marriage.prenatal_bless_silver_low']) {
                assert.isTrue(typeof d[key] === 'string' && d[key].length > 0, `${locale} 缺 ${key}`);
            }
        }
    });

    suite.test('接線（PROG-2-10235）：摸頭與 FUN-01 點頭像共用每季同一筆獎勵，兩入口各按一次、同季重載都只入帳一次', async () => {
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/fun-toddler-bark.json'), 'utf8')) as unknown;
        const pool = normalizeToddlerPool(raw);
        assert.isTrue(pool !== null);
        if (!pool) return;
        // 模擬獎勵框架：同 grantKey 只入帳一次，之後回 replayed（即使「重新載入」＝存檔還在、客戶端重建）
        const ledger = new Set<string>();
        let applied = 0;
        const api = {
            cmd: async (_name: string, args: { grantKey: string }) => {
                const replayed = ledger.has(args.grantKey);
                if (!replayed) { ledger.add(args.grantKey); applied += 1; }
                return { ok: true, result: { replayed, plan: replayed ? [] : [{ applied: { amount: 1 } }] } };
            },
        };
        const fakeApi = api as unknown as Parameters<typeof claimToddlerBond>[0];
        const a = await claimToddlerBond(fakeApi, pool, 'c1', 12); // 入口一：摸頭
        const b = await claimToddlerBond(fakeApi, pool, 'c1', 12); // 入口二：FUN-01 點頭像
        const reload = await claimToddlerBond(fakeApi, pool, 'c1', 12); // 同季重載後再按
        assert.isTrue(a.ok && !a.replayed && a.applied === 1);
        assert.isTrue(b.replayed && b.applied === 0);
        assert.isTrue(reload.replayed && reload.applied === 0);
        assert.equals(1, applied);
        assert.equals(toddlerGrantKey(pool, 'c1', 12), [...ledger][0]);
        // 換季或換孩子才是新的一筆
        await claimToddlerBond(fakeApi, pool, 'c1', 13);
        await claimToddlerBond(fakeApi, pool, 'c2', 12);
        assert.equals(3, applied);
    });

    return suite;
}
