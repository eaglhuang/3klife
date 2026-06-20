export type TeamVendorId =
  | 'openai'
  | 'azure-openai'
  | 'claude-code'
  | 'gemini'
  | 'microsoft-foundry'
  | (string & {});

export type TeamRuntimeMode = 'real-agent' | 'editor-subagent' | 'broker-only';

export type TeamExecutionSurface =
  | 'agent-runtime'
  | 'editor-subagent'
  | 'broker-governance';

export type TeamPermissionDecision = 'allow' | 'deny' | 'escalate';

export interface TeamArtifactRecord {
  readonly artifactId: string;
  readonly artifactKind: string;
  readonly producerRole: string;
  readonly producedAt: string;
  readonly path?: string | null;
  readonly metadata?: Record<string, unknown>;
}

export interface TeamAgentIntegrationConfigRef {
  readonly providerId: TeamVendorId;
  readonly configRoot: string;
  readonly defaultsPath?: string | null;
  readonly rolePolicyPath?: string | null;
}

export interface TeamRoleProviderPreference {
  readonly role: string;
  readonly providerId: TeamVendorId;
  readonly sdkId: string;
  readonly modelId?: string | null;
  readonly runtimeMode?: TeamRuntimeMode;
  readonly capabilityTags?: readonly string[];
}

export interface TeamProviderSelectionPolicy {
  readonly schemaId: 'atm.teamProviderSelectionPolicy.v1';
  readonly defaultProviderId: TeamVendorId;
  readonly defaultSdkId: string;
  readonly defaultModelId?: string | null;
  readonly roleOverrides: readonly TeamRoleProviderPreference[];
}

export interface TeamPermissionCheckInput {
  readonly teamRunId: string;
  readonly taskId: string;
  readonly role: string;
  readonly providerId: TeamVendorId;
  readonly sdkId: string;
  readonly requestedActions: readonly string[];
  readonly requestedPaths: readonly string[];
  readonly requestedTools: readonly string[];
}

export interface TeamPermissionCheckResult {
  readonly decision: TeamPermissionDecision;
  readonly grantedActions: readonly string[];
  readonly deniedActions: readonly string[];
  readonly reason: string;
}

export interface TeamPermissionBroker {
  authorize(input: TeamPermissionCheckInput): Promise<TeamPermissionCheckResult>;
}

export interface TeamObservabilityEvent {
  readonly schemaId: 'atm.teamAgentObservabilityEvent.v1';
  readonly eventId: string;
  readonly timestamp: string;
  readonly teamRunId: string;
  readonly taskId: string;
  readonly role: string;
  readonly providerId: TeamVendorId;
  readonly sdkId: string;
  readonly modelId?: string | null;
  readonly runtimeMode: TeamRuntimeMode;
  readonly executionSurface: TeamExecutionSurface;
  readonly sessionId?: string | null;
  readonly stepId?: string | null;
  readonly actionType: string;
  readonly toolName?: string | null;
  readonly permissionDecision?: TeamPermissionDecision | null;
  readonly artifactIds?: readonly string[];
  readonly tokenUsage?: {
    readonly input?: number;
    readonly output?: number;
    readonly total?: number;
  };
  readonly latencyMs?: number | null;
  readonly costHint?: number | null;
  readonly result: 'ok' | 'failed' | 'cancelled' | 'escalated';
  readonly errorCode?: string | null;
  readonly metadata?: Record<string, unknown>;
}

export interface TeamObservabilityEventQuery {
  readonly taskId?: string;
  readonly teamRunId?: string;
  readonly providerId?: TeamVendorId;
  readonly sdkId?: string;
  readonly role?: string;
  readonly artifactId?: string;
}

export interface TeamObservabilitySink {
  record(event: TeamObservabilityEvent): Promise<void>;
  query(filter: TeamObservabilityEventQuery): Promise<readonly TeamObservabilityEvent[]>;
}

export interface TeamWorkerLaunchRequest {
  readonly teamRunId: string;
  readonly taskId: string;
  readonly role: string;
  readonly runtimeMode: TeamRuntimeMode;
  readonly providerId: TeamVendorId;
  readonly sdkId: string;
  readonly modelId?: string | null;
  readonly instructions: string;
  readonly allowedFiles: readonly string[];
  readonly artifactInputs: readonly TeamArtifactRecord[];
  readonly requiredArtifacts: readonly string[];
  readonly integrationConfig: TeamAgentIntegrationConfigRef;
}

export interface TeamWorkerLaunchResult {
  readonly sessionId: string;
  readonly executionSurface: TeamExecutionSurface;
  readonly accepted: boolean;
  readonly artifactOutputs: readonly TeamArtifactRecord[];
  readonly findings: readonly string[];
}

export interface TeamAgentProviderCapabilities {
  readonly supportsRuntimeModes: readonly TeamRuntimeMode[];
  readonly supportsStreaming: boolean;
  readonly supportsStructuredOutputs: boolean;
  readonly supportsToolCalls: boolean;
  readonly supportsEditorBridge: boolean;
  readonly supportsHostedAgentReference: boolean;
}

export interface TeamAgentProvider {
  readonly providerId: TeamVendorId;
  readonly sdkId: string;
  readonly capabilities: TeamAgentProviderCapabilities;
  createSession(input: TeamWorkerLaunchRequest): Promise<{ sessionId: string }>;
  runStep(input: TeamWorkerLaunchRequest & { sessionId: string }): Promise<TeamWorkerLaunchResult>;
  cancelSession(input: { sessionId: string; reason?: string }): Promise<void>;
}
