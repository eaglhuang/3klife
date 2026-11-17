// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；戰鬥日誌傷害來源說明（PROG-2-9375）

/**
 * 戰鬥日誌裡「受到 N 傷害（…）」括號內的說明文字。
 *
 * 傷害來源在程式裡是內部代號（troop-counter、tally-splash…），直接印出來玩家看不懂。
 * 這裡把認得的代號換成中文；不認得的一律不顯示，避免再把代號漏給玩家。
 */
const EXACT_LABELS: Readonly<Record<string, string>> = {
  'night-raid-opening-strike': '夜襲先制',
  'troop-counter': '拒馬反擊',
  'tally-splash': '虎符濺射',
  'tally-guard': '虎符護衛代擋',
  'naval-combined-attack': '水軍合擊',
  'kin-combo-attack': '血親合擊',
  'mass-debuff-dot': '持續傷害',
  'poison': '中毒',
  'hazard-fire': '火焰',
  'hazard-rock': '落石',
  'river-current': '水流',
};

const PREFIX_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['river-current:', '水流'],
  ['linked-share:', '傷害分攤'],
  ['counter:', '反擊'],
];

/** 回傳括號內要顯示的中文；沒有對應說明時回傳空字串。 */
export function battleDamageSourceLabel(damageSource?: string | null): string {
  if (!damageSource) return '';
  const exact = EXACT_LABELS[damageSource];
  if (exact) return exact;
  for (const [prefix, label] of PREFIX_LABELS) {
    if (damageSource.startsWith(prefix)) return label;
  }
  return '';
}

/** 戰鬥日誌最後一行「戰鬥結束：…」的結果說明（PROG-2-9379）；不認得的代號只寫「戰鬥結束」。 */
export function battleEndLogLine(result?: string | null): string {
  if (result === 'player-win') return '戰鬥結束：我方獲勝';
  if (result === 'enemy-win') return '戰鬥結束：敵方獲勝';
  if (result === 'draw') return '戰鬥結束：平手';
  return '戰鬥結束';
}
