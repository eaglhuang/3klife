from __future__ import annotations

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from .llm_dialogue_renderer import GeminiDialogueProvider
from .npc_dialogue_service import DialogueRequest, NpcDialogueService


_ENV_KEYS = [
    "NPC_LLM_PROVIDER_ORDER",
    "NPC_LLM_MOCK_TEXT",
    "NPC_LLM_LOCAL_LLAMA_API_URL",
    "NPC_LLM_MODEL_LOCAL_LLAMA",
    "NPC_LLM_LOCAL_LLAMA_TIMEOUT_MS",
    "NPC_LLM_HISTORY_CACHE_PATH",
]


class _LocalLlamaHandler(BaseHTTPRequestHandler):
    request_bodies: list[dict] = []

    def do_POST(self) -> None:  # noqa: N802
        content_length = int(self.headers.get("Content-Length") or "0")
        raw_body = self.rfile.read(content_length).decode("utf-8")
        payload = json.loads(raw_body)
        self.__class__.request_bodies.append(payload)
        response_body = {
            "model": payload.get("model"),
            "done": True,
            "done_reason": "stop",
            "message": {
                "role": "assistant",
                "content": json.dumps(
                    {
                        "text": "曹仁小兒，長坂橋前有種便來！",
                        "usedKeywordKeys": ["cao-ren"],
                        "usedEvidenceRefs": ["042#p1"],
                        "usedPersonaAnchors": ["voiceStyle.豪烈"],
                        "safetyFallbackUsed": False,
                        "violations": [],
                    },
                    ensure_ascii=False,
                ),
            },
        }
        encoded = json.dumps(response_body, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args) -> None:  # noqa: A003
        return


def _run_mock_provider_smoke() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "mock,deterministic"
    os.environ["NPC_LLM_MOCK_TEXT"] = "曹操兵再多又如何？俺張飛守在橋上，先護住主公，誰敢近前！"

    service = NpcDialogueService()
    response = service.build_dialogue(
        DialogueRequest(
            generalId="zhang-fei",
            contextKey="changban-bridge",
            selectedKeywordKeys=["cao-cao", "serpent-spear"],
            maxChars=90,
        )
    )

    assert response.provider == "mock", f"expected mock provider, got {response.provider}"
    assert response.generationMode == "mock-llm-v1+persona-card", response.generationMode
    assert response.providerTrace == ["mock:ok"], response.providerTrace
    assert response.usedEvidenceRefs, "mock provider should receive resolved evidence"
    assert "誰敢近前" in response.text, response.text

    print("[npc-brain-llm-provider-smoke] mock PASS")
    print(
        f"[npc-brain-llm-provider-smoke] provider={response.provider} "
        f"trace={','.join(response.providerTrace)} usedEvidenceRefs={len(response.usedEvidenceRefs)}"
    )


