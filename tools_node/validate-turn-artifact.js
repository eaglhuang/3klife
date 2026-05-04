#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const config = require('./lib/project-config');

const PROJECT_ROOT = config.ROOT;
const DEFAULT_SCHEMA_PATH = path.join(PROJECT_ROOT, 'tools_node', 'schemas', 'turn-artifact.schema.json');
const RELATIVE_POSIX_PATH_PATTERN = /^(?![A-Za-z]:)(?!\/)(?!\\\\)(?!file:)(?!https?:)(?!db:)[^\\]+(?:\/[^\\]+)*$/;

function printHelp() {
  console.log('Usage: node tools_node/validate-turn-artifact.js --artifact <path> [--strict]');
  console.log('');
  console.log('Options:');
  console.log('  --artifact <path>   Path to the turn artifact JSON file (required)');
  console.log('  --strict            Exit with code 1 if schema/invariant validation fails');
  console.log('  --help, -h          Show this help message');
}

function parseArgs(argv) {
  const parsed = {
    artifact: '',
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--artifact') {
      parsed.artifact = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`未知參數：${token}`);
  }

  return parsed;
}

function resolveProjectPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(PROJECT_ROOT, inputPath);
}

function relativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

function readJsonOrThrow(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} 讀取失敗：${error.message}`);
  }
}

function decodeJsonPointer(segment) {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function formatInstancePath(instancePath) {
  if (!instancePath) {
    return '(root)';
  }

  const tokens = instancePath
    .split('/')
    .slice(1)
    .map(decodeJsonPointer);

  let result = '';
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      result += `[${token}]`;
      continue;
    }
    result += result ? `.${token}` : token;
  }
  return result || '(root)';
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRepoRelativePosixPath(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  if (value !== value.replace(/\\/g, '/')) {
    return false;
  }
  if (value.startsWith('./') || value.startsWith('../')) {
    return false;
  }
  if (value.includes('/./') || value.includes('../') || value.includes('//')) {
    return false;
  }
  return RELATIVE_POSIX_PATH_PATTERN.test(value);
}

function pushFailure(target, field, message, fixHint) {
  target.push({ field, message, fixHint });
}

function schemaFixHint(error, field) {
  switch (error.keyword) {
    case 'required':
      return '補上 schema 規定的必要欄位';
    case 'additionalProperties':
      return '移除 schema 未允許的欄位';
    case 'type':
      return `${field} 改成正確型別`;
    case 'const':
      return `${field} 改成 schema 規定的固定值`;
    case 'enum':
      return `${field} 改成允許值之一`;
    case 'pattern':
      return `${field} 改成 repo-relative POSIX path`;
    case 'format':
      return `${field} 改成 RFC3339 date-time`; 
    case 'minimum':
      return `${field} 改成非負整數`;
    case 'minLength':
      return `${field} 不可為空字串`;
    default:
      return '依 schema 訊息修正欄位內容';
  }
}

function runSchemaValidation(schema, artifact) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(artifact);
  if (valid) {
    return [];
  }

  return (validate.errors || []).map((error) => {
    const baseField = formatInstancePath(error.instancePath || '');
    let field = baseField;
    if (error.keyword === 'required' && error.params?.missingProperty) {
      field = baseField === '(root)'
        ? error.params.missingProperty
        : `${baseField}.${error.params.missingProperty}`;
    }
    if (error.keyword === 'additionalProperties' && error.params?.additionalProperty) {
      field = baseField === '(root)'
        ? error.params.additionalProperty
        : `${baseField}.${error.params.additionalProperty}`;
    }
    return {
      field,
      message: error.message || 'schema 驗證失敗',
      fixHint: schemaFixHint(error, field),
    };
  });
}

function validateTotals(artifact, failures) {
  const files = Array.isArray(artifact.files) ? artifact.files : [];
  const totals = artifact.totals || {};
  const actual = {
    files: files.length,
    textFiles: files.filter((entry) => entry.kind === 'text').length,
    imageFiles: files.filter((entry) => entry.kind === 'image').length,
    otherFiles: files.filter((entry) => entry.kind === 'binary').length,
    totalBytes: files.reduce((sum, entry) => sum + (Number.isFinite(entry.bytes) ? entry.bytes : 0), 0),
    estTokens: files.reduce((sum, entry) => sum + (Number.isFinite(entry.estTokens) ? entry.estTokens : 0), 0),
  };

  Object.entries(actual).forEach(([key, value]) => {
    if (totals[key] !== value) {
      pushFailure(
        failures,
        `totals.${key}`,
        `宣告值為 ${totals[key]}，但依 files[] 實算為 ${value}`,
        '重新計算 totals，或修正 files[] 內容'
      );
    }
  });
}

function validatePaths(artifact, failures) {
  const files = Array.isArray(artifact.files) ? artifact.files : [];
  const explicitFiles = Array.isArray(artifact.source?.explicitFiles) ? artifact.source.explicitFiles : [];
  const readPaths = Array.isArray(artifact.summaryCard?.read) ? artifact.summaryCard.read : [];

  const seenFiles = new Set();
  files.forEach((entry, index) => {
    const field = `files[${index}].path`;
    if (!isRepoRelativePosixPath(entry.path)) {
      pushFailure(failures, field, `路徑 "${entry.path}" 不是正規化的 repo-relative POSIX path`, '移除絕對路徑、反斜線、./ 或 ../ 片段');
      return;
    }
    if (seenFiles.has(entry.path)) {
      pushFailure(failures, field, `路徑 "${entry.path}" 在 files[] 中重複`, '合併重複項，或保留唯一的 path');
      return;
    }
    seenFiles.add(entry.path);
  });

  explicitFiles.forEach((entry, index) => {
    const field = `source.explicitFiles[${index}]`;
    if (!isRepoRelativePosixPath(entry)) {
      pushFailure(failures, field, `路徑 "${entry}" 不是正規化的 repo-relative POSIX path`, '改成 repo-relative POSIX path');
    }
  });

  const seenReadPaths = new Set();
  readPaths.forEach((entry, index) => {
    const field = `summaryCard.read[${index}]`;
    if (!isRepoRelativePosixPath(entry)) {
      pushFailure(failures, field, `路徑 "${entry}" 不是正規化的 repo-relative POSIX path`, '改成 repo-relative POSIX path');
      return;
    }
    if (seenReadPaths.has(entry)) {
      pushFailure(failures, field, `路徑 "${entry}" 在 summaryCard.read 中重複`, 'summaryCard.read 僅保留唯一項目');
      return;
    }
    seenReadPaths.add(entry);
    if (files.length > 0 && !seenFiles.has(entry)) {
      pushFailure(failures, field, `summaryCard.read 引用了 files[] 中不存在的路徑 "${entry}"`, '改成 files[] 內已列出的 path');
    }
  });
}

function validateSummaryCard(artifact, failures) {
  const summaryCard = artifact.summaryCard || {};
  if (!isNonEmptyString(summaryCard.workflow)) {
    pushFailure(failures, 'summaryCard.workflow', '必須是非空字串', '補上可讀的 workflow 名稱');
  }
  if (!isNonEmptyString(summaryCard.task)) {
    pushFailure(failures, 'summaryCard.task', '必須是非空字串', '補上對應 task id 或 task label');
  }
  if (!isNonEmptyString(summaryCard.goal)) {
    pushFailure(failures, 'summaryCard.goal', '必須是非空字串', '補上本輪交付目標');
  }
  if (!Array.isArray(summaryCard.read) || (Array.isArray(artifact.files) && artifact.files.length > 0 && summaryCard.read.length === 0)) {
    pushFailure(failures, 'summaryCard.read', '在 files[] 非空時，summaryCard.read 不可為空', '至少列出本輪實際讀取或引用的檔案');
  }
  if (isNonEmptyString(artifact.workflow) && summaryCard.workflow !== artifact.workflow) {
    pushFailure(failures, 'summaryCard.workflow', `值為 "${summaryCard.workflow}"，與頂層 workflow "${artifact.workflow}" 不一致`, '讓 summaryCard.workflow 與頂層 workflow 保持一致');
  }
  if (isNonEmptyString(artifact.task) && summaryCard.task !== artifact.task) {
    pushFailure(failures, 'summaryCard.task', `值為 "${summaryCard.task}"，與頂層 task "${artifact.task}" 不一致`, '讓 summaryCard.task 與頂層 task 保持一致');
  }
  if (isNonEmptyString(artifact.goal) && summaryCard.goal !== artifact.goal) {
    pushFailure(failures, 'summaryCard.goal', `值為 "${summaryCard.goal}"，與頂層 goal 不一致`, '讓 summaryCard.goal 與頂層 goal 保持一致');
  }
}

function validateVersionPair(artifact, failures) {
  if (artifact.schemaVersion === 'turn-artifact/v1' && artifact.kind !== 'turn-artifact') {
    pushFailure(failures, 'kind', `schemaVersion=${artifact.schemaVersion} 時，kind 必須是 turn-artifact`, '把 kind 改回 turn-artifact');
  }
}

function runInvariantValidation(artifact) {
  const failures = [];
  validateVersionPair(artifact, failures);
  validateTotals(artifact, failures);
  validatePaths(artifact, failures);
  validateSummaryCard(artifact, failures);
  return failures;
}

function printFailures(title, failures) {
  if (failures.length === 0) {
    return;
  }
  console.error(`${title} (${failures.length})`);
  failures.forEach((failure, index) => {
    console.error(`  ${index + 1}. ${failure.field}: ${failure.message}`);
    if (failure.fixHint) {
      console.error(`     修補方向: ${failure.fixHint}`);
    }
  });
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[turn-artifact] ${error.message}`);
    printHelp();
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.artifact) {
    console.error('[turn-artifact] 缺少 --artifact <path>');
    printHelp();
    process.exit(1);
  }

  const artifactPath = resolveProjectPath(args.artifact);
  const schemaPath = DEFAULT_SCHEMA_PATH;
  if (!fs.existsSync(artifactPath)) {
    console.error(`[turn-artifact] 找不到 artifact：${relativePath(artifactPath)}`);
    process.exit(1);
  }
  if (!fs.existsSync(schemaPath)) {
    console.error(`[turn-artifact] 找不到 schema：${relativePath(schemaPath)}`);
    process.exit(1);
  }

  let schema;
  let artifact;
  try {
    schema = readJsonOrThrow(schemaPath, 'schema');
    artifact = readJsonOrThrow(artifactPath, 'artifact');
  } catch (error) {
    console.error(`[turn-artifact] ${error.message}`);
    process.exit(1);
  }

  const schemaFailures = runSchemaValidation(schema, artifact);
  const invariantFailures = schemaFailures.length === 0 ? runInvariantValidation(artifact) : [];
  const totalFailures = schemaFailures.length + invariantFailures.length;

  if (totalFailures === 0) {
    console.log(`✔ turn-artifact valid: ${relativePath(artifactPath)}`);
    console.log(`  schemaVersion=${artifact.schemaVersion} kind=${artifact.kind}`);
    console.log(`  files=${artifact.totals.files} totalBytes=${artifact.totals.totalBytes} estTokens=${artifact.totals.estTokens}`);
    console.log(`  summaryCard.read=${artifact.summaryCard.read.length} nextActions=${artifact.nextActions.length}`);
    return;
  }

  console.error(`${args.strict ? '❌' : '⚠'} turn-artifact validation found ${totalFailures} issue(s): ${relativePath(artifactPath)}`);
  printFailures('Schema failures', schemaFailures);
  printFailures('Invariant failures', invariantFailures);

  if (args.strict) {
    process.exit(1);
  }
}

main();