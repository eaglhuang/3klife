import type {
  RuntimeCommandEntry,
  RuntimeCommandReport,
  RuntimeCommandRequest,
} from '../../../plugin-sdk/src/language-adapter';
import { detectCSharpProjectProfile } from './csharp-profile';

function buildAdvisoryCommands(profileEvidence: readonly string[]): RuntimeCommandEntry[] {
  const preferredTarget =
    profileEvidence.find((entry) => entry.toLowerCase().endsWith('.sln')) ??
    profileEvidence.find((entry) => entry.toLowerCase().endsWith('.csproj')) ??
    '.';

  return [
    {
      commandId: 'csharp-dotnet-restore',
      command: `dotnet restore ${preferredTarget}`,
      category: 'restore-advisory',
      mutates: false,
      confidence: 0.85,
    },
    {
      commandId: 'csharp-dotnet-build',
      command: `dotnet build ${preferredTarget} --no-restore`,
      category: 'build-advisory',
      mutates: false,
      confidence: 0.85,
    },
    {
      commandId: 'csharp-dotnet-test',
      command: `dotnet test ${preferredTarget} --no-build`,
      category: 'test-advisory',
      mutates: false,
      confidence: 0.8,
    },
    {
      commandId: 'csharp-dotnet-format',
      command: `dotnet format ${preferredTarget} --verify-no-changes`,
      category: 'diagnostics-advisory',
      mutates: false,
      confidence: 0.72,
    },
  ];
}

export async function detectCSharpRuntimeCommands(
  request: RuntimeCommandRequest
): Promise<RuntimeCommandReport> {
  const profile = detectCSharpProjectProfile(request.repositoryRoot);
  const commands = buildAdvisoryCommands(profile.evidence ?? []);
  return {
    commands,
    warnings: [
      'advisory commands only: C# adapter does not execute dotnet/msbuild in this stage',
      'runtime command detection remains non-executing and fixture-backed',
    ],
  };
}
