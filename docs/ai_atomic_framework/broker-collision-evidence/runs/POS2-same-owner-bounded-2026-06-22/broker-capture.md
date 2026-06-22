# Broker Capture Evidence Bundle

- Scan at: 2026-06-22T07:25:20.866Z
- Total runs: 4
- Total tasks: 2

## Run Index
| runId | planId | scenario | tasks | actors | vendor | lane | verdict | files | identities | commits | transactions | evidence | missingFields |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| team-179057e64770 | TASK-PAPER-HOTFILE-POS2-B | field | TASK-PAPER-HOTFILE-POS2-B | bench:PAPER-HOTFILE-POS:TASK-PAPER-HOTFILE-POS2-B:claude-opus47 | team-broker-lane | deterministic-composer:composer-routed | blocked-active-lease:composer-routed | packages/cli/src/commands/broker.ts | n/a | 51dd72a70c835cad57786607fe7ad733655286d0 | decision-1782110775031,decision-1782112902044,txn-ebdd0d9bf39b3af9 | C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-179057e64770.json | ok |
| team-57c001e46b4d | TASK-PAPER-HOTFILE-POS2-B | field | TASK-PAPER-HOTFILE-POS2-B | bench:PAPER-HOTFILE-POS:TASK-PAPER-HOTFILE-POS2-B:claude-opus47 | team-broker-lane | direct-brokered | parallel-safe | packages/cli/src/commands/broker.ts | n/a | 604bb28e6c44cc0520a32ed9f06ca7c301ac915a | decision-1782106881632 | C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-57c001e46b4d.json | ok |
| team-68e022e8dc82 | TASK-PAPER-HOTFILE-POS2-A | field | TASK-PAPER-HOTFILE-POS2-A | bench:PAPER-HOTFILE-POS:TASK-PAPER-HOTFILE-POS2-A:codex-gpt54mini | team-broker-lane | direct-brokered:provisional-write-lease | needs-physical-split:provisional-write-lease | packages/cli/src/commands/broker.ts | n/a | 51dd72a70c835cad57786607fe7ad733655286d0 | decision-1782110584126,decision-1782112902044,txn-72379f90f4d18809 | C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-68e022e8dc82.json | ok |
| team-f45c51bc3f92 | TASK-PAPER-HOTFILE-POS2-A | field | TASK-PAPER-HOTFILE-POS2-A | bench:PAPER-HOTFILE-POS:TASK-PAPER-HOTFILE-POS2-A:codex-gpt54mini | team-broker-lane | deterministic-composer | needs-physical-split | packages/cli/src/commands/broker.ts | n/a | 604bb28e6c44cc0520a32ed9f06ca7c301ac915a | decision-1782106918142 | C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-f45c51bc3f92.json | ok |

## Task Artifact Index
| taskId | closurePacket | teamRuns |
| --- | --- | --- |
| TASK-PAPER-HOTFILE-POS2-A | n/a | C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-68e022e8dc82.json;C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-f45c51bc3f92.json |
| TASK-PAPER-HOTFILE-POS2-B | n/a | C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-179057e64770.json;C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-57c001e46b4d.json |
