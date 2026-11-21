// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §12.4 機率公開；學府支援卡與教官池規格書 (doc_spec_1264) §23 TC-SUP-14；SUP-10（PROG-2-9243）
/**
 * GachaRateTable — 轉蛋「機率說明」的完整機率表（純函式，不依賴 cc）。
 *
 * 數字全部來自 reward.pools 的視圖（與抽樣同一份資料），這裡只把視圖排成幾列文字；
 * 畫面不寫任何機率常數。卡名由呼叫端傳入的 nameOf 解析（武將名冊、支援卡表各自提供）。
 */
import type { RewardPoolEntryView, RewardPoolView } from '../../shared/api/ApiCommands';

/** 稀有度由高到低；不在表內的等階排最後 */
const TIER_ORDER: readonly string[] = ['SSR', 'SR', 'R'];

export interface GachaRateRow { title: string; detail: string }

/** 機率以百分比顯示：整數、一位、兩位、三位小數都不補多餘的 0（例：3%、1.5%、0.25%、0.756%） */
export function formatRatePercent(rate: number): string {
    const pct = Math.round(rate * 100000) / 1000;
    return `${pct}%`;
}

function entryText(e: RewardPoolEntryView, nameOf: (nameKey: string | null, entryId: string) => string): string {
    return `${nameOf(e.nameKey, e.entryId)} ${formatRatePercent(e.rate)}`;
}

/** 完整機率表：每個稀有度一列（含 UP 與一般的逐張機率），再加保底與版本列 */
export function buildRateTableRows(view: RewardPoolView, nameOf: (nameKey: string | null, entryId: string) => string): GachaRateRow[] {
    const rows: GachaRateRow[] = [];
    const rank = (t: string): number => { const i = TIER_ORDER.indexOf(t); return i < 0 ? TIER_ORDER.length : i; };
    const ordered = [...view.tiers].sort((a, b) => rank(a.tier) - rank(b.tier));
    for (const tier of ordered) {
        const title = `${tier.tier} 共 ${formatRatePercent(tier.baseRate)}`;
        if (!view.public) { rows.push({ title, detail: '本池未公開逐張機率' }); continue; }
        const up = tier.entries.filter((e) => e.isUp);
        const normal = tier.entries.filter((e) => !e.isUp);
        const parts: string[] = [];
        if (up.length > 0) parts.push(`UP（${up.length} 張）：${up.map((e) => entryText(e, nameOf)).join('、')}`);
        if (normal.length > 0) parts.push(`${up.length > 0 ? '一般' : '全部'}（${normal.length} 張）：${normal.map((e) => entryText(e, nameOf)).join('、')}`);
        rows.push({ title, detail: parts.join('\n') });
    }
    for (const p of view.pities) {
        const soft = p.softStartAt !== null ? `第 ${p.softStartAt} 抽起機率漸升，` : '';
        rows.push({ title: `${p.tier === 'SSR' ? 'SSR' : `${p.tier} 以上`} 保底`, detail: `${soft}第 ${p.hardAt} 抽必出（目前 ${p.counter} 抽，下一抽 ${formatRatePercent(p.nextPullRate)}）` });
    }
    if (view.disclosureVersion) rows.push({ title: '公開版本', detail: `${view.disclosureVersion}（機率與抽獎共用同一份資料）` });
    return rows;
}
