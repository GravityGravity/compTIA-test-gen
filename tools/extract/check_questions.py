"""Check the exam module records in content/ and print the coverage report.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/check_questions.py
    tools/extract/.venv/bin/python -I tools/extract/check_questions.py --topics 220-1201
    tools/extract/.venv/bin/python -I tools/extract/check_questions.py --root tests/fixtures/app-data --records-only

Reads config/exams/ and, for each exam, content/<module>/pool/d<N>.json,
content/<module>/scenarios/d<N>.json, content/<module>/grammar.json, and
content/shared/grammar.json (see docs/exam-modules.md and content/README.md).

Errors (exit code 1) are records the app cannot use or that break a content rule. Warnings are
records to look at in review. The coverage rules (every topic has a pool question, 800 pool
questions, 6 scenario records for each scenario objective and 1 for each of its topics) are
errors only for an active exam; for an exam still being built they are listed as gaps.
`--topics <code>` prints the numbered topics of an exam: the n in `<exam>/<objective>.<n>`.
`--root <dir>` checks another folder with config/ and content/ (for example the test fixture),
and `--records-only` lists the coverage gaps of an active exam instead of failing on them.
"""

import argparse
import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEXT = ROOT / "sources-text"

MIN_POOL = 800
MIN_RECORDS = 6          # scenario records for each scenario objective
TARGET_PER_TOPIC = 2     # a topic with fewer pool questions is a warning (0 is an error when active)
NEAR_DUPLICATE = 0.85    # word overlap of two stems (and their options) that is reported

TYPES = ("single", "multiple")
STRUCTURES = ("recall", "select-item", "scenario", "procedure", "calculation")
QUALIFIERS = ("BEST", "FIRST", "NEXT", "MOST LIKELY", "LEAST")
KINDS = ("fault", "requirement", "procedure", "calculation")
CALCULATIONS = ("subnet-hosts", "subnet-mask", "network-address", "broadcast-address")

POOL = {"id": str, "type": str, "structure": str, "qualifier": (str, type(None)), "exam": str, "domain": str,
        "objectives": list, "topics": list, "stem": str, "options": list, "answer": list, "selectCount": int,
        "fixedOrder": bool, "explanation": str, "whyWrong": list, "origin": str, "source": str}
POOL_OPTIONAL = {"answerOrigin": str, "note": str}
SCENARIO = {"id": str, "kind": str, "exam": str, "domain": str, "objectives": list, "topics": list,
            "explanation": str, "origin": str, "source": str}
SCENARIO_OPTIONAL = {"settings": list, "devices": list, "note": str}
KIND_FIELDS = {
    "fault": ({"clues": list, "answer": dict, "appliesWhen": str, "related": list}, {"firstStep": str}),
    "requirement": ({"need": str, "itemType": str, "clues": list, "answer": dict, "appliesWhen": str,
                     "related": list}, {}),
    "procedure": ({"task": str, "steps": list}, {}),
    "calculation": ({"calculation": str, "prefixMin": int, "prefixMax": int}, {}),
}

# The rules each generator expands (src/engine/exam/scenario/), and the names they bind from a record.
GENERATOR_RULES = {
    "fault": ["faultOpening", "askCause", "askAction", "askFirst", "linkClues", "firstReason", "wrongFirstFix",
              "wrongAction", "wrongCause"],
    "requirement": ["requirementOpening", "conditionLead", "askItem", "linkConditions", "wrongItem"],
    "procedure": ["procedureOpening", "stepDone", "askNext", "askFirst", "stepOrder", "wrongStepEarlier",
                  "wrongStepLater"],
    "calculation": ["calculationOpening"],
}
BOUND = {"fits", "clues", "need", "conditions", "itemType", "task", "done", "order", "device", "setting"}
RULE_REF = re.compile(r"#([A-Za-z0-9_-]+)(?:\.[a-z]+)*#")
SENTENCE_END = re.compile(r"(?<=[.!?])[\"”)]?\s+(?=[A-Z0-9\"“(])")
ABBREVIATIONS = re.compile(r"\b(?:e\.g|i\.e|etc|vs|approx|Inc|Ltd|Corp|No|Fig|ed)\.\s", re.I)


