import fs from 'node:fs';
import path from 'node:path';
import type {
  LanguageAdapterReport,
  LanguageAdapterV2,
  LanguageProjectProfile,
  SourceInventoryRequest,
} from '../../../plugin-sdk/src/language-adapter';
import {
  detectJsRuntimeCommands,
  normalizeJsSymbolId,
  scanJsSourceInventory,
  buildJsLegacyRoutePlan,
} from './js-static-analysis';
import { planJsAtomizeDryRun, planJsInfectDryRun } from './js-dry-run';

const JS_TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

function hasJsTsFile(repositoryRoot: string): boolean {
  const root = path.resolve(repositoryRoot);
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (JS_TS_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return true;
      }
    }
  }
  return false;
}

function detectJsProjectProfile(repositoryRoot: string): LanguageProjectProfile {
  const root = path.resolve(repositoryRoot);
  const evidence: string[] = [];
  let confidence = 0.1;

  const tsConfigPath = path.join(root, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    evidence.push('tsconfig.json');
    confidence = 0.95;
  }
  const packageJsonPath = path.join(root, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    evidence.push('package.json');
    confidence = Math.max(confidence, 0.85);
  }
  if (hasJsTsFile(root)) {
    evidence.push('*.ts/*.js');
    confidence = Math.max(confidence, 0.75);
  }

  return {
    languageId: 'typescript',
    profileId: confidence >= 0.75 ? 'js-ts-project' : 'js-ts-unknown',
    confidence,
    evidence,
  };
}

function validateJsComputeAtom(repositoryRoot: string): LanguageAdapterReport {
  const profile = detectJsProjectProfile(repositoryRoot);
  if (profile.confidence < 0.75) {
    return {
      ok: false,
      adapterId: 'js-bundled',
      contractVersion: 'v2',
      messages: ['JS/TS project evidence is weak; expected tsconfig.json, package.json, or .ts/.js sources.'],
    };
  }
  return {
    ok: true,
    adapterId: 'js-bundled',
    contractVersion: 'v2',
    messages: [`JS/TS project profile accepted with confidence=${profile.confidence.toFixed(2)}.`],
  };
}

async function scanSourceInventory(request: SourceInventoryRequest) {
  return scanJsSourceInventory(request);
}

export const jsLanguageAdapterV2: LanguageAdapterV2 = {
  adapterId: 'js-bundled',
  languageId: 'typescript',
  contractVersion: 'v2',
  capabilities: {
    sourceInventory: 'full',
    symbolNormalization: 'full',
    legacyRoutePlanning: 'full',
    atomizeDryRun: 'full',
    infectDryRun: 'full',
    runtimeCommandDetection: 'full',
    diagnosticsParsing: 'none',
    equivalenceContract: 'none',
    atomicMapDecomposition: 'none',
    dependencyGraph: 'full',
    callGraph: 'partial',
    artifactGraph: 'partial',
  },
  detectProjectProfile(repositoryRoot: string) {
    return detectJsProjectProfile(repositoryRoot);
  },
  validateComputeAtom(request) {
    return validateJsComputeAtom(request.repositoryRoot);
  },
  scanSourceInventory(request) {
    return scanSourceInventory(request);
  },
  normalizeSymbolId(request) {
    return normalizeJsSymbolId(request.rawSymbolId, request.filePath);
  },
  buildLegacyRoutePlan(request) {
    return buildJsLegacyRoutePlan(request.intent, request.repositoryRoot);
  },
  detectRuntimeCommands(request) {
    return detectJsRuntimeCommands(request);
  },
  planAtomizeDryRun(request) {
    return planJsAtomizeDryRun(request);
  },
  planInfectDryRun(request) {
    return planJsInfectDryRun(request);
  },
};
