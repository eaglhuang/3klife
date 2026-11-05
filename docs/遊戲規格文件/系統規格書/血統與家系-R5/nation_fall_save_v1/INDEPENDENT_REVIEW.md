<!-- doc_id: doc_spec_0299 -->
# Independent review

Fixed 106f053db7b7d7af8d800722158c4a35bb65d3aa. The original catalog fixtures were independently compared field-for-field: only age, maximum lifespan, vitality and maximum vitality differ from catalog entries. Combat stats are unchanged. Ownership/enrollment is an explicit fixture, not an acquisition test. Natural original advances reach season 11; no territory, fallen, war, ally or clock fields are fabricated.

The original registered Campaign consumer defeats lvbu with its remaining territory. The actual two committed payloads differ: both contain gold 891, but the first has one territory and no battle snapshot; the second has zero territories and one battle snapshot plus an additional journal entry. Campaign completion and new-instance readback agree. This is observed Memory scheduling, not proof of atomicity under other I/O schedules; no campaign fault was injected.

Original season 12 marks the zero-territory nation fallen, clears atWar and leaves allied false. It had already been false, so this does not prove dissolution of an existing alliance. Troops continue growing from 6779 to 7318 before the fall resolver. The concurrent original raid consumes 373 food and 150 troops from actual resolver inputs 3731 and 3000. The observed result is 3358 food, 2850 troops and unchanged gold 891.

The selected OfficerHud notice listener is registered before the selected rival-diplomacy listener, matching original Lobby start order. This correction was made before final replay. Save completion precedes SeasonAdvanced; the fall and raid messages precede the other selected listener's season/governance messages. Captured SHOW_TOAST emissions do not prove visible UI.

In the before-write fault case, live state reaches season 12 but primary and backup remain season 11 after the successful campaign. New-instance continuation from stored season 11 and continuation of the live instance to season 13 use isolated adapters. Both successful continuations have actual additional readbacks. The live continuation emits retained notices but does not repeat the season-12 raid. Failed save is not assumed to mean rollback or guaranteed message redelivery.

Independent source proof and exact external replay passed. Six negative controls reject changed consumer source, extra file, resealed changed source with updated declared hashes, existing output, package output and symlink output ancestor. There are two gameplay groups, 211 bound source files, 153 loaded full modules and three AST source files. Source/module counts are not branch totals.

The source explicitly labels zero territories as a provisional fall condition and says mercenary transfer is not wired. Its fall notification claiming remnants enter the market is text, not evidence of that transition. Full UI, acquisition, betrayal, alliance true-to-false, campaign failure, after-write failure, real storage/process crash and race conditions remain untested. Observation wrappers retain original returned promises but attach handlers; they do not prove host unhandled-rejection behavior. No prior delivered package or product source was changed.