def sentences(text):
    """A rough sentence count: abbreviations such as e.g. are not sentence ends."""
    text = ABBREVIATIONS.sub(lambda m: m.group(0).replace(".", ""), text.strip())
    return len([s for s in SENTENCE_END.split(text) if s.strip()]) if text else 0


def words(text):
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def normalize(text):
    return " ".join(re.findall(r"[a-z0-9]+", text.lower()))


# ---------------------------------------------------------------------------
# Exams and topics
# ---------------------------------------------------------------------------

def objectives_file(code):
    """sources-text/<category>/objectives-<code>/<n>-…-exam-objectives.md"""
    found = sorted(TEXT.glob(f"*/objectives-{code.lower()}/*exam-objectives.md"))
    return found[0] if found else None


def official_topics(code):
    """{objective id: (title, [top-level bullets])} from the official objectives file, in order.

    A top-level bullet is a '- ' line, a numbered step ('1. ') of an objective that is a procedure,
    or a table (one topic for the whole table)."""
    path = objectives_file(code)
    if path is None:
        return None
    out, current, previous = {}, None, ""
    for line in path.read_text(encoding="utf-8").splitlines():
        table_start = line.startswith("|") and not previous.startswith("|")
        previous = line
        m = re.match(r"^### (\d+\.\d+) (.*)", line)
        if m:
            current = m.group(1)
            out[current] = (m.group(2), [])
        elif line.startswith("## "):
            current = None
        elif current and re.match(r"^(?:-|\d+\.) \S", line):  # a bullet, or a step of a numbered list
            out[current][1].append(re.sub(r"^(?:-|\d+\.)\s+", "", line).strip())
        elif current and table_start:  # a table (Network+ 1.4 ports) is one topic
            out[current][1].append(" and ".join(c.strip() for c in line.strip("|").split("|")) + " (table)")
    return out


def load_exams(root):
    exams = []
    for path in sorted((root / "config" / "exams").glob("*.json")):
        exams.append(json.loads(path.read_text(encoding="utf-8")))
    return exams


def print_topics(code):
    topics = official_topics(code)
    if topics is None:
        raise SystemExit(f"no official objectives file for {code} in sources-text/*/objectives-{code.lower()}/")
    for objective, (title, bullets) in topics.items():
        print(f"{code}/{objective} {title}")
        for n, bullet in enumerate(bullets, start=1):
            print(f"  {code}/{objective}.{n}  {bullet}")


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------

class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def error(self, where, message):
        self.errors.append(f"{where}: {message}")

    def warn(self, where, message):
        self.warnings.append(f"{where}: {message}")


def read_records(folder, root, report):
    """[(file, domain from the file name, record)] for each d<N>.json in `folder`."""
    out = []
    if not folder.exists():
        return out
    for path in sorted(folder.glob("*.json")):
        rel = path.relative_to(root).as_posix()
        m = re.fullmatch(r"d(\d+)\.json", path.name)
        if not m:
            report.error(rel, "an exam content file is named d<domain>.json")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            report.error(rel, f"not valid JSON ({e})")
            continue
        if not isinstance(data, list):
            report.error(rel, "the file must hold a JSON array of records")
            continue
        out += [(rel, m.group(1), rec) for rec in data]
    return out


