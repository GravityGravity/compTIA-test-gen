"""Check the certification, exam, and exercise configs in config/.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/check_config.py

Errors (exit code 1) are configs the app cannot use. A summary follows: for each exercise, certification,
and exam choice, the pool size and the records each question type needs.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # -I leaves the script's folder off the path
from check_content import EXAMS, ROOT, load  # noqa: E402

CONFIG = ROOT / "config"
CERTIFICATION = {"id": str, "name": str, "shortName": str, "active": bool, "exams": list}
EXERCISE = {"id": str, "name": str, "active": bool, "content": str, "certifications": list,
            "questionCount": int, "timeLimitMinutes": int, "onTimeUp": str, "selection": str,
            "questionTypes": list}
EXAM = {"id": str, "certification": str, "name": str, "shortName": str, "active": bool, "domains": list}
OPTIONAL = {"description": str, "notSure": bool}
CONTENT = {"acronyms": "acronym", "definitions": "definition"}
ON_TIME_UP = {"end"}
SELECTION = {"random"}
DIRECTIONS = {"term-to-definition", "definition-to-term"}


def read(path, fields, errors, optional=None):
    where = path.relative_to(ROOT)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"{where}: not valid JSON ({e})")
        return None
    for name, typ in fields.items():
        # bool is a subclass of int, so check it apart
        if not isinstance(data.get(name), typ) or (typ is int and isinstance(data.get(name), bool)):
            errors.append(f"{where}: field '{name}' is missing or not {typ.__name__}")
    for name, typ in (optional or {}).items():
        if name in data and not isinstance(data[name], typ):
            errors.append(f"{where}: field '{name}' is not {typ.__name__}")
    for name in data:
        if name not in fields and name not in (optional or {}):
            errors.append(f"{where}: unknown field '{name}'")
    if data.get("id") != path.stem and fields in (CERTIFICATION, EXAM):
        errors.append(f"{where}: id must be the file name ('{path.stem}')")
    return data if not any(e.startswith(f"{where}:") for e in errors) else None


def exam_choices(cert):
    """The exam choices on the setup screen: each exam, plus all of them when there is more than one."""
    exams = cert["exams"]
    return [[e] for e in exams] + ([exams] if len(exams) > 1 else [])


def check_types(where, ex, errors):
    total = 0
    for i, qt in enumerate(ex["questionTypes"]):
        at = f"{where}: questionTypes[{i}]"
        if not isinstance(qt.get("count"), int) or isinstance(qt.get("count"), bool) or qt["count"] < 1:
            errors.append(f"{at}: count must be a positive integer")
            continue
        total += qt["count"]
        kind = qt.get("type")
        if kind == "typed":
            allowed = {"type", "prompt", "answer", "requires", "count"}
            pairs = {"acronym": ("acronym", "expanded"), "definition": ("definition", "term")}
            want = pairs.get(CONTENT.get(ex["content"]))
            if want and (qt.get("prompt"), qt.get("answer")) != want:
                # Typed answers go one way only: the user never types a definition or an acronym.
                errors.append(f"{at}: a typed question must be {want[0]} -> {want[1]}")
            if qt.get("requires") not in (None, "typeable"):
                errors.append(f"{at}: requires must be 'typeable'")
            if ex["content"] == "definitions" and qt.get("requires") != "typeable":
                errors.append(f"{at}: typed definition questions need requires: 'typeable'")
        elif kind == "multiple-choice":
            allowed = {"type", "direction", "directions", "choices", "count"}
            if ex["content"] == "acronyms":
                errors.append(f"{at}: the Acronym Exercise has typed questions only")
            if qt.get("direction") not in {"random"} | DIRECTIONS:
                errors.append(f"{at}: direction must be 'random' or one of {sorted(DIRECTIONS)}")
            if qt.get("direction") == "random" and not set(qt.get("directions", [])) <= DIRECTIONS:
                errors.append(f"{at}: directions must be from {sorted(DIRECTIONS)}")
            if not isinstance(qt.get("choices"), int) or qt["choices"] < 2:
                errors.append(f"{at}: choices must be an integer of 2 or more")
        else:
            errors.append(f"{at}: unknown type '{kind}'")
            continue
        for name in qt:
            if name not in allowed:
                errors.append(f"{at}: unknown field '{name}'")
    if total != ex["questionCount"]:
        errors.append(f"{where}: the questionTypes counts add up to {total}, not questionCount {ex['questionCount']}")


def main():
    errors, summary = [], []
    certs = {}
    for path in sorted((CONFIG / "certifications").glob("*.json")):
        cert = read(path, CERTIFICATION, errors)
        if not cert:
            continue
        if cert["id"] not in EXAMS:
            errors.append(f"{path.relative_to(ROOT)}: unknown certification '{cert['id']}'")
            continue
        for exam in cert["exams"]:
            if exam not in EXAMS[cert["id"]]:
                errors.append(f"{path.relative_to(ROOT)}: exam '{exam}' is not a {cert['id']} exam")
        certs[cert["id"]] = cert

    exams = {}
    for path in sorted((CONFIG / "exams").glob("*.json")):
        where = path.relative_to(ROOT)
        exam = read(path, EXAM, errors)
        if not exam:
            continue
        if exam["id"] not in EXAMS.get(exam["certification"], {}):
            errors.append(f"{where}: exam '{exam['id']}' is not a {exam['certification']} exam")
        ids = [d.get("id") for d in exam["domains"]]
        for i, d in enumerate(exam["domains"]):
            if set(d) != {"id", "name", "weight"} or not all(isinstance(d[k], t) for k, t in
                                                             (("id", str), ("name", str), ("weight", int))):
                errors.append(f"{where}: domains[{i}] needs id (str), name (str), and weight (int) only")
        if ids != [str(n) for n in range(1, len(ids) + 1)]:
            errors.append(f"{where}: domain ids must be '1', '2', ... in order")
        if sum(d.get("weight", 0) for d in exam["domains"] if isinstance(d.get("weight"), int)) != 100:
            errors.append(f"{where}: domain weights must add up to 100")
        exams[exam["id"]] = exam
    for cert in certs.values():
        for code in cert["exams"]:
            if code not in exams:
                errors.append(f"config/certifications/{cert['id']}.json: exam '{code}' has no config in config/exams/")

    for path in sorted((CONFIG / "exercises").glob("*.json")):
        where = path.relative_to(ROOT)
        ex = read(path, EXERCISE, errors, OPTIONAL)
        if not ex:
            continue
        if ex["content"] not in CONTENT:
            errors.append(f"{where}: content must be one of {sorted(CONTENT)}")
            continue
        if ex["onTimeUp"] not in ON_TIME_UP:
            errors.append(f"{where}: onTimeUp must be one of {sorted(ON_TIME_UP)}")
        if ex["selection"] not in SELECTION:
            errors.append(f"{where}: selection must be one of {sorted(SELECTION)}")
        if ex["timeLimitMinutes"] < 1:
            errors.append(f"{where}: timeLimitMinutes must be 1 or more")
        check_types(where, ex, errors)

        records = [rec for _, rec in load(CONTENT[ex["content"]])]
        for cid in ex["certifications"]:
            if cid not in certs:
                errors.append(f"{where}: certification '{cid}' has no config in config/certifications/")
                continue
            if not certs[cid]["active"]:
                continue
            for choice in exam_choices(certs[cid]):
                pool = [r for r in records if r.get("certifications") == [cid]
                        and set(r.get("exams", [])) & set(choice)]
                typeable = [r for r in pool if r.get("typeable", True)]
                need_all = ex["questionCount"]
                need_typed = sum(qt["count"] for qt in ex["questionTypes"]
                                 if qt.get("requires") == "typeable")
                label = f"{ex['id']} {cid} {'+'.join(choice)}"
                if ex["content"] == "definitions":
                    summary.append(f"  {label}: {len(pool)} records ({len(typeable)} typeable); "
                                   f"needs {need_all} ({need_typed} typeable)")
                else:
                    summary.append(f"  {label}: {len(pool)} records; needs {need_all}")
                if len(pool) < need_all:
                    errors.append(f"{label}: the pool has {len(pool)} records, fewer than {need_all}")
                if len(typeable) < need_typed:
                    errors.append(f"{label}: {len(typeable)} typeable records, fewer than {need_typed}")

    print("Pools for each exercise, certification, and exam choice:")
    print("\n".join(summary))
    if errors:
        print(f"\n{len(errors)} errors")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    print("\nNo errors.")


if __name__ == "__main__":
    main()
