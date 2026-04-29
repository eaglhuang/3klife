from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from generate_event_review_choices import main as generate_choices_main


def main() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        candidates_path = root / "generic.jsonl"
        reasoning_path = root / "deepseek-report.json"
        output_root = root / "review"
        candidate = {
            "eventId": "romance.generic-battle.003-p13",
            "chapterNo": 3,
            "eventKey": "generic-battle-003-p13",
            "eventType": "battle-candidate",
            "generalIds": ["lu-bu", "dong-zhuo"],
            "location": None,
            "summary": "第 3 回偵測到戰事候選段落。",
            "sourceQuote": "呂布頂束髮金冠，披百花戰袍。",
            "relationshipEdges": [],
            "confidence": 0.78,
            "sourceRefs": ["003#p13"],
            "reviewStatus": "needs-review",
        }
        candidates_path.write_text(json.dumps(candidate, ensure_ascii=False) + "\n", encoding="utf-8")
        reasoning_path.write_text(json.dumps({
            "reasoning": {
                "genericCandidateAssessments": [
                    {
                        "eventKey": "generic-battle-003-p13",
                        "recommendation": "accept",
                        "reasons": ["候選可接受，但仍可補關係 edge。"],
                        "missingFields": ["relationshipEdges"],
                    }
                ]
            }
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        old_argv = sys.argv
        sys.argv = [
            "generate_event_review_choices.py",
            "--candidates", str(candidates_path),
            "--reasoning-report", str(reasoning_path),
            "--output-root", str(output_root),
            "--general-id", "lu-bu",
            "--overwrite",
        ]
        try:
            generate_choices_main()
        finally:
            sys.argv = old_argv

        payload = json.loads((output_root / "event-review-answers.lu-bu.todo.json").read_text(encoding="utf-8"))
        assert payload["canonicalWrites"] is False, payload
        assert len(payload["questions"]) == 1, payload
        assert payload["questions"][0]["suggestedAnswer"] == "B", payload
        assert "relationshipEdges" in payload["questions"][0]["missingFields"], payload
        assert (output_root / "event-review-choices.lu-bu.md").exists()
    print("[event-review-choices-smoke] PASS")


if __name__ == "__main__":
    main()