def check_fields(rec, fields, optional, where, report):
    if not isinstance(rec, dict):
        report.error(where, "a record must be a JSON object")
        return False
    ok = True
    for key, kind in fields.items():
        if key not in rec:
            report.error(where, f"missing field {key}")
            ok = False
        elif not isinstance(rec[key], kind) or (kind is int and isinstance(rec[key], bool)):
            report.error(where, f"{key} has the wrong type")
            ok = False
        elif isinstance(rec[key], str) and not rec[key].strip():
            report.error(where, f"{key} is empty")
            ok = False
    for key, kind in optional.items():
        if key in rec and (not isinstance(rec[key], kind) or (isinstance(rec[key], str) and not rec[key].strip())):
            report.error(where, f"{key} has the wrong type or is empty")
            ok = False
    unknown = set(rec) - set(fields) - set(optional)
    if unknown:
        report.error(where, f"unknown fields: {', '.join(sorted(unknown))}")
    return ok


def check_coverage_fields(rec, exam, domain, file_domain, topics, where, report, scenario_only=None):
    """exam, domain (= the file), objectives in the domain, and topics that exist under them."""
    if rec["exam"] != exam["id"]:
        report.error(where, f'exam must be {exam["id"]}')
    if rec["domain"] != file_domain:
        report.error(where, f"domain must be {file_domain}, as the file name says")
    if rec["domain"] not in domain:
        report.error(where, f'domain {rec["domain"]} is not in the {exam["id"]} config')
        return
    objectives = domain[rec["domain"]]
    if not rec["objectives"] or not rec["topics"]:
        report.error(where, "objectives and topics need at least one entry each")
    for o in rec["objectives"]:
        oid = o.removeprefix(f'{exam["id"]}/')
        if not isinstance(o, str) or not o.startswith(f'{exam["id"]}/') or oid not in objectives:
            report.error(where, f"objective {o} is not in {exam['id']} domain {rec['domain']}")
        elif scenario_only and objectives[oid] != "scenario":
            report.error(where, f"objective {o} is a knowledge objective; scenario records cover scenario objectives")
    for t in rec["topics"]:
        m = re.fullmatch(rf'{re.escape(exam["id"])}/(\d+\.\d+)\.(\d+)', t) if isinstance(t, str) else None
        if not m:
            report.error(where, f"topic {t} must look like {exam['id']}/<objective>.<n>")
            continue
        if f'{exam["id"]}/{m.group(1)}' not in rec["objectives"]:
            report.error(where, f"topic {t} is not under the record's objectives")
        elif topics is not None and m.group(1) in topics and not 1 <= int(m.group(2)) <= len(topics[m.group(1)][1]):
            report.error(where, f"topic {t} does not exist (objective {m.group(1)} has {len(topics[m.group(1)][1])})")


def check_pool(rec, exam, domain, file_domain, topics, where, report):
    if not check_fields(rec, POOL, POOL_OPTIONAL, where, report):
        return False
    module = exam["content"]
    if not rec["id"].startswith(f"{module}-q-"):
        report.error(where, f"id must start with {module}-q-")
    check_coverage_fields(rec, exam, domain, file_domain, topics, where, report)
    if rec["type"] not in TYPES:
        report.error(where, f"type must be one of {', '.join(TYPES)}")
    if rec["structure"] not in STRUCTURES:
        report.error(where, f"structure must be one of {', '.join(STRUCTURES)}")
    if rec["qualifier"] is not None:
        if rec["qualifier"] not in QUALIFIERS:
            report.error(where, f"qualifier must be null or one of {', '.join(QUALIFIERS)}")
        elif rec["qualifier"] not in rec["stem"]:
            report.warn(where, f'the stem does not have the qualifier "{rec["qualifier"]}" in capitals')
    options, answer = rec["options"], rec["answer"]
    if not 2 <= len(options) <= 8 or not all(isinstance(o, str) and o.strip() for o in options):
        report.error(where, "options must be 2–8 non-empty strings")
        return True
    # Case and spaces only: punctuation can tell options apart ("SFP" and "SFP+").
    if len({" ".join(o.lower().split()) for o in options}) != len(options):
        report.error(where, "two options have the same text")
    if (not answer or len(set(answer)) != len(answer)
            or not all(isinstance(a, int) and not isinstance(a, bool) and 0 <= a < len(options) for a in answer)):
        report.error(where, "answer must list different option indexes")
        return True
    if rec["selectCount"] != len(answer):
        report.error(where, "selectCount must be the number of answers")
    if rec["type"] == "single" and len(answer) != 1:
        report.error(where, "a single question has one answer")
    if rec["type"] == "multiple" and len(answer) < 2:
        report.error(where, "a multiple question has two or more answers")
    why = rec["whyWrong"]
    if len(why) != len(options) or not all(
            (w is None) if i in answer else (isinstance(w, str) and w.strip()) for i, w in enumerate(why)):
        report.error(where, "whyWrong needs a sentence for each wrong option and null for each correct one")
    book = rec["origin"] == "book"
    if rec["origin"] not in ("book", "written"):
        report.error(where, "origin must be book or written")
    if "answerOrigin" in rec and (rec["answerOrigin"] != "written" or not book):
        report.error(where, 'answerOrigin is only "written", on a book question without a book answer')
    # Sentence counts: an error on written text, a warning on the book's own text.
    flag = report.warn if book else report.error
    n = sentences(rec["explanation"])
    if not 2 <= n <= 5:
        flag(where, f"the explanation has {n} sentences (2–5)")
    for i, w in enumerate(why):
        if isinstance(w, str) and sentences(w) != 1:
            report.warn(where, f"whyWrong[{i}] has {sentences(w)} sentences (1)")
    return True


