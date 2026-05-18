'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { loadEncodingProfile, validateEncodingProfile } = require('../../encoding-profile-loader');

class EncodingAdapter {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot
      ? path.resolve(options.projectRoot)
      : path.resolve(__dirname, '..', '..', '..');
    this.configPath = options.configPath
      ? path.resolve(options.configPath)
      : path.join(this.projectRoot, '.atm', 'encoding-guard-profile.json');
    this.profile = this.loadConfig();
    this.config = this.profile.policy;
    this.allowedExtensions = new Set(this.config.allowedExtensions || []);
    this.highRiskEntries = this.config.highRiskFiles || {};
    this.ignoredTrackedPrefixes = ['@cocos/creator-types/'];
  }

  loadConfig() {
    const profile = loadEncodingProfile({
      projectRoot: this.projectRoot,
      profilePath: this.configPath,
    });
    const validation = validateEncodingProfile(profile);
    if (!validation.ok) {
      throw new Error(`Invalid encoding guard profile: ${validation.errors.join('; ')}`);
    }
    return profile;
  }

  toPosixPath(filePath) {
    return String(filePath || '').replace(/\\/g, '/');
  }

  relativeToProject(filePath) {
    return this.toPosixPath(path.relative(this.projectRoot, filePath));
  }

  resolveProjectPath(filePath) {
    const absolutePath = path.isAbsolute(filePath)
      ? path.normalize(filePath)
      : path.resolve(this.projectRoot, filePath);
    return {
      absolutePath,
      relativePath: this.relativeToProject(absolutePath),
    };
  }

  normalizeFiles(files) {
    return Array.from(new Set((Array.isArray(files) ? files : [])
      .map((filePath) => this.toPosixPath(String(filePath || '').trim()))
      .filter(Boolean)));
  }

  isAllowedTextFile(filePath) {
    return this.allowedExtensions.has(path.extname(filePath).toLowerCase());
  }

  isIgnoredTrackedPath(filePath) {
    const normalizedPath = this.toPosixPath(filePath);
    return this.ignoredTrackedPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
  }

  fileExistsInWorkspace(relativePath) {
    return fs.existsSync(path.join(this.projectRoot, relativePath));
  }

  runGit(args) {
    const result = cp.spawnSync('git', args, {
      cwd: this.projectRoot,
      encoding: 'utf8',
      shell: false,
    });

    if ((result.status ?? 1) !== 0) {
      const statusFileFallback = this.readGitStatusFallback();
      if (statusFileFallback) {
        return statusFileFallback;
      }
      const stderr = (result.stderr || '').trim();
      const spawnError = result.error ? ` ${String(result.error.message || result.error)}` : '';
      throw new Error(stderr || `git ${args.join(' ')} failed.${spawnError}`);
    }

    return String(result.stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  readGitStatusFallback() {
    const rawPath = String(process.env.ATM_WORKTREE_STATUS_FILE || '').trim();
    if (!rawPath) {
      return null;
    }
    const absolutePath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(this.projectRoot, rawPath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    return fs.readFileSync(absolutePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.length > 3 ? line.slice(3).trim() : '')
      .filter(Boolean)
      .map((filePath) => filePath.includes(' -> ') ? filePath.split(' -> ').pop().trim() : filePath)
      .map((filePath) => this.toPosixPath(filePath));
  }

  collectTouchedFiles() {
    const workingTree = this.runGit(['diff', '--name-only', '--diff-filter=ACMR']);
    const staged = this.runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
    const untracked = this.runGit(['ls-files', '--others', '--exclude-standard']);

    return [...new Set([...workingTree, ...staged, ...untracked])]
      .map((filePath) => this.toPosixPath(filePath))
      .filter((filePath) => this.isAllowedTextFile(filePath))
      .filter((filePath) => this.fileExistsInWorkspace(filePath));
  }

  getStagedFiles() {
    return this.runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
      .filter((filePath) => !this.isIgnoredTrackedPath(filePath))
      .filter((filePath) => this.fileExistsInWorkspace(filePath))
      .filter((filePath) => this.isAllowedTextFile(filePath));
  }

  getTrackedFiles() {
    return this.runGit(['ls-files'])
      .filter((filePath) => !this.isIgnoredTrackedPath(filePath))
      .filter((filePath) => this.fileExistsInWorkspace(filePath))
      .filter((filePath) => this.isAllowedTextFile(filePath));
  }

  collectOccurrences(text, fragments) {
    return (Array.isArray(fragments) ? fragments : []).reduce((total, fragment) => {
      if (!fragment) {
        return total;
      }

      return total + (text.split(fragment).length - 1);
    }, 0);
  }

  countNonAscii(text) {
    let count = 0;
    for (const char of String(text || '')) {
      if (char.codePointAt(0) > 127) {
        count += 1;
      }
    }
    return count;
  }

  buildTargetList(options = {}) {
    const files = this.normalizeFiles(options.files);
    if (files.length > 0) {
      return [...new Set(files.map((filePath) => this.resolveProjectPath(filePath).relativePath))];
    }

    if (options.staged === true) {
      const stagedFiles = this.getStagedFiles().map((filePath) => this.resolveProjectPath(filePath).relativePath);
      const configuredFiles = Object.keys(this.highRiskEntries || {});
      return [...new Set([...stagedFiles, ...configuredFiles])];
    }

    return this.getTrackedFiles().map((filePath) => this.resolveProjectPath(filePath).relativePath);
  }

  analyzeFile(relativePath) {
    const absolutePath = path.join(this.projectRoot, relativePath);
    const highRiskConfig = this.highRiskEntries[relativePath] || null;
    const allowBom = Boolean(
      (highRiskConfig && highRiskConfig.allowBom)
      || ((this.config.legacyAllowlist?.bom || []).includes(relativePath))
    );
    const allowReplacement = Boolean((this.config.legacyAllowlist?.replacementChar || []).includes(relativePath));
    const allowMojibake = Boolean((this.config.legacyAllowlist?.mojibake || []).includes(relativePath));

    if (!fs.existsSync(absolutePath)) {
      return {
        relativePath,
        issues: [`Missing file: ${relativePath}`],
        warnings: [],
        stats: null,
      };
    }

    const buffer = fs.readFileSync(absolutePath);
    const hasBom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
    const contentBuffer = hasBom ? buffer.subarray(3) : buffer;
    const text = contentBuffer.toString('utf8');
    const roundTripBuffer = Buffer.from(text, 'utf8');
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    const latinMojibakeCount = this.collectOccurrences(text, this.config.latinMojibakeFragments || []);
    const weirdCjkCount = this.collectOccurrences(text, this.config.weirdCjkFragments || []);
    const suspiciousRatio = text.length > 0 ? latinMojibakeCount / text.length : 0;
    const nonAsciiCount = this.countNonAscii(text);

    const issues = [];
    const warnings = [];

    if (!contentBuffer.equals(roundTripBuffer)) {
      issues.push('Invalid UTF-8 byte sequence or lossy utf8 decode detected.');
    }

    if (hasBom && !allowBom) {
      issues.push('Unexpected UTF-8 BOM detected.');
    } else if (hasBom && allowBom) {
      warnings.push('BOM allowed by temporary legacy allowlist.');
    }

    if (replacementCount > 0 && !allowReplacement) {
      issues.push(`Replacement character found ${replacementCount} time(s).`);
    }

    const exceedsLatinHeuristic = latinMojibakeCount >= (this.config.latinMojibakeMinCount || 1)
      && suspiciousRatio >= (this.config.latinMojibakeMinRatio || 0);
    const exceedsWeirdCjkHeuristic = weirdCjkCount >= (this.config.weirdCjkMinCount || 1);

    if ((exceedsLatinHeuristic || exceedsWeirdCjkHeuristic) && !allowMojibake) {
      issues.push(
        `Suspicious mojibake signature detected (latin=${latinMojibakeCount}, weird-cjk=${weirdCjkCount}, ratio=${suspiciousRatio.toFixed(4)}).`
      );
    }

    if (highRiskConfig && Number.isFinite(highRiskConfig.baselineNonAscii)) {
      const delta = Math.abs(nonAsciiCount - highRiskConfig.baselineNonAscii);
      if (delta > highRiskConfig.maxNonAsciiDelta) {
        issues.push(
          `Non-ASCII baseline drift too large (${nonAsciiCount} vs baseline ${highRiskConfig.baselineNonAscii}, delta ${delta}, allowed ${highRiskConfig.maxNonAsciiDelta}).`
        );
      }
    }

    return {
      relativePath,
      issues,
      warnings,
      stats: {
        hasBom,
        replacementCount,
        latinMojibakeCount,
        weirdCjkCount,
        nonAsciiCount,
        label: highRiskConfig ? highRiskConfig.label : null,
      },
    };
  }

  ensureTrailingNewline(text) {
    if (!text) {
      return '';
    }
    return text.endsWith('\n') ? text : `${text}\n`;
  }

  formatOutput(lines) {
    return this.ensureTrailingNewline(lines.join('\n').trimEnd());
  }

  buildIntegrityCommand(options = {}) {
    const files = this.normalizeFiles(options.files);
    const args = [];
    if (files.length > 0) {
      args.push('--files', ...files);
    } else if (options.staged === true) {
      args.push('--staged');
    }
    return `node tools_node/check-encoding-integrity.js ${args.join(' ')}`.trim();
  }

  buildTouchedCommand(files = []) {
    const normalized = this.normalizeFiles(files);
    const args = normalized.length > 0 ? ['--files', ...normalized] : [];
    return `node tools_node/check-encoding-touched.js ${args.join(' ')}`.trim();
  }

  writeResultToIO(result, io) {
    if (result.stdout) {
      io.stdout.write(this.ensureTrailingNewline(result.stdout));
    }
    if (result.stderr) {
      io.stderr.write(this.ensureTrailingNewline(result.stderr));
    }
  }

  printTouchedHelp(io) {
    io.stdout.write(this.formatOutput([
      'Usage: node tools_node/check-encoding-touched.js [--staged] [--files <path...>]',
      '',
      'Default: check touched text files in working tree + staged + untracked.',
      '--files: check only the provided file list.',
      '--staged: delegate to staged-files integrity check.',
    ]));
  }

  printIntegrityHelp(io) {
    io.stdout.write(this.formatOutput([
      'Usage: node tools_node/check-encoding-integrity.js [--staged] [--files <path...>]',
      '',
      'Default: check all tracked text files with allowed extensions.',
      '--staged: check staged text files plus configured high-risk files.',
      '--files: check only the provided paths.',
    ]));
  }

  parseTouchedCliArgs(argv = []) {
    const parsed = {
      help: argv.includes('--help') || argv.includes('-h'),
      stagedOnly: argv.includes('--staged'),
      files: [],
    };

    for (let index = 0; index < argv.length; index += 1) {
      if (argv[index] === '--files') {
        while (index + 1 < argv.length && !String(argv[index + 1]).startsWith('--')) {
          parsed.files.push(this.toPosixPath(argv[index + 1]));
          index += 1;
        }
      }
    }
    return parsed;
  }

  parseIntegrityCliArgs(argv = []) {
    const parsed = {
      files: [],
      staged: false,
      help: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
      const token = argv[index];

      if (token === '--staged') {
        parsed.staged = true;
        continue;
      }

      if (token === '--help' || token === '-h') {
        parsed.help = true;
        continue;
      }

      if (token === '--files') {
        while (index + 1 < argv.length && !String(argv[index + 1]).startsWith('--')) {
          parsed.files.push(this.toPosixPath(argv[index + 1]));
          index += 1;
        }
        continue;
      }

      parsed.files.push(this.toPosixPath(token));
    }

    return parsed;
  }

  runTouchedCli(argv = [], io = process) {
    const options = this.parseTouchedCliArgs(argv);
    if (options.help) {
      this.printTouchedHelp(io);
      return 0;
    }

    const result = options.stagedOnly
      ? this.checkIntegrity({ staged: true })
      : this.checkTouched(options.files);

    this.writeResultToIO(result, io);
    return result.exitCode;
  }

  runIntegrityCli(argv = [], io = process) {
    const options = this.parseIntegrityCliArgs(argv);
    if (options.help) {
      this.printIntegrityHelp(io);
      return 0;
    }

    const result = this.checkIntegrity(options);
    this.writeResultToIO(result, io);
    return result.exitCode;
  }

  buildErrorResult(command, errorMessage) {
    return {
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: String(errorMessage || 'Unknown encoding adapter error.'),
      command,
    };
  }

  checkIntegrity(options = {}) {
    const command = this.buildIntegrityCommand(options);
    let targets;
    try {
      targets = this.buildTargetList(options)
        .filter(Boolean)
        .filter((filePath) => this.isAllowedTextFile(filePath));
    } catch (error) {
      return this.buildErrorResult(command, error instanceof Error ? error.message : String(error));
    }

    if (targets.length === 0) {
      return {
        ok: true,
        exitCode: 0,
        stdout: '[encoding] No matching text files to check.\n',
        stderr: '',
        command,
      };
    }

    const stdoutLines = [];
    const stderrLines = [];
    let failed = false;

    for (const relativePath of targets) {
      const result = this.analyzeFile(relativePath);
      const label = result.stats && result.stats.label ? ` (${result.stats.label})` : '';
      stdoutLines.push(`[encoding] Checking ${result.relativePath}${label}`);

      if (result.stats) {
        stdoutLines.push(
          `  nonAscii=${result.stats.nonAsciiCount} bom=${result.stats.hasBom ? 'yes' : 'no'} replacement=${result.stats.replacementCount} latinMojibake=${result.stats.latinMojibakeCount} weirdCjk=${result.stats.weirdCjkCount}`
        );
      }

      for (const warning of result.warnings) {
        stdoutLines.push(`  warning: ${warning}`);
      }

      if (result.issues.length > 0) {
        failed = true;
        for (const issue of result.issues) {
          stderrLines.push(`  error: ${issue}`);
        }
      } else {
        stdoutLines.push('  ok');
      }
    }

    if (failed) {
      stderrLines.push('[encoding] Integrity check failed.');
    } else {
      stdoutLines.push('[encoding] Integrity check passed.');
    }

    return {
      ok: !failed,
      exitCode: failed ? 1 : 0,
      stdout: this.formatOutput(stdoutLines),
      stderr: this.formatOutput(stderrLines),
      command,
    };
  }

  checkTouched(files = []) {
    const command = this.buildTouchedCommand(files);
    const normalized = this.normalizeFiles(files)
      .filter((filePath) => this.isAllowedTextFile(filePath))
      .filter((filePath) => this.fileExistsInWorkspace(filePath));

    let touchedFiles = normalized;
    if (touchedFiles.length === 0) {
      try {
        touchedFiles = this.collectTouchedFiles();
      } catch (error) {
        return this.buildErrorResult(command, error instanceof Error ? error.message : String(error));
      }
    }

    if (touchedFiles.length === 0) {
      return {
        ok: true,
        exitCode: 0,
        stdout: '[encoding-touched] No touched text files to check.\n',
        stderr: '',
        command,
      };
    }

    const integrityResult = this.checkIntegrity({ files: touchedFiles });
    return {
      ok: integrityResult.ok,
      exitCode: integrityResult.exitCode,
      stdout: this.formatOutput([
        `[encoding-touched] Checking ${touchedFiles.length} touched text file(s).`,
        String(integrityResult.stdout || '').trimEnd(),
      ]),
      stderr: integrityResult.stderr,
      command,
    };
  }

}

function createEncodingAdapter(options = {}) {
  return new EncodingAdapter(options);
}

module.exports = {
  EncodingAdapter,
  createEncodingAdapter,
};
