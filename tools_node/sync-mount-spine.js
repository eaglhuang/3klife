#!/usr/bin/env node
'use strict';
/**
 * 同步 spine-trial 的騎乘遊戲包到本機 assets/resources（spine 目錄 gitignored，不進倉庫）。
 *
 * 來源是 spine-trial 的 export/game/：
 *   manifest.json     schema v2；packages 以「無副檔名的遊戲相對路徑」（spine/generals/<id>_mounted/<stem>）為鍵，
 *                     每筆含 files.skeleton／atlas／png_pages、md5、file_hashes（SHA-256）、aliases。
 *   mounted-list.json 騎乘對照表（generals[game_id][riding_tier]），同步到 assets/resources/data/mounted-list.json（進倉庫）。
 *
 * 用法：
 *   node tools_node/sync-mount-spine.js --from <spine-trial 檢出目錄> [--to <spine 目錄>] [--data-to <data 目錄>]
 *                                       [--scope generals|soldiers|all] [--legacy] [--backup <備份目錄>] [--dry-run]
 *
 *   --from     spine-trial 檢出目錄（例如 git worktree add <dir> origin/main --detach）。必填。
 *   --to       目標 spine 目錄，預設本工作樹的 assets/resources/spine。manifest 路徑的 spine/ 前綴對應到這裡。
 *   --data-to  mounted-list.json 的目標目錄，預設 assets/resources/data。
 *   --scope    要同步的包：generals（預設，spine/generals/*）、soldiers、all。
 *   --legacy   另外同步舊版 export/mount 的 fallback 包（趙雲 v2 舊路徑、紅騎兵、關羽）。預設不動。
 *   --backup   覆蓋前把內容不同的舊檔備份到此目錄，保留相對路徑。
 *   --dry-run  只驗證來源並列出會做的事，不寫檔。
 *
 * 流程：先驗證「所有」來源檔（存在、md5、SHA-256，同名目的檔不得內容不同）；任一失敗就列出差異、不寫任何檔、exit 1。
 * 驗證通過才複製，複製後再逐檔比對 md5。mounted-list 內每個 skeleton 都必須在 manifest 內有對應包。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** 舊版 fallback 包：來源（相對 spine-trial 根）→ 目標（相對 spine 根）。 */
const LEGACY_SETS = [
  { from: 'export/mount/zhao_v2/horse_bay', to: 'generals/zhao_yun_mounted/v2_horse_bay', label: '趙雲 v2 horse_bay（舊）' },
  { from: 'export/mount/zhao_v2/horse_sheet', to: 'generals/zhao_yun_mounted/v2_horse_sheet', label: '趙雲 v2 horse_sheet（舊）' },
  { from: 'export/mount/zhao_v2/horse_war', to: 'generals/zhao_yun_mounted/v2_horse_war', label: '趙雲 v2 horse_war（舊）' },
  { from: 'export/mount/guan_yu/horse_bay', to: 'generals/guan_yu_mounted', label: '關羽 horse_bay（export/game 尚無）' },
  { from: 'export/mount/soldier_cavalry_red/horse_bay', to: 'soldiers/soldier_cavalry_red', label: '紅方騎兵 horse_bay（舊）' },
];

