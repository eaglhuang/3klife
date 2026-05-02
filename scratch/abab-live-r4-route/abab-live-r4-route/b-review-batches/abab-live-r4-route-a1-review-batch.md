# Progress Advancement B Review Batch

- Run ID: `abab-live-r4-route`
- Source Round ID: `abab-live-r4-route-a1`
- Selected Items: `10` / `10`
- Remaining Items After Batch: `0`
- Pilot Pending Review Count: `4`

## Root Cause Counts

- `identity ambiguity`: `6`
- `event boundary`: `4`

## Decision Contract

請建立 JSON 檔並回傳 `decisions`，格式如下：

```json
{
  "decisions": [
    {
      "candidateId": "candidate-id",
      "answer": "B",
      "notes": "保留，但需補 location 與 relationshipEdges。",
      "edits": {
        "location": "來源片語",
        "relationshipEdges": []
      }
    }
  ]
}
```

## Review Items

| General | Event Key | Candidate ID | Answer | Root Cause | Missing Fields | Source Refs |
|---|---|---|---|---|---|---|
| li-dian | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.0878` | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.0878` | `B` | `identity ambiguity` | `-` | `012#p13` |
| li-dian | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.0985` | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.0985` | `B` | `identity ambiguity` | `-` | `012#p13` |
| li-dian | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.1095` | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.1095` | `B` | `identity ambiguity` | `-` | `012#p13` |
| li-dian | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.1205` | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.1205` | `B` | `identity ambiguity` | `-` | `012#p13` |
| li-dian | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.1316` | `repair.abab-live-r4-route-a1.li-dian.generic-battle-012-p13.1316` | `B` | `identity ambiguity` | `-` | `012#p13` |
| xiahou-dun | `repair.abab-live-r4-route-a1.xiahou-dun.generic-battle-012-p13.1351` | `repair.abab-live-r4-route-a1.xiahou-dun.generic-battle-012-p13.1351` | `B` | `identity ambiguity` | `-` | `012#p13` |
| xiahou-dun | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0422` | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0422` | `B` | `event boundary` | `-` | `016#p17` |
| xiahou-dun | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0488` | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0488` | `B` | `event boundary` | `-` | `016#p17` |
| xiahou-dun | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0554` | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0554` | `B` | `event boundary` | `-` | `016#p17` |
| xiahou-dun | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0640` | `repair.abab-live-r4-route-a1.xu-zhu.generic-battle-016-p17.0640` | `B` | `event boundary` | `-` | `016#p17` |
