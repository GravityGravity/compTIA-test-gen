"""Check the acronym and definition records in content/.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/check_content.py

Errors (exit code 1) are records the app cannot use or that break a content rule. Warnings are
records to look at in review. A summary of counts for each certification follows.
"""

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content"
TEXT = ROOT / "sources-text"

EXAMS = {
    "a-plus": {
        "220-1201": TEXT / "general" / "objectives-220-1201" / "01-core-1-220-1201-exam-objectives.md",
        "220-1202": TEXT / "general" / "objectives-220-1202" / "01-core-2-220-1202-exam-objectives.md",
    },
    "network-plus": {
        "N10-009": TEXT / "network" / "objectives-n10-009" / "01-network-n10-009-exam-objectives.md",
    },
    "security-plus": {
        "SY0-801": TEXT / "sec" / "objectives-sy0-801" / "01-security-sy0-801-exam-objectives.md",
    },
}
COMMON = {"id": str, "acceptedAnswers": list, "certifications": list, "exams": list,
          "objectives": list, "origin": str, "source": str}
# Acronyms are always typed (acronym -> expanded form), so they have no typeable flag and no distractor group.
ACRONYM = {**COMMON, "acronym": str, "expanded": str, "meaning": str, "official": bool}
DEFINITION = {**COMMON, "term": str, "definition": str, "typeable": bool, "group": str}
# sourceUrls and verified: a record written from online sources (Security+ topics that no book covers).
OPTIONAL = {"note": str, "sourceUrls": list, "verified": (bool, str)}
ORIGINS = {"acronym": {"official", "book"}, "definition": {"objectives", "glossary", "book"}}
MIN_GROUP = 4          # a group smaller than this makes the engine add distractors from other groups
MAX_DEFINITION_WORDS = 30
MIN_MEANING_WORDS, MAX_MEANING_WORDS = 10, 25

ACRONYM_LIKE = re.compile(r"^[A-Z0-9][A-Za-z0-9.+/-]*[A-Z0-9+]$")


def normalize(text):
    """Compare typed answers the way the app does: ignore case, extra spaces, and punctuation."""
    return " ".join(re.sub(r"[^\w\s]|_", " ", text.lower()).split())


def objective_ids():
    ids = {}
    for cert, exams in EXAMS.items():
        ids[cert] = set()
        for exam, path in exams.items():
            for line in path.read_text(encoding="utf-8").splitlines():
                m = re.match(r"^### (\d+\.\d+) ", line)
                if m:
                    ids[cert].add(f"{exam}/{m.group(1)}")
    return ids


