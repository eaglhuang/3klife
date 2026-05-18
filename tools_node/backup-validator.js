#!/usr/bin/env node
'use strict';

/**
 * backup-validator.js — TASK-DGB-0010
 *
 * 白話：升級 governance profile 前，你應該先備份現有的 profile 和相關檔案。
 * 這個工具做兩件事：
 *   (A) create-backup: 把指定的 profile + 相關檔案快照到備份目錄，
 *       同時產生一份 backup-manifest.json 記錄備份內容和 SHA256 checksum
 *   (B) verify-backup: 讀備份目錄的 backup-manifest.json，
 *       逐一校驗 checksum，確認備份可以完整復原
 *   (C) list-backups: 列出所有備份版本
 *
 * 使用方式：
 *   node tools_node/backup-validator.js create-backup --profile .atm/compatibility-matrix.json [--backup-dir .atm/backups]
 *   node tools_node/backup-validator.js verify-backup --backup-dir .atm/backups/backup-20260518T103000
 *   node tools_node/backup-validator.js list-backups [--backup-dir .atm/backups]
 *
 * Exit codes: 0 = success / 1 = error / 2 = verification failed (for verify-backup)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./lib/project-config');

const ROOT = config.ROOT;
const DEFAULT_BACKUP_DIR = path.join(ROOT, '.atm', 'backups');

// 備份時一起快照的關聯檔案（相對 ROOT）
const GOVERNANCE_FILES_TO_BACKUP = [
  '.atm/compatibility-matrix.json',
  '.atm/config.json',
  '.atm/context-budget-policy.json',
  '.atm/encoding-guard-profile.json',
  '.atm/schema/governance-profile.schema.json',
  '.atm/schema/document-id.schema.json',
  '.atm/schema/shard-config.schema.json',
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function makeBackupId() {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:]/g, '').replace('T', 'T').split('.')[0];
  return `backup-${ts}`;
}

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

// ─── create-backup ────────────────────────────────────────────────────────────

function createBackup(profilePath, backupBaseDir) {
  const backupId = makeBackupId();
  const backupDir = path.join(backupBaseDir, backupId);
  fs.mkdirSync(backupDir, { recursive: true });

  const manifest = {
    schemaVersion: 'backup-manifest/v1',
    backupId,
    createdAt: nowIso(),
    sourceProfilePath: toPosix(path.relative(ROOT, path.isAbsolute(profilePath) ? profilePath : path.join(ROOT, profilePath))),
    files: [],
  };

  // 收集要備份的檔案（主 profile + 關聯檔案）
  const profileAbs = path.isAbsolute(profilePath) ? profilePath : path.join(ROOT, profilePath);
  const profileRel = toPosix(path.relative(ROOT, profileAbs));
  const filesToBackup = new Set([profileRel, ...GOVERNANCE_FILES_TO_BACKUP]);

  for (const relPath of filesToBackup) {
    const srcAbs = path.join(ROOT, relPath);
    if (!fs.existsSync(srcAbs)) continue;

    const content = fs.readFileSync(srcAbs);
    const checksum = sha256(content);

    // 維持子目錄結構
    const destAbs = path.join(backupDir, relPath);
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.writeFileSync(destAbs, content);

    manifest.files.push({
      path: relPath,
      checksum,
      size: content.length,
    });
  }

  // 嘗試讀取 profile 版本資訊
  try {
    const profile = JSON.parse(fs.readFileSync(profileAbs, 'utf8'));
    manifest.profileVersion = profile.profileVersion || null;
    manifest.profileId = profile.profileId || null;
  } catch { /* non-fatal */ }

  const manifestPath = path.join(backupDir, 'backup-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  return { backupId, backupDir, manifest };
}

// ─── verify-backup ────────────────────────────────────────────────────────────

function verifyBackup(backupDir) {
  const manifestPath = path.join(backupDir, 'backup-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      valid: false,
      errors: [`backup-manifest.json not found in ${backupDir}`],
      checked: 0,
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    return { valid: false, errors: [`Failed to parse backup-manifest.json: ${err.message}`], checked: 0 };
  }

  const errors = [];
  let checked = 0;

  for (const entry of (manifest.files || [])) {
    const fileAbs = path.join(backupDir, entry.path);
    if (!fs.existsSync(fileAbs)) {
      errors.push(`Missing backup file: ${entry.path}`);
      continue;
    }
    const content = fs.readFileSync(fileAbs);
    const actual = sha256(content);
    if (actual !== entry.checksum) {
      errors.push(`Checksum mismatch for ${entry.path}: expected ${entry.checksum}, got ${actual}`);
    }
    checked += 1;
  }

  return { valid: errors.length === 0, errors, checked, manifest };
}

// ─── list-backups ─────────────────────────────────────────────────────────────

function listBackups(backupBaseDir) {
  if (!fs.existsSync(backupBaseDir)) return [];
  const entries = fs.readdirSync(backupBaseDir)
    .filter((name) => {
      const full = path.join(backupBaseDir, name);
      return fs.statSync(full).isDirectory() && name.startsWith('backup-');
    })
    .map((name) => {
      const manifestPath = path.join(backupBaseDir, name, 'backup-manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          return {
            backupId: name,
            profileVersion: m.profileVersion || '(unknown)',
            profileId: m.profileId || '(unknown)',
            createdAt: m.createdAt || '(unknown)',
            fileCount: (m.files || []).length,
          };
        } catch { /* fall through */ }
      }
      return { backupId: name, profileVersion: '(unreadable)', createdAt: '(unknown)', fileCount: 0 };
    });

  entries.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return entries;
}