def check_scenario(rec, exam, domain, file_domain, topics, grammar, where, report):
    if not isinstance(rec, dict) or rec.get("kind") not in KINDS:
        report.error(where, f"kind must be one of {', '.join(KINDS)}")
        return False
    required, optional = KIND_FIELDS[rec["kind"]]
    if not check_fields(rec, {**SCENARIO, **required}, {**SCENARIO_OPTIONAL, **optional}, where, report):
        return False
    if not rec["id"].startswith(f'{exam["content"]}-s-'):
        report.error(where, f'id must start with {exam["content"]}-s-')
    check_coverage_fields(rec, exam, domain, file_domain, topics, where, report, scenario_only=True)
    if rec["origin"] != "written":
        report.error(where, "origin must be written")
    for key in ("settings", "devices"):
        for name in rec.get(key, []):
            if name not in grammar:
                report.error(where, f'{key}: "{name}" is not a grammar rule')
    n = sentences(rec["explanation"])
    if not 1 <= n <= 3:
        report.warn(where, f"the explanation has {n} sentences (1–3; the generator adds the rest)")
    kind = rec["kind"]
    if kind in ("fault", "requirement"):
        clues = rec["clues"]
        if not all(isinstance(c, str) and c.strip() for c in clues):
            report.error(where, "clues must be non-empty strings")
            return True
        least = 2 if kind == "fault" else 1
        if len(clues) < least:
            report.error(where, f"a {kind} record needs at least {least} clues")
        elif not 3 <= len(clues) <= 6:
            report.warn(where, f"{len(clues)} clues (3–6)")
        for c in clues:
            if c[:1].isupper() or c.rstrip().endswith("."):
                report.warn(where, f'clue "{c}" should be a lower-case clause without a period')
        keys = ("cause", "action") if kind == "fault" else ("item",)
        answer = rec["answer"]
        if set(answer) != set(keys) or not all(isinstance(answer[k], str) and answer[k].strip() for k in keys):
            report.error(where, f"answer needs {' and '.join(keys)} (non-empty strings) only")
            return True
        for c in clues:
            for k in keys:
                if normalize(answer[k]) and normalize(answer[k]) in normalize(c):
                    report.warn(where, f'clue "{c}" gives away the {k}')
        if len(rec["related"]) < 3:
            report.error(where, "related needs at least 3 records")
    elif kind == "procedure":
        steps = rec["steps"]
        if len(steps) < 4:
            report.error(where, "steps must list at least 4 steps")
        for i, s in enumerate(steps):
            if not isinstance(s, dict) or set(s) != {"do", "done"} or not all(
                    isinstance(s[k], str) and s[k].strip() for k in ("do", "done")):
                report.error(where, f'steps[{i}] needs "do" and "done" (non-empty strings) only')
        if len(steps) == 4:
            report.warn(where, "4 steps: the record is used for FIRST step questions only (NEXT needs 5)")
    elif kind == "calculation":
        if rec["calculation"] not in CALCULATIONS:
            report.error(where, f"calculation must be one of {', '.join(CALCULATIONS)}")
        if not 8 <= rec["prefixMin"] <= rec["prefixMax"] <= 30:
            report.error(where, "prefixMin and prefixMax must be from 8 to 30, min ≤ max")
    return True


