import fs from 'node:fs';
import path from 'node:path';
import type { LanguageProjectProfile } from '../../../plugin-sdk/src/language-adapter';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'Library', 'Temp', 'obj', 'bin']);

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function walkFiles(root: string, collector: (relativePath: string) => void): void {
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      const relativePath = toPosix(path.relative(root, fullPath));
      collector(relativePath);
    }
  }
}

interface CSharpProjectEvidence {
  hasSolution: boolean;
  hasCsproj: boolean;
  hasDirectoryBuildProps: boolean;
  hasCSharpSource: boolean;
  hasUnityEvidence: boolean;
  evidence: string[];
}

export function collectCSharpProjectEvidence(repositoryRoot: string): CSharpProjectEvidence {
  const root = path.resolve(repositoryRoot);
  const evidence: string[] = [];
  let hasSolution = false;
  let hasCsproj = false;
  let hasDirectoryBuildProps = false;
  let hasCSharpSource = false;

  if (!fs.existsSync(root)) {
    return {
      hasSolution: false,
      hasCsproj: false,
      hasDirectoryBuildProps: false,
      hasCSharpSource: false,
      hasUnityEvidence: false,
      evidence: [],
    };
  }

  walkFiles(root, (relativePath) => {
    const lower = relativePath.toLowerCase();
    if (lower.endsWith('.sln')) {
      hasSolution = true;
      evidence.push(relativePath);
    }
    if (lower.endsWith('.csproj')) {
      hasCsproj = true;
      evidence.push(relativePath);
    }
    if (lower.endsWith('/directory.build.props') || lower === 'directory.build.props') {
      hasDirectoryBuildProps = true;
      evidence.push(relativePath);
    }
    if (lower.endsWith('.cs')) {
      hasCSharpSource = true;
    }
  });

  const unityProjectVersionPath = path.join(root, 'ProjectSettings', 'ProjectVersion.txt');
  const unityPackagesPath = path.join(root, 'Packages', 'manifest.json');
  const unityAssetsPath = path.join(root, 'Assets');
  const hasUnityEvidence =
    fs.existsSync(unityProjectVersionPath) ||
    fs.existsSync(unityPackagesPath) ||
    fs.existsSync(unityAssetsPath);

  if (hasCSharpSource) {
    evidence.push('*.cs');
  }
  if (hasUnityEvidence) {
    if (fs.existsSync(unityProjectVersionPath)) {
      evidence.push('ProjectSettings/ProjectVersion.txt');
    }
    if (fs.existsSync(unityPackagesPath)) {
      evidence.push('Packages/manifest.json');
    }
    if (fs.existsSync(unityAssetsPath)) {
      evidence.push('Assets/');
    }
  }

  return {
    hasSolution,
    hasCsproj,
    hasDirectoryBuildProps,
    hasCSharpSource,
    hasUnityEvidence,
    evidence: Array.from(new Set(evidence)),
  };
}

export function detectCSharpProjectProfile(repositoryRoot: string): LanguageProjectProfile {
  const projectEvidence = collectCSharpProjectEvidence(repositoryRoot);
  const evidence = projectEvidence.evidence;

  let profileId = 'csharp-unknown';
  let confidence = 0.15;
  if (projectEvidence.hasSolution && projectEvidence.hasCsproj) {
    profileId = 'csharp-solution-project';
    confidence = 0.97;
  } else if (projectEvidence.hasCsproj) {
    profileId = 'csharp-project-only';
    confidence = 0.9;
  } else if (projectEvidence.hasCSharpSource) {
    profileId = 'csharp-source-only';
    confidence = 0.72;
  }

  if (projectEvidence.hasDirectoryBuildProps) {
    confidence = Math.max(confidence, 0.8);
  }
  if (projectEvidence.hasUnityEvidence) {
    profileId = profileId === 'csharp-unknown' ? 'csharp-unity-profile' : profileId;
    confidence = Math.max(confidence, 0.78);
  }

  return {
    languageId: 'csharp',
    profileId,
    confidence,
    evidence,
  };
}