def load(kind):
    """Yield (file, record) for every record of one module."""
    for path in sorted((CONTENT / f"{kind}s").rglob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise SystemExit(f"{path.relative_to(ROOT)}: the file must hold a JSON array of records")
        for rec in data:
            yield path.relative_to(ROOT), rec


def check(kind, fields, objectives, errors, warnings, summary):
    seen_ids = set()
    prompts = defaultdict(lambda: defaultdict(list))   # cert -> normalized prompt -> ids
    answers = defaultdict(lambda: defaultdict(list))   # cert -> normalized answer -> ids
    groups = defaultdict(Counter)
    stats = defaultdict(Counter)
    for path, rec in load(kind):
        rid = rec.get("id", "?")
        where = f"{path} {rid}"

        def err(msg):
            errors.append(f"{where}: {msg}")

        def warn(msg):
            warnings.append(f"{where}: {msg}")

        for name, typ in fields.items():
            if not isinstance(rec.get(name), typ):
                err(f"field '{name}' is missing or not {typ.__name__}")
        for name in rec:
            if name not in fields and name not in OPTIONAL:
                err(f"unknown field '{name}'")
        if any(not isinstance(rec.get(n), t) for n, t in fields.items()):
            continue
        for name, typ in OPTIONAL.items():
            if name in rec and not isinstance(rec[name], typ):
                err(f"field '{name}' has the wrong type")
        if ("sourceUrls" in rec) != ("verified" in rec):
            err("an online-sourced record needs both 'sourceUrls' and 'verified'")
        elif "sourceUrls" in rec:
            if not rec["sourceUrls"] or not all(isinstance(u, str) and u.startswith("https://") for u in rec["sourceUrls"]):
                err("'sourceUrls' must list https:// pages")
            if rec["verified"] is True or (isinstance(rec["verified"], str) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", rec["verified"])):
                err("'verified' is false or a date (YYYY-MM-DD)")
            elif rec["verified"] is False:
                warn("online-sourced record is not verified yet")

        if rid in seen_ids:
            err("duplicate id")
        seen_ids.add(rid)
        for name in ("group", "source"):
            if name in rec and not rec[name].strip():
                err(f"'{name}' is empty")
        if rec["origin"] not in ORIGINS[kind]:
            err(f"origin '{rec['origin']}' is not one of {sorted(ORIGINS[kind])}")
        if len(rec["certifications"]) != 1 or rec["certifications"][0] not in EXAMS:
            err(f"certifications must be one of {sorted(EXAMS)}")
            continue
        cert = rec["certifications"][0]
        for exam in rec["exams"]:
            if exam not in EXAMS[cert]:
                err(f"exam '{exam}' is not a {cert} exam")
        for obj in rec["objectives"]:
            if obj not in objectives[cert]:
                err(f"objective '{obj}' does not exist")
            elif obj.split("/")[0] not in rec["exams"]:
                err(f"objective '{obj}' is not in this record's exams")
        if not rec["objectives"]:
            if kind == "definition":
                err("a definition needs at least one objective")
            else:
                stats[cert]["~ no objective: " + rec["acronym"]] += 0
        if not all(isinstance(a, str) and a.strip() for a in rec["acceptedAnswers"]):
            err("acceptedAnswers must be non-empty strings")
            continue

        if kind == "acronym":
            prompt, answer = rec["acronym"], rec["expanded"]
            if rec["official"] != (rec["origin"] == "official"):
                err("official must be true exactly when origin is 'official'")
            m = rec["meaning"].strip()
            words = len(m.split())
            if not m.endswith(".") or re.search(r"[.!?]\s+[A-Z]", m):
                err("meaning must be one sentence that ends with a period")
            if not MIN_MEANING_WORDS <= words <= MAX_MEANING_WORDS:
                warn(f"meaning has {words} words (aim for {MIN_MEANING_WORDS}–{MAX_MEANING_WORDS})")
        else:
            prompt, answer = rec["term"], rec["definition"]
            # The typed answer is the term: it may never be an acronym.
            for typed in [rec["term"], *rec["acceptedAnswers"]]:
                if ACRONYM_LIKE.match(typed) and typed.upper() == typed:
                    err(f"typed answer '{typed}' is an acronym")
            text = normalize(rec["definition"])
            for typed in [rec["term"], *rec["acceptedAnswers"]]:
                if re.search(rf"\b{re.escape(normalize(typed))}\b", text):
                    err(f"the definition gives away the answer '{typed}'")
            words = len(rec["definition"].split())
            if words > MAX_DEFINITION_WORDS:
                warn(f"definition has {words} words (aim for {MAX_DEFINITION_WORDS} or fewer)")

        typed = {normalize(a) for a in [answer if kind == "acronym" else prompt, *rec["acceptedAnswers"]]}
        if len(typed) != 1 + len(rec["acceptedAnswers"]):
            warn("an accepted answer is the same as another answer after normalization")

        prompts[cert][prompt].append(rid)
        answers[cert][normalize(answer)].append(rid)
        if kind == "definition":
            groups[cert][rec["group"]] += 1
        s = stats[cert]
        s["records"] += 1
        if kind == "definition":
            s["typeable"] += rec["typeable"]
        if kind == "acronym":
            s["official" if rec["official"] else "book extras"] += 1
        for d in {o.split(".")[0] for o in rec["objectives"]} or {"(no objective)"}:
            s[f"domain {d}"] += 1

    for cert in prompts:
        for prompt, ids in prompts[cert].items():
            if len(ids) > 1 and kind == "acronym":
                # A typed question shows only the acronym, so one acronym needs one record.
                errors.append(f"{cert} acronym: '{prompt}' is used by {', '.join(ids)}; "
                              "merge them and put the other meaning in acceptedAnswers")
            elif len(ids) > 1:
                warnings.append(f"{cert} {kind}: '{prompt}' is used by {', '.join(ids)}; "
                                "the engine must not use one as a distractor for the other")
        for answer, ids in answers[cert].items():
            if len(ids) > 1 and kind == "definition":
                errors.append(f"{cert} {kind}: {', '.join(ids)} have the same answer '{answer}'")
        for group, n in sorted(groups[cert].items()):
            if n < MIN_GROUP:
                warnings.append(f"{cert} {kind}: group '{group}' has {n} records (fewer than {MIN_GROUP})")
        summary.append((kind, cert, stats[cert], groups[cert]))


def main():
    objectives = objective_ids()
    errors, warnings, summary = [], [], []
    check("acronym", ACRONYM, objectives, errors, warnings, summary)
    check("definition", DEFINITION, objectives, errors, warnings, summary)

    for kind, cert, stats, groups in summary:
        print(f"\n{kind}s – {cert}")
        loose = sorted(k[len("~ no objective: "):] for k in stats if k.startswith("~"))
        for key in sorted((k for k in stats if not k.startswith("~")), key=lambda k: (k.startswith("domain"), k)):
            print(f"  {key}: {stats[key]}")
        if loose:
            print(f"  official acronyms that no objective names ({len(loose)}): {', '.join(loose)}")
        if groups:
            print("  groups: " + ", ".join(f"{g} {n}" for g, n in sorted(groups.items())))
    if warnings:
        print(f"\n{len(warnings)} warnings")
        for w in warnings:
            print(f"  {w}")
    if errors:
        print(f"\n{len(errors)} errors")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    print("\nNo errors.")


if __name__ == "__main__":
    main()