// ─── output ───────────────────────────────────────────────────────────────────

function printBackupResult(result) {
  console.log('\nBackup created:');
  console.log(`  ID          : ${result.backupId}`);
  console.log(`  Directory   : ${toPosix(path.relative(ROOT, result.backupDir))}`);
  console.log(`  Files saved : ${result.manifest.files.length}`);
  if (result.manifest.profileVersion) {
    console.log(`  Profile ver : ${result.manifest.profileVersion}`);
  }
  console.log(`\n✅ Backup complete. Verify with:`);
  console.log(`   node tools_node/backup-validator.js verify-backup --backup-dir ${toPosix(path.relative(ROOT, result.backupDir))}`);
}

function printVerifyResult(result, backupDirRel) {
  console.log('\nBackup Verification');
  console.log('─'.repeat(50));
  console.log(`Backup  : ${backupDirRel}`);
  console.log(`Checked : ${result.checked} file(s)`);
  if (result.manifest) {
    console.log(`Created : ${result.manifest.createdAt}`);
    if (result.manifest.profileVersion) console.log(`Profile : v${result.manifest.profileVersion}`);
  }
  console.log('');

  if (result.valid) {
    console.log('✅ Backup is intact and all checksums pass.');
  } else {
    console.log('🚫 Backup verification FAILED:');
    for (const e of result.errors) console.log(`   - ${e}`);
  }
}

// ─── args ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const parsed = {
    command: '',  // create-backup / verify-backup / list-backups
    profile: path.join(ROOT, '.atm', 'compatibility-matrix.json'),
    backupDir: DEFAULT_BACKUP_DIR,
    json: false,
    help: false,
  };

  // first non-flag argument is the command
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--profile') { parsed.profile = argv[i + 1] || ''; i += 1; }
    else if (tok === '--backup-dir') { parsed.backupDir = path.resolve(argv[i + 1] || DEFAULT_BACKUP_DIR); i += 1; }
    else if (tok === '--json') { parsed.json = true; }
    else if (tok === '--help' || tok === '-h') { parsed.help = true; }
    else if (!tok.startsWith('-') && !parsed.command) { parsed.command = tok; }
  }

  return parsed;
}

// ─── main ─────────────────────────────────────────────────────────────────────

function run(argv) {
  const args = parseArgs(argv);

  if (args.help || !args.command) {
    console.log('Usage: node tools_node/backup-validator.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  create-backup    Snapshot current governance files to a backup directory');
    console.log('  verify-backup    Verify backup integrity via checksums');
    console.log('  list-backups     List all available backups');
    console.log('');
    console.log('Options:');
    console.log('  --profile <path>       Profile JSON to backup (default: .atm/compatibility-matrix.json)');
    console.log('  --backup-dir <path>    Base backup directory (default: .atm/backups)');
    console.log('  --json                 Output machine-readable JSON');
    console.log('  --help, -h             Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  # Create a backup before upgrading');
    console.log('  node tools_node/backup-validator.js create-backup');
    console.log('');
    console.log('  # Verify a specific backup');
    console.log('  node tools_node/backup-validator.js verify-backup --backup-dir .atm/backups/backup-20260518T103000');
    console.log('');
    console.log('  # List all backups');
    console.log('  node tools_node/backup-validator.js list-backups');
    return 0;
  }

  if (args.command === 'create-backup') {
    let result;
    try {
      result = createBackup(args.profile, args.backupDir);
    } catch (err) {
      console.error(`Error creating backup: ${err.message}`);
      return 1;
    }
    if (args.json) {
      console.log(JSON.stringify({
        success: true,
        backupId: result.backupId,
        backupDir: toPosix(path.relative(ROOT, result.backupDir)),
        fileCount: result.manifest.files.length,
      }, null, 2));
    } else {
      printBackupResult(result);
    }
    return 0;
  }

  if (args.command === 'verify-backup') {
    const result = verifyBackup(args.backupDir);
    const rel = toPosix(path.relative(ROOT, args.backupDir));
    if (args.json) {
      console.log(JSON.stringify({ ...result, backupDir: rel }, null, 2));
    } else {
      printVerifyResult(result, rel);
    }
    return result.valid ? 0 : 2;
  }

  if (args.command === 'list-backups') {
    const backups = listBackups(args.backupDir);
    if (args.json) {
      console.log(JSON.stringify(backups, null, 2));
    } else {
      console.log('\nAvailable Backups');
      console.log('─'.repeat(50));
      if (backups.length === 0) {
        console.log('(no backups found)');
      } else {
        for (const b of backups) {
          console.log(`${b.backupId}  v${b.profileVersion}  ${b.createdAt}  ${b.fileCount} files`);
        }
      }
    }
    return 0;
  }

  console.error(`Unknown command: "${args.command}". Use --help for usage.`);
  return 1;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, createBackup, verifyBackup, listBackups };
