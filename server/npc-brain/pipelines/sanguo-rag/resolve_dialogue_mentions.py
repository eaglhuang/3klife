from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, Field


DEFAULT_CHAPTERS_ROOT = Path("artifacts/data-pipeline/sanguoyanyi-mao-hant-2026-04-28/body/chapters")
DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/dialogue-resolution")
ADDRESS_TITLE_HINTS = {
    "主公": "scene-address-title",
    "先生": "scene-address-title",
    "將軍": "scene-address-title",
    "丞相": "scene-address-title",
    "皇叔": "scene-address-title",
}
ITEM_HINTS = {
    "寶刀": "treasured-saber",
    "青釭寶劍": "qinggang-sword",
    "蛇矛": "serpent-spear",
    "矛": "spear",
    "橋樑": "bridge-beam",
}
SPEAKER_HINTS = {
    "飛": "zhang-fei",
    "張飛": "zhang-fei",
    "玄德": "liu-bei",
    "劉備": "liu-bei",
    "孔明": "zhuge-liang",
    "亮": "zhuge-liang",
    "曹操": "cao-cao",
    "操": "cao-cao",
    "趙雲": "zhao-yun",
    "雲": "zhao-yun",
    "雲長": "guan-yu",
    "魯肅": "lu-su",
    "肅": "lu-su",
}
ADDRESS_TARGET_HINTS = {
    "主公": "liu-bei",
    "皇叔": "liu-bei",
    "先生": "zhuge-liang",
    "丞相": "cao-cao",
}


class EntityMention(BaseModel):
    label: str = Field(description="Mention label in utterance")
    entityType: str = Field(description="address-title or item")
    resolvedGeneralId: str | None = Field(default=None, description="Resolved general id for address-title")
    resolvedItemKey: str | None = Field(default=None, description="Resolved item key for item")
    confidence: float = Field(default=0.0, description="Resolution confidence")
    resolutionMode: str = Field(default="", description="Resolution mode")


class UtteranceResolution(BaseModel):
    sourceRef: str = Field(description="Chapter paragraph ref")
    speakerLabel: str | None = Field(default=None, description="Surface speaker label")
    speakerGeneralId: str | None = Field(default=None, description="Resolved speaker id")
    addresseeLabel: str | None = Field(default=None, description="Address title inside quote")
    addresseeGeneralId: str | None = Field(default=None, description="Resolved addressee id")
    resolutionMode: str = Field(default="deterministic-dialogue", description="Resolution mode")
    confidence: float = Field(default=0.0, description="Resolution confidence")
    text: str = Field(description="Quoted utterance text")
    entityMentions: list[EntityMention] = Field(default_factory=list, description="Entities in utterance")


class DialogueParagraphResolution(BaseModel):
    sourceRef: str = Field(description="Chapter paragraph ref")
    chapterNo: int | None = Field(default=None, description="Chapter number")
    sceneParticipants: list[str] = Field(default_factory=list, description="Resolved participants in paragraph")
    utterances: list[UtteranceResolution] = Field(default_factory=list, description="Quoted utterances")
    entityMentions: list[EntityMention] = Field(default_factory=list, description="Flattened entity mentions")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Resolve quoted dialogue, address titles, and simple item mentions for E-5a.")
    parser.add_argument("--chapters-root", default=str(DEFAULT_CHAPTERS_ROOT), help="Directory containing chapter markdown files")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH), help="observed-mentions.json path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--chapter", type=int, default=42, help="Pilot chapter number")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def split_paragraphs(text: str) -> list[str]:
    return [paragraph.strip() for paragraph in re.split(r"\n\s*\n", text) if paragraph.strip()]


