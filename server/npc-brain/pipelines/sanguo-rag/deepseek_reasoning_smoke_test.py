from __future__ import annotations

import json
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from ollama_reasoning_client import compact_text, extract_json_object, strip_reasoning_tags
from run_deepseek_reasoning_trial import main as run_reasoning_main


class _OllamaReasoningHandler(BaseHTTPRequestHandler):
    request_bodies: list[dict] = []

    def do_POST(self) -> None:  # noqa: N802
        content_length = int(self.headers.get("Content-Length") or "0")
        body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        self.__class__.request_bodies.append(body)
        content = {
            "eventAssessments": [
                {
                    "eventKey": "changban-bridge",
                    "recommendation": "keep",
                    "reasons": ["sourceRefs 與 generalIds 穩定，可保留為 canonical baseline。"],
                    "risks": [],
                    "confidenceAdjustment": 0.0,
                }
            ],
            "genericCandidateAssessments": [
                {
                    "eventKey": "generic-battle-042-p9",
                    "recommendation": "review",
                    "reasons": ["候選有戰事訊號，但事件邊界需要人工確認。"],
                    "missingFields": ["relationshipEdges", "location"],
                }
            ],
            "keywordAssessments": [
                {
                    "keywordKey": "cao-cao",
                    "category": "person",
                    "recommendation": "keep",
                    "uiLabelSuggestion": None,
                    "reasons": ["人物 keyword 來源穩定。"],
                }
            ],
            "pipelineNotes": ["DeepSeek 僅輸出 review hints，不改 canonical artifacts。"],
        }
        response = {
            "model": body.get("model"),
            "done": True,
            "done_reason": "stop",
            "message": {
                "role": "assistant",
                "content": "<think>這段推理不應進入正式 JSON。</think>" + json.dumps(content, ensure_ascii=False),
            },
        }
        encoded = json.dumps(response, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args) -> None:  # noqa: A003
        return


def _write_fixture_inputs(root: Path) -> tuple[Path, Path, Path, Path]:
    events_path = root / "events.jsonl"
    generic_path = root / "generic-battle-candidates.jsonl"
    keyword_path = root / "zhang-fei.keywords.json"
    output_root = root / "deepseek-output"
    event = {
        "eventId": "romance.ch042.changban-bridge",
        "eventKey": "changban-bridge",
        "eventType": "battle",
        "reviewStatus": "ready",
        "generalIds": ["zhang-fei", "cao-cao"],
        "summary": "張飛於長坂橋斷後。",
        "sourceQuote": "張飛據水斷橋，曹軍不敢近。",
        "sourceRefs": ["042#p1"],
        "confidence": 0.9,
    }
    generic = {**event, "eventKey": "generic-battle-042-p9", "reviewStatus": "needs-review", "confidence": 0.62}
    keyword_pack = {
        "generalId": "zhang-fei",
        "keywordVersion": "general_keywords_v1",
        "sourceEventsPath": str(events_path),
        "categories": {
            "person": [{"keywordKey": "cao-cao", "label": "曹操", "category": "person", "sourceRefs": ["042#p1"], "confidence": 0.88}],
            "event": [],
            "location": [],
            "item": [],
            "creature": [],
        },
    }
    events_path.write_text(json.dumps(event, ensure_ascii=False) + "\n", encoding="utf-8")
    generic_path.write_text(json.dumps(generic, ensure_ascii=False) + "\n", encoding="utf-8")
    keyword_path.write_text(json.dumps(keyword_pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return events_path, generic_path, keyword_path, output_root


def main() -> None:
    cleaned, reasoning = strip_reasoning_tags('<think>hidden</think>{"ok": true}')
    assert reasoning == "hidden", reasoning
    assert extract_json_object(cleaned)["ok"] is True, cleaned
    compacted = compact_text("這是一句很長很長的話，後面還有很多內容。", 14)
    assert len(compacted) <= 14 and compacted.endswith("…"), compacted

    server = HTTPServer(("127.0.0.1", 0), _OllamaReasoningHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            events_path, generic_path, keyword_path, output_root = _write_fixture_inputs(Path(temp_dir))
            import sys

            old_argv = sys.argv
            sys.argv = [
                "run_deepseek_reasoning_trial.py",
                "--events", str(events_path),
                "--generic-candidates", str(generic_path),
                "--keyword-pack", str(keyword_path),
                "--output-root", str(output_root),
                "--api-url", f"http://127.0.0.1:{server.server_port}/api/chat",
                "--model", "deepseek-r1:test",
                "--overwrite",
            ]
            try:
                run_reasoning_main()
            finally:
                sys.argv = old_argv
            report = json.loads((output_root / "deepseek-reasoning-report.json").read_text(encoding="utf-8"))
            assert report["canonicalWrites"] is False, report
            assert report["model"] == "deepseek-r1:test", report
            assert report["reasoningTracePreview"] == "這段推理不應進入正式 JSON。", report
            assert report["reasoning"]["genericCandidateAssessments"], report
            assert _OllamaReasoningHandler.request_bodies[0]["format"] == "json"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=1)
    print("[deepseek-reasoning-smoke] PASS")


if __name__ == "__main__":
    main()