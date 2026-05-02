# Knowledge Growth Round Batch Report

- Round ID: `abab-live-r4-route-a1`
- Generated At: `2026-05-02T04:55:26+00:00`
- Canonical Writes: `False`
- Cohort Size: `5`
- Prompt Only: `False`

## Results

| General | Status | Generic | Original ABCD | Enriched ABCD | Raw Errors |
|---|---|---:|---|---|---:|
| `cao-cao` cao-cao | `live-candidate` | 1285 | `{'A': 5}` | `{'A': 5}` | 0 parsed=1 |
| `xiahou-dun` xiahou-dun | `live-candidate` | 855 | `{'A': 5}` | `{'B': 5}` | 0 parsed=1 |
| `liu-bei` liu-bei | `live-candidate` | 792 | `{'A': 5}` | `{'A': 5}` | 0 parsed=1 |
| `li-dian` li-dian | `live-candidate` | 705 | `{'A': 5}` | `{'B': 5}` | 0 parsed=1 |
| `zhang-fei` zhang-fei | `live-candidate` | 423 | `{'A': 5}` | `{'A': 5}` | 0 parsed=1 |

## Optimization Notes

- 仍有 B 題，下一輪應強化 location terms、人物 alias 與 relationship verb pattern。
- 已產生 A 題，可進入人工 review/apply script，而不是手改 canonical events。
- Round 1 優先目標維持 relationshipEdges 與 location，先讓 battle candidates 從 B 轉 A，再擴 affect/talent/work。