def _run_local_llama_provider_smoke() -> None:
    _LocalLlamaHandler.request_bodies.clear()
    server = HTTPServer(("127.0.0.1", 0), _LocalLlamaHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        os.environ["NPC_LLM_PROVIDER_ORDER"] = "local_llama,deterministic"
        os.environ["NPC_LLM_LOCAL_LLAMA_API_URL"] = f"http://127.0.0.1:{server.server_port}/api/chat"
        os.environ["NPC_LLM_MODEL_LOCAL_LLAMA"] = "llama3:test"
        os.environ["NPC_LLM_LOCAL_LLAMA_TIMEOUT_MS"] = "2000"

        service = NpcDialogueService()
        response = service.build_dialogue(
            DialogueRequest(
                generalId="zhang-fei",
                contextKey="changban-bridge",
                selectedKeywordKeys=["cao-ren"],
                locale="zh-TW",
                speechContextMode="encounter_speech",
                maxChars=90,
            )
        )

        assert response.provider == "local_llama", f"expected local_llama provider, got {response.provider}"
        assert response.generationMode == "local-llama-json-v1+persona-card", response.generationMode
        assert response.providerTrace == ["local_llama:ok"], response.providerTrace
        assert response.usedEvidenceRefs == ["042#p1"], response.usedEvidenceRefs
        assert "曹仁" in response.text, response.text
        assert _LocalLlamaHandler.request_bodies, "expected local llama request body"
        prompt = _LocalLlamaHandler.request_bodies[0]["messages"][0]["content"]
        assert '"selectedKeywords"' in prompt, prompt
        assert '"resolvedEvidence"' in prompt, prompt
        assert '"usedKeywordKeys"' in prompt, prompt
        assert '"localeDirective"' in prompt, prompt
        assert '"speechContextDirective"' in prompt, prompt
        assert '"encounter_speech"' in prompt, prompt

        print("[npc-brain-llm-provider-smoke] local_llama PASS")
        print(
            f"[npc-brain-llm-provider-smoke] provider={response.provider} "
            f"trace={','.join(response.providerTrace)} usedEvidenceRefs={','.join(response.usedEvidenceRefs)}"
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=1)


def _run_history_cache_provider_smoke() -> None:
    os.environ["NPC_LLM_PROVIDER_ORDER"] = "local_llama,history_cache,deterministic"
    cache_path = os.path.join(os.getcwd(), "local", "test-npc-dialogue-history.jsonl")
    os.environ["NPC_LLM_HISTORY_CACHE_PATH"] = cache_path
    if os.path.exists(cache_path):
        os.remove(cache_path)

    _LocalLlamaHandler.request_bodies.clear()
    server = HTTPServer(("127.0.0.1", 0), _LocalLlamaHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        os.environ["NPC_LLM_LOCAL_LLAMA_API_URL"] = f"http://127.0.0.1:{server.server_port}/api/chat"
        os.environ["NPC_LLM_MODEL_LOCAL_LLAMA"] = "llama3:test"
        os.environ["NPC_LLM_LOCAL_LLAMA_TIMEOUT_MS"] = "2000"

        service = NpcDialogueService()
        first_response = service.build_dialogue(
            DialogueRequest(
                generalId="zhang-fei",
                contextKey="changban-bridge",
                selectedKeywordKeys=["cao-ren"],
                speechContextMode="encounter_speech",
                maxChars=90,
            )
        )
        assert first_response.provider == "local_llama", first_response.providerTrace
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=1)

    os.environ["NPC_LLM_PROVIDER_ORDER"] = "history_cache,deterministic"
    service = NpcDialogueService()
    cached_response = service.build_dialogue(
        DialogueRequest(
            generalId="zhang-fei",
            contextKey="changban-bridge",
            selectedKeywordKeys=["cao-ren"],
            speechContextMode="encounter_speech",
            maxChars=90,
        )
    )
    assert cached_response.provider == "history_cache", cached_response.providerTrace
    assert "曹仁" in cached_response.text, cached_response.text
    assert os.path.exists(cache_path), cache_path

    print("[npc-brain-llm-provider-smoke] history_cache PASS")
    print(
        "[npc-brain-llm-provider-smoke] history_cache text="
        + json.dumps(cached_response.text, ensure_ascii=False)
    )


def _run_json_repair_smoke() -> None:
    provider = GeminiDialogueProvider(api_key="test-key")
    truncated_json = (
        '{"text":"曹仁若敢踏上長坂橋半步，俺也去當場喝他翻下馬！",'
        '"usedKeywordKeys":["cao-ren"],'
        '"usedEvidenceRefs":["042#p1"],'
        '"usedPersonaAnchors":["voiceStyle.豪烈"],'
        '"violations":["unterminated'
    )
    parsed = provider._parse_json_text(truncated_json)
    assert parsed["text"] == "曹仁若敢踏上長坂橋半步，俺也去當場喝他翻下馬！", parsed
    assert parsed["usedKeywordKeys"] == ["cao-ren"], parsed
    assert parsed["usedEvidenceRefs"] == ["042#p1"], parsed

    print("[npc-brain-llm-provider-smoke] json-repair PASS")
    print(
        "[npc-brain-llm-provider-smoke] repaired="
        + json.dumps(parsed, ensure_ascii=False)
    )


def main() -> None:
    original_env = {key: os.environ.get(key) for key in _ENV_KEYS}
    try:
        _run_mock_provider_smoke()
        _run_local_llama_provider_smoke()
        _run_history_cache_provider_smoke()
        _run_json_repair_smoke()
    finally:
        for key, value in original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


if __name__ == "__main__":
    main()
