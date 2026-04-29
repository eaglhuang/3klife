from __future__ import annotations

import json
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from enrich_event_review_context import main as enrich_context_main


class _ReasoningHandler(BaseHTTPRequestHandler):
    request_bodies: list[dict] = []

    def do_POST(self) -> None:  # noqa: N802
        content_length = int(self.headers.get("Content-Length") or "0")
        body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        self.__class__.request_bodies.append(body)
        response_content = {
            "answers": [
                {
                    "eventKey": "generic-battle-003-p2",
                    "recommendedAnswer": "A",
                    "confidence": 0.86,
                    "edits": {
                        "eventKey": "lu-bu-confronts-dong-zhuo",
                        "summary": "呂布隨丁原出戰，迫使董卓敗退。",
                        "location": "洛陽城外",
                        "relationshipEdges": [
                            {
                                "fromId": "lu-bu",
                                "toId": "dong-zhuo",
                                "type": "confronts",
                                "evidenceRefs": ["003#p2"],
                                "edgeConfidence": 0.86,
                                "edgeStrength": 0.72,
                            }
                        ],
                        "moodTags": ["battle", "bravery"],
                    },
                    "reasons": ["上下文補足了交戰對象與地點。"],
                    "risks": [],
                }
            ],
            "pipelineNotes": ["只產生 review proposal，不寫 canonical。"],
        }
        payload = {
            "model": body.get("model"),
            "done": True,
            "done_reason": "stop",
            "message": {"role": "assistant", "content": "<think>hidden</think>" + json.dumps(response_content, ensure_ascii=False)},
        }
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args) -> None:  # noqa: A003
        return


def main() -> None:
    server = HTTPServer(("127.0.0.1", 0), _ReasoningHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            chapters_root = root / "chapters"
            chapters_root.mkdir(parents=True)
            (chapters_root / "003.md").write_text(
                "# 第三回\n\n"
                "董卓屯兵城外，眾人皆懼。\n\n"
                "卓怒，引軍同李儒出迎。兩陣對圓，只見呂布隨丁原出到陣前，董卓慌走。\n\n"
                "卓兵大敗，退三十餘里下寨。\n",
                encoding="utf-8",
            )
            answers_path = root / "event-review-answers.lu-bu.todo.json"
            answers_path.write_text(json.dumps({
                "version": "1.0.0",
                "canonicalWrites": False,
                "questions": [
                    {
                        "candidateId": "romance.generic-battle.003-p2",
                        "eventKey": "generic-battle-003-p2",
                        "chapterNo": 3,
                        "sourceRefs": ["003#p2"],
                        "generalIds": ["lu-bu", "dong-zhuo"],
                        "summary": "第 3 回偵測到戰事候選段落。",
                        "sourceQuote": "呂布隨丁原出到陣前。",
                        "missingFields": ["location", "relationshipEdges"],
                        "answer": None,
                        "edits": {"eventKey": None, "summary": None, "location": None, "relationshipEdges": [], "moodTags": []},
                    }
                ],
            }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

            old_argv = sys.argv
            sys.argv = [
                "enrich_event_review_context.py",
                "--answers", str(answers_path),
                "--chapters-root", str(chapters_root),
                "--output-root", str(root / "out"),
                "--api-url", f"http://127.0.0.1:{server.server_port}/api/chat",
                "--model", "deepseek-r1:test",
                "--fill-answers",
                "--overwrite",
            ]
            try:
                enrich_context_main()
            finally:
                sys.argv = old_argv

            enriched_path = root / "out" / "event-review-answers.lu-bu.enriched.todo.json"
            report_path = root / "out" / "event-review-context.lu-bu-report.json"
            enriched = json.loads(enriched_path.read_text(encoding="utf-8"))
            report = json.loads(report_path.read_text(encoding="utf-8"))
            question = enriched["questions"][0]
            assert question["answer"] == "A", question
            assert question["edits"]["location"] == "洛陽城外", question
            assert question["edits"]["relationshipEdges"], question
            assert report["canonicalWrites"] is False, report
            assert report["reasoningTracePreview"] == "hidden", report
            assert _ReasoningHandler.request_bodies[0]["format"] == "json"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=1)
    print("[event-review-context-enrichment-smoke] PASS")


if __name__ == "__main__":
    main()