from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from run_etl_quality_pilot import main as run_pilot_main


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        events_path = root / "events.jsonl"
        generic_path = root / "generic.jsonl"
        generals_path = root / "generals.json"
        manual_roster_path = root / "manual-roster.json"
        output_root = root / "pilot"

        event = {
            "eventId": "romance.ch042.changban-bridge",
            "chapterNo": 42,
            "eventKey": "changban-bridge",
            "eventType": "battle",
            "generalIds": ["zhang-fei", "cao-cao"],
            "location": "長坂橋",
            "summary": "張飛於長坂橋斷後。",
            "sourceQuote": "張飛據水斷橋，曹軍不敢近。",
            "relationshipEdges": [{"fromId": "zhang-fei", "toId": "cao-cao", "type": "confronts", "evidenceRefs": ["042#p1"], "edgeConfidence": 0.9}],
            "moodTags": ["豪烈"],
            "confidence": 0.9,
            "sourceRefs": ["042#p1"],
            "reviewStatus": "ready",
        }
        generic = {**event, "eventKey": "generic-battle-042-p9", "reviewStatus": "needs-review"}
        events_path.write_text(json.dumps(event, ensure_ascii=False) + "\n", encoding="utf-8")
        generic_path.write_text(json.dumps(generic, ensure_ascii=False) + "\n", encoding="utf-8")
        write_json(generals_path, [
            {"id": "zhang-fei", "name": "張飛", "faction": "shu", "rarityTier": "legendary", "characterCategory": "famed", "stats": {"str": 95}},
            {"id": "cao-cao", "name": "曹操", "faction": "wei", "rarityTier": "legendary", "characterCategory": "titled", "stats": {"int": 92}},
            {"id": "cold-general", "name": "冷門將", "faction": "neutral", "rarityTier": "common", "characterCategory": "minor", "stats": {}},
        ])
        write_json(manual_roster_path, {"entries": []})

        old_argv = sys.argv
        sys.argv = [
            "run_etl_quality_pilot.py",
            "--events", str(events_path),
            "--generic-candidates", str(generic_path),
            "--generals", str(generals_path),
            "--manual-roster", str(manual_roster_path),
            "--output-root", str(output_root),
            "--general-id", "zhang-fei",
            "--general-id", "cold-general",
            "--overwrite",
        ]
        try:
            run_pilot_main()
        finally:
            sys.argv = old_argv

        report = json.loads((output_root / "etl-quality-pilot-report.json").read_text(encoding="utf-8"))
        assert report["canonicalWrites"] is False, report
        assert len(report["generals"]) == 2, report
        by_id = {row["generalId"]: row for row in report["generals"]}
        assert by_id["zhang-fei"]["status"] in {"ready-for-dialogue-smoke", "thin-but-testable"}, by_id
        assert by_id["cold-general"]["status"] == "needs-etl-evidence", by_id
        assert (output_root / "keyword-options" / "zhang-fei.keywords.json").exists()
        assert (output_root / "review-queue.todo.json").exists()
    print("[etl-quality-pilot-smoke] PASS")


if __name__ == "__main__":
    main()