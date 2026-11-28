#!/usr/bin/env node
/**
 * apply-general-skill-templates.js（PROG-2-10246）
 *
 * 依 general-skill-templates.json（模板）與 general-skill-overrides.json（覆寫），
 * 用 core/systems/GeneralSkillTemplates.ts 的純函式解析每位武將的天生戰法／奧義，
 * 並把結果寫回 master/generals-base.json 與 runtime generals.json（兩處同步，重建 runtime 不會被洗掉）。
 * 同時補齊戰法庫（tactic-tpl-*）與奧義定義（ult-tpl-*）——只引用既有招式 profile，不新造數值。
 *
 * 用法：
 *   node tools_node/apply-general-skill-templates.js --dry-run          # 只看差異與分佈，不寫檔
 *   node tools_node/apply-general-skill-templates.js                    # 寫檔（可重跑，結果相同）
 *   node tools_node/apply-general-skill-templates.js --report <path>    # 另存持有分佈表（md）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'tests', 'register-cc-test-stub.js'));
require(path.join(ROOT, 'tests', 'register-tsconfig-test-paths.js'));
// eslint-disable-next-line import/no-extraneous-dependencies
require('ts-node').register({ transpileOnly: true, project: path.join(ROOT, 'tsconfig.test.json') });

const resolver = require(path.join(ROOT, 'assets', 'scripts', 'core', 'systems', 'GeneralSkillTemplates.ts'));
const { listBattleSkillProfiles } = require(path.join(ROOT, 'assets', 'scripts', 'battle', 'skills', 'BattleSkillProfiles.ts'));

const DATA = path.join(ROOT, 'assets', 'resources', 'data');
const MASTER = path.join(DATA, 'master');
const P = {
  base: path.join(MASTER, 'generals-base.json'),
  runtime: path.join(DATA, 'generals.json'),
  library: path.join(MASTER, 'tactic-library.json'),
  ultimates: path.join(MASTER, 'ultimate-definitions.json'),
  templates: path.join(MASTER, 'general-skill-templates.json'),
  overrides: path.join(MASTER, 'general-skill-overrides.json'),
  zhTW: path.join(ROOT, 'assets', 'resources', 'i18n', 'zh-TW.json'),
};

const DRY = process.argv.includes('--dry-run');
const reportIdx = process.argv.indexOf('--report');
const REPORT = reportIdx >= 0 ? process.argv[reportIdx + 1] : null;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v, trailingNewline) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + (trailingNewline ? '\n' : ''), 'utf8');

const profiles = new Map(listBattleSkillProfiles().map((p) => [p.battleSkillId, p]));
const castable = (id) => { const p = profiles.get(id); return !!p && !p.pendingEffect; };
const zhTW = readJson(P.zhTW);
const skillName = (id) => zhTW[`battle.skill_name.${id}`] || id;

const templates = readJson(P.templates);
const overrides = readJson(P.overrides);
const library = readJson(P.library);
const ultDefs = readJson(P.ultimates);
const base = readJson(P.base);
const runtime = readJson(P.runtime);

// ---------- 戰法庫：每個要用的招式都要有一筆「無條件」的戰法定義 ----------
const unconstrained = (t) => !(t.tcond && t.tcond.length) && !(t.aptitudeRules && t.aptitudeRules.length);
const CATEGORY_BY_KIND = {
  heal: 'support', morale: 'support', vitality: 'support', 'tile-buff': 'support', reset: 'support', counter: 'support', revive: 'support',
  control: 'control', slow: 'control', root: 'control', discord: 'control', 'control-override': 'control', link: 'scheme',
  dot: 'scheme', 'push-fire': 'scheme', push: 'duel', damage: 'duel', 'extra-attack': 'duel',
};

function tacticIdOfSkill(skillId) {
  const found = library.data.find((t) => t.battleSkillId === skillId && unconstrained(t));
  if (found) return found.id;
  const id = `tactic-tpl-${skillId}`;
  if (!library.data.some((t) => t.id === id)) {
    const p = profiles.get(skillId);
    const entry = {
      id,
      displayName: skillName(skillId),
      category: CATEGORY_BY_KIND[p.effectKind] || (p.tags && p.tags.includes('fire') ? 'scheme' : 'duel'),
      rarityAccess: [],
      preferredStats: [p.scalingStat || 'str'],
      aptitudeRules: [],
      sourceGeneIds: [],
      battleSkillId: skillId,
      sourceType: 'seed-tactic',
      targetMode: p.targetMode,
      timing: 'active-cast',
      manualTargeting: false,
    };
    if (p.autoAimMode) entry.autoAimMode = p.autoAimMode;
    library.data.push(entry);
  }
  return id;
}

// ---------- 奧義定義：每個奧義招式一筆共用定義 ult-tpl-<skillId> ----------
const GENE_BY_STAT = { str: 'gene_bravery', int: 'gene_strategy', cha: 'gene_honor', lea: 'gene_command', pol: 'gene_politics', luk: 'gene_luck' };

function familyOf(p) {
  if (p.effectKind === 'control-override') return 'control-override';
  if (p.effectKind === 'heal' && p.targetMode === 'ally-all') return 'team-heal';
  if (p.targetMode === 'ally-all' || p.targetMode === 'ally-single') return 'team-buff';
  if (p.effectKind === 'revive' || p.targetMode === 'self' || p.targetMode === 'around-self') return 'self-burst';
  if (p.targetMode === 'enemy-all') return 'enemy-mass-debuff';
  if (p.targetMode === 'enemy-single') return 'single-execute';
  return 'area-burst';
}

function ultimateIdOfSkill(skillId) {
  const id = `ult-tpl-${skillId}`;
  if (!ultDefs.data.some((u) => u.id === id)) {
    const p = profiles.get(skillId);
    const stat = p.scalingStat || 'str';
    const entry = {
      id,
      templateId: `TPL_${skillId.toUpperCase().replace(/-/g, '_')}`,
      slot: 1,
      name: `${skillName(skillId)}·極意`,
      description: `把「${skillName(skillId)}」練到極致：精力蓄滿時施放，效果沿用該招式。`,
      unlockReincarnation: 1,
      vitalityCostPct: 0.05,
      scalingStat: stat,
      exclusive: false,
      inheritanceGeneId: GENE_BY_STAT[stat] || 'gene_courage',
      battleSkillId: skillId,
      sourceType: 'ultimate',
      targetMode: p.targetMode,
      timing: 'active-cast',
      manualTargeting: false,
    };
    if (p.autoAimMode) entry.autoAimMode = p.autoAimMode;
    entry.family = familyOf(p);
    ultDefs.data.push(entry);
  }
  return id;
}

// ---------- 解析 ----------
const ultSkillById = new Map(ultDefs.data.map((u) => [u.id, u.battleSkillId]));
const tacticSkillById = new Map(library.data.map((t) => [t.id, t.battleSkillId]));
const ctx = {
  existingUltimateSkillOf: (id) => ultSkillById.get(id) || null,
  existingTacticSkillOf: (id) => tacticSkillById.get(id) || null,
  isCastableSkill: castable,
};
const result = resolver.resolveAllGeneralSkills(base.data, templates, overrides, ctx);

// ---------- 寫回 ----------
let changedBase = 0;
const runtimeById = new Map(runtime.map((g) => [g.id, g]));
for (const g of base.data) {
  const r = result.get(g.id);
  const tacticSlots = r.tacticSkills.map((skill, i) => ({ slotId: `slot-${i + 1}`, tacticId: tacticIdOfSkill(skill), source: 'inborn' }));
  const sameTactics = JSON.stringify(g.tacticSlots) === JSON.stringify(tacticSlots);
  if (!sameTactics) { g.tacticSlots = tacticSlots; changedBase++; }
  if (r.ultimateSkill && !r.keepsExistingUltimate) {
    g.ultimateSlots = [{ slot: 1, ultimateId: ultimateIdOfSkill(r.ultimateSkill), unlockReincarnation: 1, vitalityCostPct: 0.05, isExclusive: false }];
  }
  const rt = runtimeById.get(g.id);
  if (rt) { rt.tacticSlots = g.tacticSlots; rt.ultimateSlots = g.ultimateSlots; }
}

// ---------- 持有分佈 ----------
const total = base.data.length;
const tacticRows = resolver.holdDistribution(base.data.map((g) => g.tacticSlots.map((s) => tacticSkillById.get(s.tacticId) || library.data.find((t) => t.id === s.tacticId)?.battleSkillId || s.tacticId)), total);
const ultSkillOf = (id) => (ultDefs.data.find((u) => u.id === id) || {}).battleSkillId || id;
const ultRows = resolver.holdDistribution(base.data.map((g) => g.ultimateSlots.slice(0, 1).map((s) => ultSkillOf(s.ultimateId))), total);
const cap = resolver.skillHoldCap(total, templates.capRatio);
const bad = [...resolver.holdCapViolations(tacticRows, total, templates.capRatio), ...resolver.holdCapViolations(ultRows, total, templates.capRatio)];
const withUlt = base.data.filter((g) => g.ultimateSlots.length > 0).length;
const lessThanTwo = base.data.filter((g) => new Set(g.tacticSlots.map((s) => s.tacticId)).size < 2).length;

const pct = (n) => `${(n / total * 100).toFixed(1)}%`;
const lines = [];
lines.push('# 武將戰法／奧義持有分佈（PROG-2-10246）', '');
lines.push(`武將總數 ${total}；每種戰法／奧義持有上限 ${cap} 人（${templates.capRatio * 100}%）；有奧義 ${withUlt} 人；戰法不足 2 個者 ${lessThanTwo} 人。`, '');
lines.push('## 戰法（battleSkillId）', '', '| 招式 | 招式名 | 持有人數 | 占比 |', '|---|---|---:|---:|');
for (const r of tacticRows) lines.push(`| ${r.skillId} | ${skillName(r.skillId)} | ${r.holders} | ${pct(r.holders)} |`);
lines.push('', '## 奧義（依招式；含原有 18 位專屬奧義，專屬奧義的 battleSkillId 若與共用奧義相同會合併計）', '', '| 招式 | 招式名 | 持有人數 | 占比 |', '|---|---|---:|---:|');
for (const r of ultRows) lines.push(`| ${r.skillId} | ${skillName(r.skillId)} | ${r.holders} | ${pct(r.holders)} |`);
const tplCount = {};
for (const r of result.values()) tplCount[r.templateId] = (tplCount[r.templateId] || 0) + 1;
lines.push('', '## 模板命中', '', '| 模板 | 名稱 | 人數 |', '|---|---|---:|');
for (const t of templates.templates) lines.push(`| ${t.templateId} | ${t.name} | ${tplCount[t.templateId] || 0} |`);
lines.push('', `超過上限：${bad.length === 0 ? '無' : bad.map((b) => `${b.skillId}=${b.holders}`).join('、')}`);
const report = lines.join('\n') + '\n';

console.log(`[apply-general-skill-templates] 武將 ${total}，戰法變動 ${changedBase} 位，有奧義 ${withUlt} 位，戰法不足 2 個 ${lessThanTwo} 位`);
console.log(`[apply-general-skill-templates] 單招最高持有 戰法 ${tacticRows[0].skillId}=${tacticRows[0].holders}、奧義 ${ultRows[0] ? `${ultRows[0].skillId}=${ultRows[0].holders}` : '-'}（上限 ${cap}）`);
if (bad.length > 0) { console.error(`[apply-general-skill-templates] 超過上限：${bad.map((b) => `${b.skillId}=${b.holders}`).join('、')}`); process.exit(1); }
if (lessThanTwo > 0) { console.error('[apply-general-skill-templates] 有武將戰法不足 2 個'); process.exit(1); }

if (REPORT) fs.writeFileSync(REPORT, report, 'utf8');
if (DRY) { console.log('[apply-general-skill-templates] dry-run，不寫檔'); process.exit(0); }
writeJson(P.base, base, false);
writeJson(P.runtime, runtime, false);
writeJson(P.library, library, true);
writeJson(P.ultimates, ultDefs, true);
console.log('[apply-general-skill-templates] 已寫回 generals-base / generals / tactic-library / ultimate-definitions');
