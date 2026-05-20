import fs from 'node:fs';
import path from 'node:path';
import type { LanguageProjectProfile } from '../../../plugin-sdk/src/language-adapter';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'Library', 'Temp', 'obj', 'bin']);

export interface CSharpSolutionProjectEntry {
  name: string;
  projectPath: string;
  projectGuid?: string;
}

export interface CSharpSolutionProfile {
  relativePath: string;
  formatVersion?: string;
  visualStudioVersion?: string;
  minimumVisualStudioVersion?: string;
  projectCount: number;
  configurations: string[];
  projectEntries: CSharpSolutionProjectEntry[];
}

export interface CSharpCsprojProfile {
  relativePath: string;
  sdk?: string;
  targetFrameworks: string[];
  outputType?: string;
  implicitUsings?: string;
  nullable?: string;
  langVersion?: string;
  defineConstants: string[];
  treatWarningsAsErrors?: string;
  isTestProject: boolean;
  packageReferences: string[];
  packageReferenceVersions: string[];
  packageReferencesWithoutVersion: string[];
  projectReferences: string[];
  conditionalPropertyGroups: string[];
  conditionalItemGroups: string[];
  usesCentralPackageManagement: boolean;
}

export interface CSharpDirectoryBuildPropsProfile {
  relativePath: string;
  nullable?: string;
  langVersion?: string;
  treatWarningsAsErrors?: string;
}

export interface CSharpDirectoryPackagesPropsProfile {
  relativePath: string;
  managePackageVersionsCentrally?: string;
  centralPackageVersions: string[];
}

export interface CSharpProjectEvidence {
  hasSolution: boolean;
  hasCsproj: boolean;
  hasDirectoryBuildProps: boolean;
  hasDirectoryPackagesProps: boolean;
  hasCSharpSource: boolean;
  hasUnityEvidence: boolean;
  evidence: string[];
  solutionProfiles: CSharpSolutionProfile[];
  csprojProfiles: CSharpCsprojProfile[];
  directoryBuildPropsProfiles: CSharpDirectoryBuildPropsProfile[];
  directoryPackagesPropsProfiles: CSharpDirectoryPackagesPropsProfile[];
  warnings: string[];
}

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
      collector(toPosix(path.relative(root, fullPath)));
    }
  }
}

function collectXmlTagValues(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) != null) {
    values.push(match[1].trim());
  }
  return values.filter(Boolean);
}

function collectXmlFirstValue(xml: string, tagName: string): string | undefined {
  return collectXmlTagValues(xml, tagName)[0];
}

function parseSemicolonList(rawValues: readonly string[]): string[] {
  return Array.from(
    new Set(
      rawValues
        .flatMap((value) => value.split(';').map((part) => part.trim()))
        .filter(Boolean)
    )
  );
}

function parseAttribute(fragment: string, attributeName: string): string | undefined {
  const regex = new RegExp(`${attributeName}\\s*=\\s*"([^"]+)"`, 'i');
  return fragment.match(regex)?.[1];
}

