from pathlib import Path


def run_job(raw_text):
    normalized = raw_text.strip()
    Path("cache/data.json").write_text(normalized)
    return normalized