def check_related(scenarios, report):
    by_id = {r["id"]: r for _, r in scenarios}
    for where, r in scenarios:
        if r["kind"] not in ("fault", "requirement"):
            continue
        keys = ("cause", "action") if r["kind"] == "fault" else ("item",)
        distinct = set()
        for rid in r["related"]:
            other = by_id.get(rid)
            if rid == r["id"]:
                report.error(where, "a record cannot be related to itself")
            elif other is None:
                report.error(where, f"related record {rid} does not exist")
            elif other["kind"] != r["kind"] or other["exam"] != r["exam"]:
                report.error(where, f"related record {rid} is another kind or exam")
            elif isinstance(other.get("answer"), dict):
                same = [k for k in keys if normalize(str(other["answer"].get(k, ""))) == normalize(r["answer"][k])]
                if same:
                    report.error(where, f"related record {rid} has the same {same[0]}")
                distinct.add(normalize(str(other["answer"].get(keys[-1], ""))))
        if len(distinct) < 3:
            report.warn(where, f"only {len(distinct)} related records with different answers (3 make the distractors)")


def check_duplicates(pool, report):
    """Pool questions of one exam whose stems (and options) are almost the same.

    Two word sets with an overlap (Jaccard) of at least NEAR_DUPLICATE share a word among the
    rarest few of each set (prefix filter), so only those pairs are compared.
    """
    items = [(where, r, words(r["stem"]), words(" ".join(r["options"]))) for where, r in pool]
    by_stem = defaultdict(list)
    for item in items:
        by_stem[normalize(item[1]["stem"])].append(item)
    for same in by_stem.values():
        if len(same) > 1:
            report.warn(same[0][0], f"the same stem as {', '.join(x[1]['id'] for x in same[1:])}")
    frequency = Counter(w for _, _, stem, _ in items for w in stem)
    index = defaultdict(list)
    candidates = set()
    for i, (_, _, stem, _) in enumerate(items):
        ordered = sorted(stem, key=lambda w: (frequency[w], w))
        prefix = ordered[:len(ordered) - math.ceil(NEAR_DUPLICATE * len(ordered)) + 1]
        for w in prefix:
            candidates.update((j, i) for j in index[w])
            index[w].append(i)
    for i, j in sorted(candidates):
        where, a, stem_a, opt_a = items[i]
        _, b, stem_b, opt_b = items[j]
        if normalize(a["stem"]) == normalize(b["stem"]):
            continue
        stem = len(stem_a & stem_b) / len(stem_a | stem_b)
        opts = len(opt_a & opt_b) / max(1, len(opt_a | opt_b))
        if stem >= NEAR_DUPLICATE and opts >= 0.5:
            report.warn(where, f"almost the same question as {b['id']} (stem overlap {stem:.2f})")


# ---------------------------------------------------------------------------
# Grammar
# ---------------------------------------------------------------------------

def read_grammar(path, root, report):
    if not path.exists():
        return {}
    rel = path.relative_to(root).as_posix()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        report.error(rel, f"not valid JSON ({e})")
        return {}
    if not isinstance(data, dict):
        report.error(rel, "a grammar file is a JSON object of rules")
        return {}
    for key, value in data.items():
        if not isinstance(value, list) or not value or not all(isinstance(v, str) and v.strip() for v in value):
            report.error(rel, f'rule "{key}" must be a list of at least one non-empty phrasing')
    return {k: v for k, v in data.items() if isinstance(v, list)}