function parseConditionalGroupValues(xml: string, groupTag: 'PropertyGroup' | 'ItemGroup'): string[] {
  const regex = new RegExp(`<${groupTag}\\b([^>]*)>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) != null) {
    const condition = parseAttribute(match[1], 'Condition');
    if (condition) {
      values.push(condition.trim());
    }
  }
  return Array.from(new Set(values));
}

function collectPackageReferences(xml: string): Array<{ include: string; version?: string }> {
  const references: Array<{ include: string; version?: string }> = [];

  const selfClosingRegex = /<PackageReference\b([^>]*)\/>/gi;
  let selfClosingMatch: RegExpExecArray | null;
  while ((selfClosingMatch = selfClosingRegex.exec(xml)) != null) {
    const include = parseAttribute(selfClosingMatch[1], 'Include');
    if (!include) {
      continue;
    }
    references.push({
      include,
      version: parseAttribute(selfClosingMatch[1], 'Version'),
    });
  }

  const blockRegex = /<PackageReference\b([^>]*)>([\s\S]*?)<\/PackageReference>/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(xml)) != null) {
    const include = parseAttribute(blockMatch[1], 'Include');
    if (!include) {
      continue;
    }
    const versionFromAttribute = parseAttribute(blockMatch[1], 'Version');
    const versionFromNode = collectXmlFirstValue(blockMatch[2], 'Version');
    references.push({
      include,
      version: versionFromAttribute ?? versionFromNode,
    });
  }

  const deduped = new Map<string, { include: string; version?: string }>();
  for (const reference of references) {
    const existing = deduped.get(reference.include.toLowerCase());
    if (!existing) {
      deduped.set(reference.include.toLowerCase(), reference);
      continue;
    }
    if (!existing.version && reference.version) {
      deduped.set(reference.include.toLowerCase(), reference);
    }
  }
  return Array.from(deduped.values());
}

function parseCsprojProfile(relativePath: string, xml: string): CSharpCsprojProfile {
  const projectOpenTagMatch = xml.match(/<Project\b([^>]*)>/i);
  const sdk = projectOpenTagMatch ? parseAttribute(projectOpenTagMatch[1], 'Sdk') : undefined;
  const targetFrameworks = parseSemicolonList([
    ...collectXmlTagValues(xml, 'TargetFramework'),
    ...collectXmlTagValues(xml, 'TargetFrameworks'),
  ]);

  const packageReferenceEntries = collectPackageReferences(xml);
  const packageReferences = packageReferenceEntries.map((entry) => entry.include);
  const packageReferenceVersions = packageReferenceEntries
    .filter((entry) => Boolean(entry.version))
    .map((entry) => `${entry.include}@${entry.version}`)
    .sort((left, right) => left.localeCompare(right));
  const packageReferencesWithoutVersion = packageReferenceEntries
    .filter((entry) => !entry.version)
    .map((entry) => entry.include)
    .sort((left, right) => left.localeCompare(right));
  const projectReferences = Array.from(
    new Set(
      [...xml.matchAll(/<ProjectReference\b([^>]*)\/?>/gi)]
        .map((match) => parseAttribute(match[1], 'Include'))
        .filter((value): value is string => Boolean(value))
    )
  );

  const isTestProject =
    ['true', '1', 'yes'].includes((collectXmlFirstValue(xml, 'IsTestProject') ?? '').toLowerCase()) ||
    packageReferences.some((reference) =>
      /(microsoft\.net\.test\.sdk|xunit|nunit|mstest)/i.test(reference)
    );

  return {
    relativePath,
    sdk,
    targetFrameworks,
    outputType: collectXmlFirstValue(xml, 'OutputType'),
    implicitUsings: collectXmlFirstValue(xml, 'ImplicitUsings'),
    nullable: collectXmlFirstValue(xml, 'Nullable'),
    langVersion: collectXmlFirstValue(xml, 'LangVersion'),
    defineConstants: parseSemicolonList(collectXmlTagValues(xml, 'DefineConstants')),
    treatWarningsAsErrors: collectXmlFirstValue(xml, 'TreatWarningsAsErrors'),
    isTestProject,
    packageReferences,
    packageReferenceVersions,
    packageReferencesWithoutVersion,
    projectReferences,
    conditionalPropertyGroups: parseConditionalGroupValues(xml, 'PropertyGroup'),
    conditionalItemGroups: parseConditionalGroupValues(xml, 'ItemGroup'),
    usesCentralPackageManagement: packageReferencesWithoutVersion.length > 0,
  };
}

function parseSolutionProfile(relativePath: string, raw: string): CSharpSolutionProfile {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const formatVersion = lines[0]?.match(/Format Version\s+([0-9.]+)/i)?.[1];
  const visualStudioVersion = lines
    .find((line) => line.startsWith('VisualStudioVersion'))
    ?.split('=')
    ?.[1]
    ?.trim();
  const minimumVisualStudioVersion = lines
    .find((line) => line.startsWith('MinimumVisualStudioVersion'))
    ?.split('=')
    ?.[1]
    ?.trim();
  const projectEntries: CSharpSolutionProjectEntry[] = [];
  for (const line of lines) {
    const match = line.match(
      /^Project\(".*?"\)\s*=\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\s*$/
    );
    if (!match) {
      continue;
    }
    const [, name, projectPath, projectGuid] = match;
    if (!projectPath.toLowerCase().endsWith('.csproj')) {
      continue;
    }
    projectEntries.push({
      name: name.trim(),
      projectPath: toPosix(projectPath.trim()),
      projectGuid: projectGuid.trim(),
    });
  }
  const projectCount = projectEntries.length;
  const configurations = Array.from(
    new Set(
      lines
        .filter((line) => /=\s*(Debug|Release)\|/i.test(line))
        .map((line) => line.split('=')[0].trim())
    )
  );

  return {
    relativePath,
    formatVersion,
    visualStudioVersion,
    minimumVisualStudioVersion,
    projectCount,
    configurations,
    projectEntries,
  };
}

function parseDirectoryBuildPropsProfile(
  relativePath: string,
  xml: string
): CSharpDirectoryBuildPropsProfile {
  return {
    relativePath,
    nullable: collectXmlFirstValue(xml, 'Nullable'),
    langVersion: collectXmlFirstValue(xml, 'LangVersion'),
    treatWarningsAsErrors: collectXmlFirstValue(xml, 'TreatWarningsAsErrors'),
  };
}

function parseDirectoryPackagesPropsProfile(
  relativePath: string,
  xml: string
): CSharpDirectoryPackagesPropsProfile {
  const packageVersions = Array.from(
    new Set(
      [...xml.matchAll(/<PackageVersion\b([^>]*)\/?>/gi)]
        .map((match) => {
          const include = parseAttribute(match[1], 'Include');
          const version = parseAttribute(match[1], 'Version');
          if (!include || !version) {
            return undefined;
          }
          return `${include}@${version}`;
        })
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right));

  return {
    relativePath,
    managePackageVersionsCentrally: collectXmlFirstValue(xml, 'ManagePackageVersionsCentrally'),
    centralPackageVersions: packageVersions,
  };
}

function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function formatCsprojEvidence(profile: CSharpCsprojProfile): string {
  const tfmLabel = profile.targetFrameworks.length > 0 ? profile.targetFrameworks.join(',') : 'unknown';
  const testTag = profile.isTestProject ? ';test=true' : '';
  const cpmTag = profile.usesCentralPackageManagement ? ';cpm=true' : '';
  const conditionalTag =
    profile.conditionalPropertyGroups.length > 0 || profile.conditionalItemGroups.length > 0
      ? ';conditional=true'
      : '';
  return `${profile.relativePath}#tfm=${tfmLabel}${testTag}${cpmTag}${conditionalTag}`;
}

export function collectCSharpProjectEvidence(repositoryRoot: string): CSharpProjectEvidence {
  const root = path.resolve(repositoryRoot);
  const warnings: string[] = [];
  const solutionProfiles: CSharpSolutionProfile[] = [];
  const csprojProfiles: CSharpCsprojProfile[] = [];
  const directoryBuildPropsProfiles: CSharpDirectoryBuildPropsProfile[] = [];
  const directoryPackagesPropsProfiles: CSharpDirectoryPackagesPropsProfile[] = [];
  let hasCSharpSource = false;

  if (!fs.existsSync(root)) {
    return {
      hasSolution: false,
      hasCsproj: false,
      hasDirectoryBuildProps: false,
      hasDirectoryPackagesProps: false,
      hasCSharpSource: false,
      hasUnityEvidence: false,
      evidence: [],
      solutionProfiles: [],
      csprojProfiles: [],
      directoryBuildPropsProfiles: [],
      directoryPackagesPropsProfiles: [],
      warnings,
    };
  }

  walkFiles(root, (relativePath) => {
    const lower = relativePath.toLowerCase();
    const absolutePath = path.join(root, relativePath);

    if (lower.endsWith('.cs')) {
      hasCSharpSource = true;
    }

    if (lower.endsWith('.sln')) {
      try {
        solutionProfiles.push(parseSolutionProfile(relativePath, readTextFile(absolutePath)));
      } catch (error) {
        warnings.push(
          `${relativePath}: failed to parse solution profile (${error instanceof Error ? error.message : String(error)})`
        );
      }
      return;
    }

    if (lower.endsWith('.csproj')) {
      try {
        csprojProfiles.push(parseCsprojProfile(relativePath, readTextFile(absolutePath)));
      } catch (error) {
        warnings.push(
          `${relativePath}: failed to parse csproj profile (${error instanceof Error ? error.message : String(error)})`
        );
      }
      return;
    }

    if (lower.endsWith('/directory.build.props') || lower === 'directory.build.props') {
      try {
        directoryBuildPropsProfiles.push(
          parseDirectoryBuildPropsProfile(relativePath, readTextFile(absolutePath))
        );
      } catch (error) {
        warnings.push(
          `${relativePath}: failed to parse Directory.Build.props (${error instanceof Error ? error.message : String(error)})`
        );
      }
      return;
    }

    if (lower.endsWith('/directory.packages.props') || lower === 'directory.packages.props') {
      try {
        directoryPackagesPropsProfiles.push(
          parseDirectoryPackagesPropsProfile(relativePath, readTextFile(absolutePath))
        );
      } catch (error) {
        warnings.push(
          `${relativePath}: failed to parse Directory.Packages.props (${error instanceof Error ? error.message : String(error)})`
        );
      }
    }
  });

  const unityProjectVersionPath = path.join(root, 'ProjectSettings', 'ProjectVersion.txt');
  const unityPackagesPath = path.join(root, 'Packages', 'manifest.json');
  const unityAssetsPath = path.join(root, 'Assets');
  const hasUnityEvidence =
    fs.existsSync(unityProjectVersionPath) ||
    fs.existsSync(unityPackagesPath) ||
    fs.existsSync(unityAssetsPath);

  const evidence = Array.from(
    new Set([
      ...solutionProfiles.map((profile) => `${profile.relativePath}#projects=${profile.projectCount}`),
      ...csprojProfiles.map(formatCsprojEvidence),
      ...directoryBuildPropsProfiles.map((profile) => `${profile.relativePath}#props`),
      ...directoryPackagesPropsProfiles.map((profile) => {
        const central = (profile.managePackageVersionsCentrally ?? '').toLowerCase() === 'true';
        return `${profile.relativePath}#central=${central ? 'true' : 'false'};packages=${profile.centralPackageVersions.length}`;
      }),
      ...(hasCSharpSource ? ['*.cs'] : []),
      ...(fs.existsSync(unityProjectVersionPath) ? ['ProjectSettings/ProjectVersion.txt'] : []),
      ...(fs.existsSync(unityPackagesPath) ? ['Packages/manifest.json'] : []),
      ...(fs.existsSync(unityAssetsPath) ? ['Assets/'] : []),
      ...warnings.map((warning) => `warning:${warning}`),
    ])
  );

  return {
    hasSolution: solutionProfiles.length > 0,
    hasCsproj: csprojProfiles.length > 0,
    hasDirectoryBuildProps: directoryBuildPropsProfiles.length > 0,
    hasDirectoryPackagesProps: directoryPackagesPropsProfiles.length > 0,
    hasCSharpSource,
    hasUnityEvidence,
    evidence,
    solutionProfiles,
    csprojProfiles,
    directoryBuildPropsProfiles,
    directoryPackagesPropsProfiles,
    warnings,
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
    confidence = Math.max(confidence, 0.82);
  }
  if (projectEvidence.hasDirectoryPackagesProps) {
    confidence = Math.max(confidence, 0.9);
  }
  if (projectEvidence.csprojProfiles.some((profile) => profile.targetFrameworks.length > 0)) {
    confidence = Math.max(confidence, 0.93);
  }
  if (projectEvidence.hasUnityEvidence) {
    profileId = profileId === 'csharp-unknown' ? 'csharp-unity-profile' : profileId;
    confidence = Math.max(confidence, 0.78);
  }
  if (!projectEvidence.hasCsproj && projectEvidence.warnings.length > 0) {
    confidence = Math.min(confidence, 0.7);
  }

  return {
    languageId: 'csharp',
    profileId,
    confidence,
    evidence,
  };
}
