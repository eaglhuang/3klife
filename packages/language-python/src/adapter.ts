import fs from 'node:fs';
import path from 'node:path';
import type {
  LanguageAdapterReport,
  LanguageAdapterV2,
  LanguageProjectProfile,
  SourceInventoryRequest,
} from '../../../plugin-sdk/src/language-adapter';
import {
  detectPythonRuntimeCommands,
  scanPythonSourceInventory,
} from './python-static-analysis';
import { planPythonAtomizeDryRun, planPythonInfectDryRun } from './python-dry-run';
import {
  computePythonEquivalenceContract,
  parsePythonDiagnostics,
} from './python-diagnostics';

function hasPythonFile(repositoryRoot: string): boolean {
  const root = path.resolve(repositoryRoot);
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '__pycache__') {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.name.endsWith('.py')) {
        return true;
      }
    }
  }
  return false;
}

function detectPythonProjectProfile(repositoryRoot: string): LanguageProjectProfile {
  const root = path.resolve(repositoryRoot);
  const evidence: string[] = [];
  let confidence = 0.1;

  const pyprojectPath = path.join(root, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    evidence.push('pyproject.toml');
    confidence = 0.95;
  }
  const requirementsPath = path.join(root, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    evidence.push('requirements.txt');
    confidence = Math.max(confidence, 0.85);
  }
  if (hasPythonFile(root)) {
    evidence.push('*.py');
    confidence = Math.max(confidence, 0.75);
  }

  return {
    languageId: 'python',
    profileId: confidence >= 0.75 ? 'python-project' : 'python-unknown',
    confidence,
    evidence,
  };
}

function validatePythonComputeAtom(repositoryRoot: string): LanguageAdapterReport {
  const profile = detectPythonProjectProfile(repositoryRoot);
  if (profile.confidence < 0.75) {
    return {
      ok: false,
      adapterId: 'py-bundled',
      contractVersion: 'v2',
      messages: [
        'Python project evidence is weak; expected pyproject.toml, requirements.txt, or .py sources.',
      ],
    };
  }
  return {
    ok: true,
    adapterId: 'py-bundled',
    contractVersion: 'v2',
    messages: [`Python project profile accepted with confidence=${profile.confidence.toFixed(2)}.`],
  };
}

async function scanSourceInventory(request: SourceInventoryRequest) {
  return scanPythonSourceInventory(request);
}

export const pythonLanguageAdapterV2: LanguageAdapterV2 = {
  adapterId: 'py-bundled',
  languageId: 'python',
  contractVersion: 'v2',
  capabilities: {
    sourceInventory: 'full',
    symbolNormalization: 'partial',
    legacyRoutePlanning: 'partial',
    atomizeDryRun: 'full',
    infectDryRun: 'full',
    runtimeCommandDetection: 'full',
    diagnosticsParsing: 'full',
    equivalenceContract: 'full',
    dependencyGraph: 'full',
    callGraph: 'partial',
    artifactGraph: 'full',
  },
  detectProjectProfile(repositoryRoot: string) {
    return detectPythonProjectProfile(repositoryRoot);
  },
  validateComputeAtom(request) {
    return validatePythonComputeAtom(request.repositoryRoot);
  },
  scanSourceInventory(request) {
    return scanSourceInventory(request);
  },
  detectRuntimeCommands(request) {
    return detectPythonRuntimeCommands(request);
  },
  planAtomizeDryRun(request) {
    return planPythonAtomizeDryRun(request);
  },
  planInfectDryRun(request) {
    return planPythonInfectDryRun(request);
  },
  parseDiagnostics(request) {
    return parsePythonDiagnostics(request);
  },
  computeEquivalenceContract(request) {
    return computePythonEquivalenceContract(request);
  },
};
