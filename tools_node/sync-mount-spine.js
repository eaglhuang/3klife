#!/usr/bin/env node
'use strict';
/**
 * 同步 spine-trial 騎馬素材到本機 assets/resources/spine（gitignored，不進倉庫）。
 *
 * 用法：
 *   node tools_node/sync-mount-spine.js --from <spine-trial 檢出目錄> [--to <spine 目錄>] [--backup <備份目錄>] [--dry-run]
 *
 *   --from     spine-trial 的檢出目錄（例如 git worktree add <dir> origin/main --detach 得到的目錄）。必填。
 *   --to       目標 spine 目錄，預設為本工作樹的 assets/resources/spine。
 *   --backup   覆蓋前把舊檔（內容不同者）備份到此目錄，保留相對路徑。預設不備份。
 *   --dry-run  只列出會做的事，不寫檔。
 *
 * 來源提交：spine-trial origin/main b752c6c（見卡 PROG-2-9957 notes）。
 * 只複製下列「騎馬成套」目錄的檔案；缺少 atlas／png 的組合會被略過並列出，不會半套複製。
 * 完成後逐檔比對 md5，任一不符即 exit 1。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** 來源目錄（相對 spine-trial 根）→ 目標目錄（相對 spine 根）。 */
const MOUNT_SETS = [
  // 趙雲 v2 騎馬：horse_bay（騎術 1 級外觀換用 v2 骨架時使用）、horse_sheet（精騎）、horse_war（神駒）
  { from: 'export/mount/zhao_v2/horse_bay', to: 'generals/zhao_yun_mounted/v2_horse_bay', label: '趙雲 v2 horse_bay' },
  { from: 'export/mount/zhao_v2/horse_sheet', to: 'generals/zhao_yun_mounted/v2_horse_sheet', label: '趙雲 v2 horse_sheet' },
  { from: 'export/mount/zhao_v2/horse_war', to: 'generals/zhao_yun_mounted/v2_horse_war', label: '趙雲 v2 horse_war' },
  // 紅方騎兵騎馬（spine-trial PR #11，b752c6c）：獨立資料夾，避免與藍騎兵同名的 mount_horse_bay_N.png 互相覆蓋
  { from: 'export/mount/soldier_cavalry_red/horse_bay', to: 'soldiers/soldier_cavalry_red', label: '紅方騎兵 horse_bay' },
];

function parseArgs(argv) {
  const out = { from: '', to: '', backup: '', dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--from') out.from = argv[++i] || '';
    else if (a === '--to') out.to = argv[++i] || '';
    else if (a === '--backup') out.backup = argv[++i] || '';
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name).sort();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.from) {
    console.error('缺少 --from <spine-trial 檢出目錄>');
    process.exit(2);
  }
  const from = path.resolve(args.from);
  const to = path.resolve(args.to || path.join(__dirname, '..', 'assets', 'resources', 'spine'));
  const backup = args.backup ? path.resolve(args.backup) : '';
  let failures = 0;
  let copied = 0;
  for (const set of MOUNT_SETS) {
    const srcDir = path.join(from, set.from);
    const dstDir = path.join(to, set.to);
    if (!fs.existsSync(srcDir)) {
      console.log(`[略過] ${set.label}：來源不存在 ${set.from}`);
      continue;
    }
    const files = listFiles(srcDir);
    const hasAtlas = files.some(f => f.endsWith('.atlas'));
    const hasJson = files.some(f => f.endsWith('.json'));
    const hasPng = files.some(f => f.endsWith('.png'));
    if (!(hasAtlas && hasJson && hasPng)) {
      console.log(`[略過] ${set.label}：來源不成套（atlas=${hasAtlas} json=${hasJson} png=${hasPng}）`);
      continue;
    }
    console.log(`[${args.dryRun ? '預覽' : '同步'}] ${set.label}  ${set.from} → ${set.to}（${files.length} 檔）`);
    if (!args.dryRun) fs.mkdirSync(dstDir, { recursive: true });
    for (const name of files) {
      const src = path.join(srcDir, name);
      const dst = path.join(dstDir, name);
      const srcHash = md5(src);
      if (args.dryRun) continue;
      if (fs.existsSync(dst)) {
        if (md5(dst) === srcHash) continue;
        if (backup) {
          const bak = path.join(backup, set.to, name);
          fs.mkdirSync(path.dirname(bak), { recursive: true });
          fs.copyFileSync(dst, bak);
        }
      }
      fs.copyFileSync(src, dst);
      copied += 1;
      if (md5(dst) !== srcHash) {
        console.log(`  [md5 不符] ${set.to}/${name}`);
        failures += 1;
      }
    }
  }
  if (!args.dryRun) {
    console.log(`完成：新寫入 ${copied} 檔，md5 不符 ${failures} 檔。`);
  }
  process.exit(failures > 0 ? 1 : 0);
}

main();