def check_grammar(name, grammar, kinds, report):
    """Every #rule# names a rule (or a name the generator binds), and each kind's frames exist."""
    for rule, phrasings in grammar.items():
        for p in phrasings:
            if not isinstance(p, str):
                continue
            for ref in RULE_REF.findall(p):
                if ref not in grammar and ref not in BOUND:
                    report.error(name, f'rule "{rule}" uses #{ref}#, which is not a rule')
            if p.count("#") % 2:
                report.error(name, f'rule "{rule}" has an unclosed # in "{p}"')
        if rule.startswith("ask"):
            for p in phrasings:
                if isinstance(p, str) and not any(q in p for q in QUALIFIERS) and rule != "askItem":
                    report.warn(name, f'rule "{rule}" phrasing has no qualifier word in capitals: "{p}"')
    for kind in sorted(kinds):
        for rule in GENERATOR_RULES[kind]:
            if rule not in grammar:
                report.error(name, f'the {kind} generator needs rule "{rule}"')


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------

def coverage(exam, topics, pool, scenarios, report, records_only=False):
    """Prints the coverage report of one exam; returns the gap lines."""
    code, active = exam["id"], exam.get("active", False) and not records_only
    per_topic = Counter(t for _, r in pool for t in r.get("topics", []))
    per_objective = Counter(o for _, r in pool for o in r.get("objectives", []))
    records_per_objective = Counter(o for _, r in scenarios for o in r.get("objectives", []))
    records_per_topic = Counter(t for _, r in scenarios for t in r.get("topics", []))
    structures = Counter(r.get("structure") for _, r in pool)
    origins = Counter(r.get("origin") for _, r in pool)
    gaps = []

    def gap(message, warning=False):
        """An error (or a warning) for an active exam; a listed gap for an exam still being built."""
        if not active:
            gaps.append(f"{code}: {message}")
        else:
            (report.warn if warning else report.error)(code, message)

    print(f"\n{exam['name']} ({code}) – {'active' if active else 'not active'}, content/{exam['content']}/")
    print(f"  pool: {len(pool)} questions (at least {MIN_POOL}); "
          + ", ".join(f"{k} {v}" for k, v in sorted(origins.items())) + "; "
          + ", ".join(f"{k} {v}" for k, v in sorted(structures.items(), key=lambda kv: str(kv[0]))))
    print(f"  scenario records: {len(scenarios)} "
          + ", ".join(f"{k} {v}" for k, v in sorted(Counter(r.get('kind') for _, r in scenarios).items())))
    if len(pool) < MIN_POOL:
        gap(f"the pool has {len(pool)} questions; an exam needs at least {MIN_POOL}")
    empty_topics = thin_topics = 0
    for d in exam["domains"]:
        d_pool = sum(1 for _, r in pool if r.get("domain") == d["id"])
        d_records = sum(1 for _, r in scenarios if r.get("domain") == d["id"])
        print(f"  domain {d['id']} {d['name']}: {d_pool} pool questions, {d_records} scenario records")
        for o in d["objectives"]:
            oid = f"{code}/{o['id']}"
            bullets = topics.get(o["id"], ("", []))[1] if topics else []
            counts = [per_topic[f"{oid}.{n}"] for n in range(1, len(bullets) + 1)]
            empty = [n for n, c in enumerate(counts, start=1) if c == 0]
            thin = [n for n, c in enumerate(counts, start=1) if 0 < c < TARGET_PER_TOPIC]
            empty_topics += len(empty)
            thin_topics += len(thin)
            line = f"    {o['id']} {o['kind']:<9} {per_objective[oid]:>4} questions, topics {len(counts) - len(empty)}/{len(counts)}"
            if o["kind"] == "scenario":
                line += f", {records_per_objective[oid]} records"
            print(line)
            if empty:
                gap(f"{oid}: topics with no pool question: {', '.join(map(str, empty))}")
            if thin:
                gap(f"{oid}: topics with 1 pool question: {', '.join(map(str, thin))}", warning=True)
            if o["kind"] == "scenario":
                if records_per_objective[oid] < MIN_RECORDS:
                    gap(f"{oid}: {records_per_objective[oid]} scenario records (at least {MIN_RECORDS})")
                no_record = [n for n in range(1, len(bullets) + 1) if records_per_topic[f"{oid}.{n}"] == 0]
                if no_record:
                    gap(f"{oid}: topics with no scenario record: {', '.join(map(str, no_record))}")
    total_topics = sum(len(b) for _, b in (topics or {}).values())
    print(f"  topics: {total_topics - empty_topics}/{total_topics} with a pool question, "
          f"{thin_topics} with only 1")
    return gaps


