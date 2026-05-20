import type {
  RuntimeCommandEntry,
  RuntimeCommandReport,
  RuntimeCommandRequest,
} from '../../../plugin-sdk/src/language-adapter';
import { collectCSharpProjectEvidence } from './csharp-profile';

function toPosix(value: string): string {
  return value.replace(/\\/g, '/');
}

function quoteTarget(target: string): string {
  const normalized = toPosix(target).trim();
  if (!normalized) {
    return '.';
  }
  return /\s/.test(normalized) ? `"${normalized}"` : normalized;
}

interface RuntimeTargetSet {
  primaryTarget: string;
  testTarget?: string;
  evidenceLabel: string;
}

function pickRuntimeTargets(repositoryRoot: string): RuntimeTargetSet {
  const evidence = collectCSharpProjectEvidence(repositoryRoot);
  const primarySolution = evidence.solutionProfiles
    .map((profile) => profile.relativePath)
    .sort((left, right) => left.localeCompare(right))[0];
  if (primarySolution) {
    return {
      primaryTarget: primarySolution,
      evidenceLabel: `solution:${primarySolution}`,
    };
  }

  const sortedProjects = evidence.csprojProfiles
    .map((profile) => profile.relativePath)
    .sort((left, right) => left.localeCompare(right));
  const testProject = evidence.csprojProfiles
    .filter((profile) => profile.isTestProject)
    .map((profile) => profile.relativePath)
    .sort((left, right) => left.localeCompare(right))[0];
  const primaryProject =
    sortedProjects.find((relativePath) => relativePath !== testProject) ?? sortedProjects[0];
  if (primaryProject) {
    return {
      primaryTarget: primaryProject,
      testTarget: testProject,
      evidenceLabel: `csproj:${primaryProject}`,
    };
  }

  return {
    primaryTarget: '.',
    evidenceLabel: 'workspace:.',
  };
}

function buildBaseCommands(targets: RuntimeTargetSet): RuntimeCommandEntry[] {
  const primary = quoteTarget(targets.primaryTarget);
  const testTarget = quoteTarget(targets.testTarget ?? targets.primaryTarget);
  return [
    {
      commandId: 'csharp-dotnet-restore',
      command: `dotnet restore ${primary}`,
      category: 'restore-advisory',
      mutates: false,
      confidence: 0.92,
    },
    {
      commandId: 'csharp-dotnet-build',
      command: `dotnet build ${primary} --no-restore`,
      category: 'build-advisory',
      mutates: false,
      confidence: 0.92,
    },
    {
      commandId: 'csharp-dotnet-test',
      command: `dotnet test ${testTarget} --no-build`,
      category: 'test-advisory',
      mutates: false,
      confidence: 0.9,
    },
    {
      commandId: 'csharp-dotnet-publish',
      command: `dotnet publish ${primary} --no-build`,
      category: 'publish-advisory',
      mutates: false,
      confidence: 0.84,
    },
    {
      commandId: 'csharp-dotnet-format',
      command: `dotnet format ${primary} --verify-no-changes`,
      category: 'diagnostics-advisory',
      mutates: false,
      confidence: 0.82,
    },
  ];
}

function buildRiskyCommands(targets: RuntimeTargetSet): RuntimeCommandEntry[] {
  const primary = quoteTarget(targets.primaryTarget);
  return [
    {
      commandId: 'csharp-dotnet-clean',
      command: `dotnet clean ${primary}`,
      category: 'cleanup-risky',
      mutates: true,
      confidence: 0.76,
    },
    {
      commandId: 'csharp-dotnet-workload-restore',
      command: 'dotnet workload restore',
      category: 'workload-risky',
      mutates: true,
      confidence: 0.72,
    },
  ];
}

function dedupeAndSortCommands(commands: readonly RuntimeCommandEntry[]): RuntimeCommandEntry[] {
  const byKey = new Map<string, RuntimeCommandEntry>();
  for (const command of commands) {
    const key = `${command.commandId}|${command.command}|${command.category}|${command.mutates}`;
    if (!byKey.has(key)) {
      byKey.set(key, command);
    }
  }
  return Array.from(byKey.values()).sort((left, right) =>
    left.commandId.localeCompare(right.commandId)
  );
}

export async function detectCSharpRuntimeCommands(
  request: RuntimeCommandRequest
): Promise<RuntimeCommandReport> {
  const targets = pickRuntimeTargets(request.repositoryRoot);
  const commands = [
    ...buildBaseCommands(targets),
    ...((request.includeRisky ?? false) ? buildRiskyCommands(targets) : []),
  ];
  const sorted = dedupeAndSortCommands(commands);
  const warnings = [
    `runtime command target selected from ${targets.evidenceLabel}`,
    'advisory commands only: C# adapter does not execute dotnet/msbuild in this stage',
    ...(request.includeRisky ?? false)
      ? ['risky command variants are listed for planning only and remain non-executing']
      : [],
  ];
  return {
    commands: sorted,
    warnings,
  };
}
