import type { OperationalBenchProfile, OperationalBenchScenario } from './types.ts';

export const operationalBenchProfiles: Record<string, OperationalBenchProfile> = {
  smoke: {
    name: 'smoke',
    warmup: 2,
    repeat: 10,
    concurrency: [1, 5]
  },
  paper: {
    name: 'paper',
    warmup: 10,
    repeat: 100,
    concurrency: [1, 5, 10, 20]
  },
  extended: {
    name: 'extended',
    warmup: 20,
    repeat: 300,
    concurrency: [1, 5, 10, 20, 50]
  }
};

export const operationalBenchScenarios: readonly OperationalBenchScenario[] = [
  {
    id: 'different-file',
    track: 'broker-admission',
    title: 'Broker admission for disjoint different-file writes',
    route: 'direct-brokered',
    blockedCategory: 'none',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Measures direct admission when files and semantic resources are disjoint.']
  },
  {
    id: 'same-file-bounded-disjoint',
    track: 'broker-admission',
    title: 'Broker admission for same-file bounded disjoint regions',
    route: 'deterministic-composer',
    blockedCategory: 'serialization',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Same-file work is routed to composer instead of unsafe direct apply.']
  },
  {
    id: 'shared-surface-conflict',
    track: 'broker-admission',
    title: 'Broker admission for shared validator/generator surface conflict',
    route: 'blocked-before-write',
    blockedCategory: 'refinement',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Shared non-file surfaces fail closed before mutation.']
  },
  {
    id: 'read-write-dependency',
    track: 'broker-admission',
    title: 'Broker admission for active read-set versus write dependency',
    route: 'blocked-before-write',
    blockedCategory: 'refinement',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Read/write dependency is blocked before unsafe parallel apply.']
  },
  {
    id: 'allow-remote-local-disjoint',
    track: 'git-boundary',
    title: 'Git boundary dry-run permits disjoint remote/local changes',
    route: 'direct-brokered',
    blockedCategory: 'none',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Synthetic Git dry-run builds local and remote mutation surfaces.']
  },
  {
    id: 'block-same-record-conflict',
    track: 'git-boundary',
    title: 'Git boundary dry-run blocks same-record conflict',
    route: 'blocked-before-write',
    blockedCategory: 'refinement',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Same logical record collision is blocked before push.']
  },
  {
    id: 'composer-disjoint-records',
    track: 'git-boundary',
    title: 'Git boundary dry-run routes disjoint same-file records to composer',
    route: 'deterministic-composer',
    blockedCategory: 'serialization',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Same file can remain routable when record surfaces are disjoint.']
  },
  {
    id: 'recover-block-non-fast-forward',
    track: 'git-boundary',
    title: 'CAS mismatch recovery blocks non-fast-forward same-record conflict',
    route: 'rebase-replay',
    blockedCategory: 'rebase-replay',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Post-push-fail routing recommends rebase/replay rather than direct force.']
  },
  {
    id: 'recover-composer-non-fast-forward',
    track: 'git-boundary',
    title: 'CAS mismatch recovery routes non-fast-forward disjoint records to composer',
    route: 'deterministic-composer',
    blockedCategory: 'rebase-replay',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Post-push-fail route preserves intent and keeps composer path available.']
  },
  {
    id: 'serial-queue',
    track: 'recovery-routing',
    title: 'Recovery routing under serialized queue contention',
    route: 'neutral-steward',
    blockedCategory: 'queue',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: true,
    fullRegenerationObserved: null,
    notes: ['Measures queue wait separately from decision and steward planning.']
  },
  {
    id: 'steward-review',
    track: 'recovery-routing',
    title: 'Recovery routing through steward review',
    route: 'neutral-steward',
    blockedCategory: 'steward-review',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Steward dry-run is measured independently from apply.']
  },
  {
    id: 'rebase-replay',
    track: 'recovery-routing',
    title: 'Recovery routing through rebase replay',
    route: 'rebase-replay',
    blockedCategory: 'rebase-replay',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['CAS mismatch recovery routing is measured without external push.']
  },
  {
    id: 'refinement-needed',
    track: 'recovery-routing',
    title: 'Recovery routing that asks for bounded refinement',
    route: 'refinement-needed',
    blockedCategory: 'refinement',
    preservedIntent: true,
    terminalFailClosed: false,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Intent is preserved while asking for narrower evidence.']
  },
  {
    id: 'terminal-insufficient-evidence',
    track: 'recovery-routing',
    title: 'Terminal fail-closed route for insufficient evidence',
    route: 'terminal-fail-closed',
    blockedCategory: 'terminal-fail-closed',
    preservedIntent: false,
    terminalFailClosed: true,
    overSerialized: false,
    fullRegenerationObserved: null,
    notes: ['Fail-closed means no unsafe direct or parallel apply; the intent is not silently discarded.']
  }
];