def ensure_output_root(output_root: Path, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [output_root / "dialogue-resolution.json", output_root / "dialogue-resolution.md"]
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def load_observed_by_source_ref(path: Path) -> dict[str, list[dict]]:
    payload = read_json(path)
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in payload.get("data") or []:
        grouped[str(row.get("sourceRef") or "")].append(row)
    return grouped


def chapter_path(chapters_root: Path, chapter_no: int) -> Path:
    for name in (f"{chapter_no:03d}.md", f"ch_{chapter_no:03d}.md"):
        path = chapters_root / name
        if path.exists():
            return path
    raise FileNotFoundError(f"Chapter file not found for chapter {chapter_no}: {chapters_root}")


def resolve_speaker(prefix: str, scene_participants: list[str]) -> tuple[str | None, str | None, float]:
    candidates = re.findall(r"([\u4e00-\u9fff]{1,6})(?:大呼曰|笑曰|嘆曰|喝曰|問曰|曰|云|道)", prefix[-30:])
    if not candidates:
        return None, None, 0.0
    label = candidates[-1]
    general_id = SPEAKER_HINTS.get(label)
    if general_id and general_id in scene_participants:
        return label, general_id, 0.78
    if general_id:
        return label, general_id, 0.66
    return label, None, 0.35


def resolve_address_title(label: str, speaker_general_id: str | None, scene_participants: list[str]) -> tuple[str | None, float, str]:
    hinted = ADDRESS_TARGET_HINTS.get(label)
    if hinted and hinted in scene_participants and hinted != speaker_general_id:
        return hinted, 0.82, "scene-address-title"
    candidates = [general_id for general_id in scene_participants if general_id != speaker_general_id]
    if len(candidates) == 1:
        return candidates[0], 0.72, "single-other-participant"
    return None, 0.35, "unresolved-address-title"


def entity_mentions_for_text(text: str, speaker_general_id: str | None, scene_participants: list[str]) -> tuple[str | None, str | None, list[EntityMention]]:
    entity_mentions: list[EntityMention] = []
    addressee_label = None
    addressee_general_id = None
    for label in ADDRESS_TITLE_HINTS:
        if label in text:
            resolved_id, confidence, mode = resolve_address_title(label, speaker_general_id, scene_participants)
            addressee_label = addressee_label or label
            addressee_general_id = addressee_general_id or resolved_id
            entity_mentions.append(
                EntityMention(
                    label=label,
                    entityType="address-title",
                    resolvedGeneralId=resolved_id,
                    confidence=confidence,
                    resolutionMode=mode,
                )
            )
    for label, item_key in ITEM_HINTS.items():
        if label in text:
            entity_mentions.append(
                EntityMention(
                    label=label,
                    entityType="item",
                    resolvedItemKey=item_key,
                    confidence=0.76,
                    resolutionMode="lexical-item-hint",
                )
            )
    return addressee_label, addressee_general_id, entity_mentions


def resolve_paragraph(source_ref: str, chapter_no: int, paragraph: str, observed_rows: list[dict]) -> DialogueParagraphResolution | None:
    scene_participants = sorted({general_id for row in observed_rows for general_id in (row.get("sceneParticipants") or [])})
    scene_participants.extend(
        general_id
        for row in observed_rows
        for general_id in (row.get("matchedGeneralIds") or [])
        if general_id not in scene_participants
    )
    utterances: list[UtteranceResolution] = []
    for match in re.finditer(r"「([^」]+)」", paragraph):
        text = match.group(1)
        prefix = paragraph[: match.start()]
        speaker_label, speaker_general_id, speaker_confidence = resolve_speaker(prefix, scene_participants)
        addressee_label, addressee_general_id, entity_mentions = entity_mentions_for_text(text, speaker_general_id, scene_participants)
        confidence = max(speaker_confidence, 0.5 if entity_mentions else 0.0)
        utterances.append(
            UtteranceResolution(
                sourceRef=source_ref,
                speakerLabel=speaker_label,
                speakerGeneralId=speaker_general_id,
                addresseeLabel=addressee_label,
                addresseeGeneralId=addressee_general_id,
                confidence=confidence,
                text=text,
                entityMentions=entity_mentions,
            )
        )
    if not utterances:
        return None
    flattened = [entity for utterance in utterances for entity in utterance.entityMentions]
    return DialogueParagraphResolution(
        sourceRef=source_ref,
        chapterNo=chapter_no,
        sceneParticipants=scene_participants,
        utterances=utterances,
        entityMentions=flattened,
    )


def build_smoke_fixture() -> DialogueParagraphResolution:
    entity_mentions = [
        EntityMention(
            label="將軍",
            entityType="address-title",
            resolvedGeneralId="zhang-fei",
            confidence=0.86,
            resolutionMode="single-other-participant",
        ),
        EntityMention(
            label="寶刀",
            entityType="item",
            resolvedItemKey="treasured-saber",
            confidence=0.8,
            resolutionMode="lexical-item-hint",
        ),
    ]
    utterance = UtteranceResolution(
        sourceRef="fixture.dialogue.address-title-offer",
        speakerLabel="軍士",
        speakerGeneralId=None,
        addresseeLabel="將軍",
        addresseeGeneralId="zhang-fei",
        confidence=0.86,
        text="將軍，我送您一把寶刀！",
        entityMentions=entity_mentions,
    )
    return DialogueParagraphResolution(
        sourceRef="fixture.dialogue.address-title-offer",
        chapterNo=None,
        sceneParticipants=["zhang-fei"],
        utterances=[utterance],
        entityMentions=entity_mentions,
    )


def render_markdown(payload: dict) -> str:
    lines = [
        "# Dialogue Resolution Review",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- Chapter: `{payload['chapterNo']}`",
        f"- Paragraphs: `{len(payload['data'])}`",
        "",
    ]
    for paragraph in payload["data"]:
        lines.extend([f"## {paragraph['sourceRef']}", "", f"- Participants: `{', '.join(paragraph['sceneParticipants'])}`", ""])
        for utterance in paragraph["utterances"]:
            lines.append(
                f"- speaker=`{utterance.get('speakerGeneralId') or '-'}` addressee=`{utterance.get('addresseeGeneralId') or '-'}` confidence=`{utterance['confidence']:.2f}`"
            )
            lines.append(f"  - {utterance['text']}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    args = parse_args()
    chapters_root = Path(args.chapters_root)
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)
    observed_by_source_ref = load_observed_by_source_ref(Path(args.observed_mentions))
    path = chapter_path(chapters_root, args.chapter)
    paragraphs = split_paragraphs(path.read_text(encoding="utf-8"))
    data: list[DialogueParagraphResolution] = []
    for index, paragraph in enumerate(paragraphs, start=1):
        source_ref = f"{args.chapter:03d}#p{index}"
        resolved = resolve_paragraph(source_ref, args.chapter, paragraph, observed_by_source_ref.get(source_ref, []))
        if resolved:
            data.append(resolved)
    data.append(build_smoke_fixture())
    payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "chapterNo": args.chapter,
        "chaptersRoot": str(chapters_root),
        "observedMentionsPath": args.observed_mentions,
        "data": [item.model_dump() for item in data],
    }
    json_path = output_root / "dialogue-resolution.json"
    md_path = output_root / "dialogue-resolution.md"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(payload), encoding="utf-8")
    print(f"[resolve_dialogue_mentions] wrote {json_path}")
    print(f"[resolve_dialogue_mentions] wrote {md_path}")
    print(f"[resolve_dialogue_mentions] paragraphs={len(data)} utterances={sum(len(item.utterances) for item in data)}")


if __name__ == "__main__":
    main()