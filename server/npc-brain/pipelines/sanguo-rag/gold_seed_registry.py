from __future__ import annotations


GOLD_SEED_BATTLE_SPECS = [
    {
        "eventId": "romance.ch042.zhang-fei.changban-bridge",
        "chapterNo": 42,
        "eventKey": "changban-bridge",
        "summary": "張飛據長坂橋斷後，以大喝震懾曹軍，為劉備爭取退走時間。",
        "sourceRefs": ["042#p1", "042#p2", "042#p3", "042#p4", "042#p6", "042#p7"],
        "requiredParticipants": ["cao-cao", "liu-bei", "zhang-fei"],
        "preferredQuoteTerms": ["蛇矛", "立馬", "橋"],
        "fallbackLocation": "長坂橋",
        "relationshipEdges": [
            {"fromId": "zhang-fei", "toId": "cao-cao", "type": "intimidates", "edgeConfidence": 0.9},
            {"fromId": "zhang-fei", "toId": "liu-bei", "type": "protects", "edgeConfidence": 0.86},
        ],
        "moodTags": ["bold", "loyal", "intimidating"],
    }
]