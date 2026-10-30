"""Seed draft acronym records from the official acronym lists.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/seed_acronyms.py a-plus
    tools/extract/.venv/bin/python -I tools/extract/seed_acronyms.py network-plus

Reads sources-text/derived/<cert>-acronyms.md and writes content/acronyms/<cert>.json with one record
for each official acronym. Each record is mapped to the objectives that name the acronym or its
expanded form. Fixes for the rows the notes flag and the book extras are added by hand after seeding. The script does not overwrite an existing file, so reviewed edits are safe.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEXT = ROOT / "sources-text"
OUT = ROOT / "content" / "acronyms"

CERTS = {
    "a-plus": {
        "list": TEXT / "derived" / "a-plus-acronyms.md",
        "prefix": "aplus-acr-",
        "objectives": {
            "220-1201": TEXT / "general" / "objectives-220-1201" / "01-core-1-220-1201-exam-objectives.md",
            "220-1202": TEXT / "general" / "objectives-220-1202" / "01-core-2-220-1202-exam-objectives.md",
        },
        "lists": {"Core 1": "220-1201", "Core 2": "220-1202"},
        "source": {
            ("220-1201",): "CompTIA A+ Core 1 (220-1201) Exam Objectives – Acronym List",
            ("220-1202",): "CompTIA A+ Core 2 (220-1202) Exam Objectives – Acronym List",
            ("220-1201", "220-1202"): "CompTIA A+ Core 1 (220-1201) and Core 2 (220-1202) Exam Objectives – Acronym Lists",
        },
    },
    "network-plus": {
        "list": TEXT / "derived" / "network-plus-acronyms.md",
        "prefix": "netplus-acr-",
        "objectives": {
            "N10-009": TEXT / "network" / "objectives-n10-009" / "01-network-n10-009-exam-objectives.md",
        },
        "lists": {"Network+": "N10-009"},
        "source": {("N10-009",): "CompTIA Network+ (N10-009) Exam Objectives – Acronym List"},
    },
}

ROW = re.compile(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$")
OBJECTIVE = re.compile(r"^### (\d+\.\d+) ")


def slug(acronym):
    s = acronym.lower().replace("+", "-plus")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def read_objectives(exam, path):
    """Return {"<exam>/<n.n>": section text} for each objective in the file."""
    sections, current = {}, None
    for line in path.read_text(encoding="utf-8").splitlines():
        m = OBJECTIVE.match(line)
        if m:
            current = f"{exam}/{m.group(1)}"
            sections[current] = []
        elif line.startswith("## "):
            current = None
        if current:
            sections[current].append(line)
    return {k: "\n".join(v) for k, v in sections.items()}


def mentions(text, acronym, expanded_forms):
    # Single letters (for example the DNS "A" record) match only by their expanded form.
    if len(acronym) > 1 and re.search(rf"(?<![A-Za-z0-9]){re.escape(acronym)}(?![A-Za-z0-9])", text):
        return True
    low = text.lower()
    return any(len(e) > 6 and e.lower() in low for e in expanded_forms)


def seed(cert):
    cfg = CERTS[cert]
    target = OUT / f"{cert}.json"
    if target.exists():
        sys.exit(f"{target.relative_to(ROOT)} exists. Edit it by hand, or delete it to seed again.")

    sections = {}
    for exam, path in cfg["objectives"].items():
        sections.update(read_objectives(exam, path))

    records = []
    for line in cfg["list"].read_text(encoding="utf-8").splitlines():
        m = ROW.match(line)
        if not m or m.group(1) in ("Acronym", "---"):
            continue
        acronym, expanded, lists, _notes = m.groups()
        forms = [f.strip() for f in expanded.split(" / ")]
        exams = sorted({ex for name, ex in cfg["lists"].items() if name in lists})
        objectives = [k for k, text in sections.items()
                      if k.split("/")[0] in exams and mentions(text, acronym, forms)]
        records.append({
            "id": cfg["prefix"] + slug(acronym),
            "acronym": acronym,
            "expanded": forms[0],
            "acceptedAnswers": forms[1:],
            "certifications": [cert],
            "exams": exams,
            "objectives": objectives,
            "official": True,
            "origin": "official",
            "source": cfg["source"][tuple(exams)],
        })

    OUT.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    mapped = sum(1 for r in records if r["objectives"])
    print(f"{target.relative_to(ROOT)}: {len(records)} records, {mapped} mapped to objectives")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in CERTS:
        sys.exit(f"usage: seed_acronyms.py {{{','.join(CERTS)}}}")
    seed(sys.argv[1])