function parseArgs(argv) {
  const out = { from: '', to: '', dataTo: '', scope: 'generals', legacy: false, backup: '', dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--from') out.from = argv[++i] || '';
    else if (a === '--to') out.to = argv[++i] || '';
    else if (a === '--data-to') out.dataTo = argv[++i] || '';
    else if (a === '--scope') out.scope = argv[++i] || '';
    else if (a === '--backup') out.backup = argv[++i] || '';
    else if (a === '--legacy') out.legacy = true;
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

const hashOf = (file, algo) => crypto.createHash(algo).update(fs.readFileSync(file)).digest('hex');

/**
 * 把 manifest 展開成要複製的檔案清單（含 aliases）。純函式，單元測試直接呼叫。
 * 回傳 { entries: [{ pkg, srcRel, dstRel, md5, sha256 }], errors: string[] }；
 * srcRel 相對 export/game，dstRel 相對 spine 根（去掉 spine/ 前綴）。
 */
function planManifest(manifest, scope) {
  const entries = [];
  const errors = [];
  const wantPrefix = scope === 'all' ? 'spine/' : `spine/${scope}/`;
  const add = (pkg, label) => {
    const dir = path.posix.dirname(pkg.game_path);
    const names = new Set([pkg.files.skeleton, pkg.files.atlas, ...(pkg.files.png_pages || [])]);
    for (const name of names) {
      const md5 = pkg.md5 && pkg.md5[name];
      const sha256 = pkg.file_hashes && pkg.file_hashes[name];
      if (!md5) errors.push(`[manifest] ${label} 缺 md5：${name}`);
      entries.push({ pkg: label, srcRel: `${dir}/${name}`, dstRel: `${dir.replace(/^spine\//, '')}/${name}`, md5, sha256 });
    }
  };
  for (const [key, pkg] of Object.entries(manifest.packages || {})) {
    if (!key.startsWith(wantPrefix)) continue;
    if (!pkg.game_path || !pkg.files || !pkg.files.skeleton || !pkg.files.atlas) {
      errors.push(`[manifest] ${key} 缺 game_path／files.skeleton／files.atlas`);
      continue;
    }
    add(pkg, key);
    for (const alias of pkg.aliases || []) {
      if (!alias.game_path || !alias.files) { errors.push(`[manifest] ${key} 的 alias 缺 game_path／files`); continue; }
      add(alias, `${alias.game_path}（${key} 的別名）`);
    }
  }
  return { entries, errors };
}

/** mounted-list 內每個 skeleton 必須對應 manifest 的某個包（含別名）。 */
function checkMountedList(list, manifest) {
  const known = new Set();
  for (const pkg of Object.values(manifest.packages || {})) {
    if (pkg.files && pkg.files.skeleton) known.add(`${path.posix.dirname(pkg.game_path)}/${pkg.files.skeleton}`);
    for (const alias of pkg.aliases || []) {
      if (alias.files && alias.files.skeleton) known.add(`${path.posix.dirname(alias.game_path)}/${alias.files.skeleton}`);
    }
  }
  const errors = [];
  for (const [gid, tiers] of Object.entries(list.generals || {})) {
    for (const [tier, leaf] of Object.entries(tiers)) {
      if (!leaf.skeleton || !known.has(leaf.skeleton)) errors.push(`[mounted-list] ${gid}/${tier} 的 skeleton 不在 manifest：${leaf.skeleton}`);
    }
  }
  return errors;
}

/** 驗證來源檔：存在、md5、SHA-256；同名目的檔來自不同內容視為衝突。回傳差異清單。 */
function verifySources(gameRoot, entries) {
  const errors = [];
  const dstMd5 = new Map();
  for (const e of entries) {
    const src = path.join(gameRoot, e.srcRel);
    if (!fs.existsSync(src)) { errors.push(`[缺檔] ${e.srcRel}（${e.pkg}）`); continue; }
    const m = hashOf(src, 'md5');
    if (e.md5 && m !== e.md5) errors.push(`[md5 不符] ${e.srcRel}：manifest ${e.md5}，實際 ${m}`);
    if (e.sha256) {
      const s = hashOf(src, 'sha256');
      if (s !== e.sha256) errors.push(`[sha256 不符] ${e.srcRel}：manifest ${e.sha256.slice(0, 12)}…，實際 ${s.slice(0, 12)}…`);
    }
    const prev = dstMd5.get(e.dstRel);
    if (prev && prev !== m) errors.push(`[目的檔衝突] ${e.dstRel} 有兩份不同內容的來源`);
    dstMd5.set(e.dstRel, m);
  }
  return errors;
}

function copyVerified(src, dst, backupRoot, backupRel) {
  if (fs.existsSync(dst)) {
    if (hashOf(dst, 'md5') === hashOf(src, 'md5')) return 'same';
    if (backupRoot) {
      const bak = path.join(backupRoot, backupRel);
      fs.mkdirSync(path.dirname(bak), { recursive: true });
      fs.copyFileSync(dst, bak);
    }
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return hashOf(dst, 'md5') === hashOf(src, 'md5') ? 'copied' : 'mismatch';
}

function syncLegacy(from, to, backup, dryRun, log) {
  let failures = 0;
  let copied = 0;
  for (const set of LEGACY_SETS) {
    const srcDir = path.join(from, set.from);
    if (!fs.existsSync(srcDir)) { log(`[略過] ${set.label}：來源不存在 ${set.from}`); continue; }
    const files = fs.readdirSync(srcDir, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name).sort();
    if (!(files.some(f => f.endsWith('.atlas')) && files.some(f => f.endsWith('.json')) && files.some(f => f.endsWith('.png')))) {
      log(`[略過] ${set.label}：來源不成套`);
      continue;
    }
    log(`[${dryRun ? '預覽' : '同步'}] ${set.label}  ${set.from} → ${set.to}（${files.length} 檔）`);
    if (dryRun) continue;
    for (const name of files) {
      const r = copyVerified(path.join(srcDir, name), path.join(to, set.to, name), backup, path.join(set.to, name));
      if (r === 'copied') copied += 1;
      if (r === 'mismatch') { log(`  [md5 不符] ${set.to}/${name}`); failures += 1; }
    }
  }
  return { failures, copied };
}

/** 主流程；回傳 { code, lines }，CLI 與單元測試共用。 */
function run(args) {
  const lines = [];
  const log = s => lines.push(s);
  if (!args.from) { log('缺少 --from <spine-trial 檢出目錄>'); return { code: 2, lines }; }
  if (!['generals', 'soldiers', 'all'].includes(args.scope)) { log(`--scope 只能是 generals／soldiers／all，收到 ${args.scope}`); return { code: 2, lines }; }
  const from = path.resolve(args.from);
  const to = path.resolve(args.to || path.join(__dirname, '..', 'assets', 'resources', 'spine'));
  const dataTo = path.resolve(args.dataTo || path.join(__dirname, '..', 'assets', 'resources', 'data'));
  const backup = args.backup ? path.resolve(args.backup) : '';
  const gameRoot = path.join(from, 'export', 'game');
  const manifestPath = path.join(gameRoot, 'manifest.json');
  const listPath = path.join(gameRoot, 'mounted-list.json');
  if (!fs.existsSync(manifestPath)) { log(`找不到 ${manifestPath}`); return { code: 1, lines }; }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schema_version !== 2) { log(`manifest schema_version=${manifest.schema_version}，工具只認 2`); return { code: 1, lines }; }
  const plan = planManifest(manifest, args.scope);
  const errors = [...plan.errors, ...verifySources(gameRoot, plan.entries)];
  let list = null;
  if (fs.existsSync(listPath)) {
    list = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    errors.push(...checkMountedList(list, manifest));
  } else {
    errors.push('[缺檔] export/game/mounted-list.json');
  }
  if (errors.length > 0) {
    log(`驗證失敗：${errors.length} 項差異，未寫入任何檔。`);
    errors.forEach(e => log(`  ${e}`));
    return { code: 1, lines };
  }
  log(`驗證通過：${plan.entries.length} 檔（scope=${args.scope}，spine ${manifest.spine_version}）。`);
  let failures = 0;
  let copied = 0;
  if (args.dryRun) {
    plan.entries.forEach(e => log(`[預覽] ${e.srcRel} → ${e.dstRel}`));
  } else {
    for (const e of plan.entries) {
      const r = copyVerified(path.join(gameRoot, e.srcRel), path.join(to, e.dstRel), backup, e.dstRel);
      if (r === 'copied') copied += 1;
      if (r === 'mismatch') { log(`  [md5 不符] ${e.dstRel}`); failures += 1; }
    }
    // mounted-list 進倉庫（非 gitignored）：逐字複製，.meta 由編輯器匯入時產生或隨 PR 提交
    const r = copyVerified(listPath, path.join(dataTo, 'mounted-list.json'), backup, 'data/mounted-list.json');
    if (r === 'copied') copied += 1;
    if (r === 'mismatch') { log('  [md5 不符] data/mounted-list.json'); failures += 1; }
  }
  if (args.legacy) {
    const l = syncLegacy(from, to, backup, args.dryRun, log);
    failures += l.failures;
    copied += l.copied;
  }
  if (!args.dryRun) log(`完成：新寫入 ${copied} 檔，md5 不符 ${failures} 檔。`);
  return { code: failures > 0 ? 1 : 0, lines };
}

if (require.main === module) {
  const result = run(parseArgs(process.argv.slice(2)));
  result.lines.forEach(l => console.log(l));
  process.exit(result.code);
}

module.exports = { run, parseArgs, planManifest, verifySources, checkMountedList, LEGACY_SETS };