# ---------------------------------------------------------------------------

def check_exam(exam, root, shared, report, records_only=False):
    topics = official_topics(exam["id"])
    if topics is None:
        report.error(exam["id"], "no official objectives file in sources-text/ to check the topics against")
    domain = {d["id"]: {o["id"]: o["kind"] for o in d["objectives"]} for d in exam["domains"]}
    folder = root / "content" / exam["content"]
    grammar = {**shared, **read_grammar(folder / "grammar.json", root, report)}
    pool, scenarios = [], []
    for rel, file_domain, rec in read_records(folder / "pool", root, report):
        where = f"{rel} {rec.get('id', '?') if isinstance(rec, dict) else '?'}"
        if check_pool(rec, exam, domain, file_domain, topics, where, report):
            pool.append((where, rec))
    for rel, file_domain, rec in read_records(folder / "scenarios", root, report):
        where = f"{rel} {rec.get('id', '?') if isinstance(rec, dict) else '?'}"
        if check_scenario(rec, exam, domain, file_domain, topics, grammar, where, report):
            scenarios.append((where, rec))
    ids = Counter(r["id"] for _, r in pool + scenarios)
    for rid, n in ids.items():
        if n > 1:
            report.error(f"content/{exam['content']}", f"id {rid} is used {n} times")
    check_related(scenarios, report)
    check_duplicates(pool, report)
    kinds = {r["kind"] for _, r in scenarios}
    if kinds:
        check_grammar(f"content/{exam['content']}/grammar.json + content/shared/grammar.json", grammar, kinds, report)
    return coverage(exam, topics, pool, scenarios, report, records_only)


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--topics", metavar="CODE", help="print the numbered topics of an exam")
    parser.add_argument("--root", default=str(ROOT), help="folder with config/ and content/ (default: the repo)")
    parser.add_argument("--gaps", action="store_true", help="list every coverage gap of exams that are not active")
    parser.add_argument("--records-only", action="store_true",
                        help="coverage gaps are not errors, even for an active exam (for the test fixture)")
    args = parser.parse_args(argv)
    if args.topics:
        print_topics(args.topics)
        return
    root = Path(args.root).resolve()
    report = Report()
    shared = read_grammar(root / "content" / "shared" / "grammar.json", root, report)
    gaps = []
    for exam in load_exams(root):
        gaps += check_exam(exam, root, shared, report, args.records_only)
    if gaps:
        print(f"\n{len(gaps)} coverage gaps (errors once the exam is active)")
        for g in gaps if args.gaps else gaps[:20]:
            print(f"  {g}")
        if not args.gaps and len(gaps) > 20:
            print(f"  … {len(gaps) - 20} more (--gaps lists all)")
    if report.warnings:
        print(f"\n{len(report.warnings)} warnings")
        for w in report.warnings:
            print(f"  {w}")
    if report.errors:
        print(f"\n{len(report.errors)} errors")
        for e in report.errors:
            print(f"  {e}")
        sys.exit(1)
    print("\nNo errors.")


if __name__ == "__main__":
    main(sys.argv[1:])
