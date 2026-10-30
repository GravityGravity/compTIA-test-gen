"""Parse the practice questions of the books into staging JSON.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/extract_questions.py [book-key ...]

Reads the chapter files in sources-text/<category>/<book-key>/ and writes
sources-text/derived/questions/<book-key>.json: one record for each question, with its stem,
options, answers (option indexes, or null when the book has none), the book's explanation, and
the chapter's exam and objectives. The records are the input for content/<module>/pool/ (see
docs/exam-modules.md); they are not content records.

The report lists, for each book, the questions per set, the answers without questions, and the
count of each flag. Each record's `flags` say what to look at when it is copied into the pool:
no-answer, no-explanation, no-options, few-options, answer-out-of-range, select-count-mismatch
("Choose two" with another number of answers), duplicate-options, figure (the stem refers to a
figure the app cannot show), options-repaired and option-labels-missing (West's two-column
options, put back in order by rule: check them against the book).
"""

import difflib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEXT = ROOT / "sources-text"
OUT = TEXT / "derived" / "questions"

QUESTION = re.compile(r"^(?:\*\*)?(\d+)\.(?:\*\*)?\s+(.*)")
UPPER_OPTION = re.compile(r"^\s*([A-J])\.\s+(.*)")
LOWER_OPTION = re.compile(r"^\s*([a-e])\.\s+(.*)")
DIGIT_OPTION = re.compile(r"^\s+([1-8])\.\s+(.*)")  # Neil's mock exams: indented 1.–4.
HEADING = re.compile(r"^(#+)\s+(.*)")
SELECT = re.compile(r"\((?:choose|select)\s+(?:the\s+)?(two|three|four|all)\b[^)]*\)", re.I)
SELECT_WORDS = {"two": 2, "three": 3, "four": 4}
FIGURE = re.compile(r"\b(exhibit|figure|diagram|illustration|shown below|following image|screenshot)\b", re.I)
EXAM_CODE = re.compile(r"(220-|N10-)(\d{3,4})(?:/(\d{3,4}))?")


# ---------------------------------------------------------------------------
# Chapters
# ---------------------------------------------------------------------------

class Chapter:
    def __init__(self, category, book, row):
        name, exam, objectives, title = (row.split("\t") + ["", "", ""])[:4]
        self.path = TEXT / category / book / name
        self.rel = self.path.relative_to(TEXT).as_posix()
        # "04-chapter-4-…" -> "04"; Docter "c1-04-core-1-…" -> "c1-04" (each core numbers its chapters from 1)
        self.key = re.match(r"(?:c\d+-)?[^-]+", name).group(0)
        self.title = title
        self.exams = exam_codes(exam)
        self.objectives = [o for o in objectives.split(",") if o]
        self.lines = split_fused_markers(self.path.read_text(encoding="utf-8").splitlines())
        # "Source: <book name> – ch01.html" -> "<book name> – Chapter 1: …"
        source = next((l for l in self.lines[:6] if l.startswith("Source: ")), f"Source: {book}")
        self.source = f"{source.removeprefix('Source: ').split(' – ')[0]} – {title}"


FUSED_MARKER = re.compile(r"^(.*\S)(Cram Quiz(?: Answers)?)\*\*$")


def split_fused_markers(lines):
    """'D. **route printCram Quiz Answers**' -> 'D. **route print**' and '**Cram Quiz Answers**'."""
    out = []
    for line in lines:
        m = FUSED_MARKER.match(line)
        if m and m.group(1) != "**":
            out += [m.group(1) + "**", "", f"**{m.group(2)}**"]
        else:
            out.append(line)
    return out


def exam_codes(label):
    """'Core 1 and Core 2 (220-1101/1102)' -> ['220-1101', '220-1102']."""
    codes = []
    for prefix, first, second in EXAM_CODE.findall(label):
        codes.append(prefix + first)
        if second:
            codes.append(prefix + second)
    return codes


def chapters(category, book):
    rows = (TEXT / category / book / "_chapters.tsv").read_text(encoding="utf-8").splitlines()
    return [Chapter(category, book, row) for row in rows if row.strip()]


def section(lines, start, stop):
    """The lines after the first line that matches `start`, up to the first that matches `stop`."""
    for i, line in enumerate(lines):
        if start(line):
            end = next((j for j in range(i + 1, len(lines)) if stop(lines[j])), len(lines))
            return lines[i + 1:end]
    return []


def sections(lines, start, stop):
    """Every run of lines after a line that matches `start`, up to a line that matches `stop`."""
    out, i = [], 0
    while i < len(lines):
        if start(lines[i]):
            end = next((j for j in range(i + 1, len(lines)) if stop(lines[j])), len(lines))
            out.append(lines[i + 1:end])
            i = end
        else:
            i += 1
    return out


def heading(level):
    """Matches a heading of `level` or higher (fewer #)."""
    def match(line):
        m = HEADING.match(line)
        return bool(m) and len(m.group(1)) <= level
    return match


def is_heading(text):
    return lambda line: line.strip() == text


def split_by_subheading(lines, level):
    """[(heading text or None, lines)] for each heading of exactly `level` (text before the first is None)."""
    groups, title, current = [], None, []
    for line in lines:
        m = HEADING.match(line)
        if m and len(m.group(1)) == level:
            if current or title is not None:
                groups.append((title, current))
            title, current = m.group(2).strip(), []
        else:
            current.append(line)
    if current or title is not None:
        groups.append((title, current))
    return groups


# ---------------------------------------------------------------------------
# Questions and answers
# ---------------------------------------------------------------------------

def clean(text):
    """One line of plain text: no Markdown bold or italics, single spaces."""
    text = text.replace("**", "")
    text = re.sub(r"(?<![\w*])\*(\S(?:[^*]*\S)?)\*(?![\w*])", r"\1", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def paragraphs(lines):
    """Joins wrapped lines; blank lines separate paragraphs."""
    out, current = [], []
    for line in lines + [""]:
        if line.strip():
            current.append(line.strip())
        elif current:
            out.append(" ".join(current))
            current = []
    return out


def parse_questions(lines, option=UPPER_OPTION, free_order=False):
    """[{number, stem, options}] from numbered question blocks. Code blocks stay in the stem.

    With `free_order` (West's two-column options), option labels may come in any order and may
    land under the next question; `repair_options` puts them back.
    """
    questions, q, fence, blank = [], None, False, False
    for line in lines:
        if line.strip().startswith("```"):
            fence = not fence
            if q is not None and not q["options"]:
                q["stem"].append(line)
            continue
        if fence:
            if q is not None and not q["options"]:
                q["stem"].append(line)
            continue
        if line.startswith(">"):
            continue
        m = QUESTION.match(line)
        if not m and q is not None and q["options"] and blank:
            loose = re.match(r"^(\d+)\s+([A-Z].*)", line)
            m = loose if loose and q["number"] < int(loose.group(1)) <= q["number"] + 2 else None
        if m and not option.match(line):
            q = {"number": int(m.group(1)), "stem": [m.group(2)], "options": [], "labels": [], "repaired": False}
            questions.append(q)
            blank = False
            continue
        if q is None:
            continue
        o = option.match(line)
        if o and (free_order or not q["options"] or expected_label(q["options"], o.group(1))):
            q["options"].append(o.group(2))
            q["labels"].append(o.group(1).lower())
            blank = False
        elif not line.strip():
            blank = True
            if not q["options"]:
                q["stem"].append("")
        elif not q["options"]:
            q["stem"].append(line)
        elif not blank:
            q["options"][-1] += " " + line.strip()  # a wrapped option
        else:
            q = None  # text after the options belongs to no question
    if free_order:
        repair_options(questions)
    for q in questions:
        q["stem"] = "\n".join(paragraphs_keep_code(q["stem"])).strip()
        q["options"] = [clean(o) for o in q["options"]]
    return questions


def increasing_runs(pairs):
    """[(label, text)] split into runs whose labels go up: a b c | c d | d e."""
    runs = []
    for pair in pairs:
        if runs and pair[0] > runs[-1][-1][0]:
            runs[-1].append(pair)
        else:
            runs.append([pair])
    return runs


def repair_options(questions):
    """Splits 'Application layer c. Data link layer' into two options, moves a repeated label back
    to the question before it, and sorts options by label.
    The move happens only when one run of labels exactly fills what the question before lacks and
    the rest stays in order. Each changed question is marked `repaired` (flagged for review)."""
    for q in questions:
        pairs = []
        for label, text in zip(q["labels"], q["options"]):
            parts = re.split(r"\s+([a-e])\.\s+", text)
            pairs.append((label, parts[0]))
            for k in range(1, len(parts) - 1, 2):
                pairs.append((parts[k], parts[k + 1]))
                q["repaired"] = True
        q["pairs"] = pairs
    for i, q in enumerate(questions[1:], start=1):
        prev = questions[i - 1]
        missing = set("abcd"[:max(4, len(prev["pairs"]))]) - {l for l, _ in prev["pairs"]}
        runs = increasing_runs(q["pairs"])
        if len(runs) < 2 or not missing:
            continue
        for k, run in enumerate(runs):
            rest = [p for j, r in enumerate(runs) if j != k for p in r]
            labels = [l for l, _ in rest]
            if {l for l, _ in run} <= missing and labels == sorted(set(labels)):
                prev["pairs"] += run
                q["pairs"] = rest
                prev["repaired"] = q["repaired"] = True
                break
    for q in questions:
        if [l for l, _ in q["pairs"]] != sorted(l for l, _ in q["pairs"]):
            q["repaired"] = True
        q["pairs"].sort(key=lambda p: p[0])
        q["labels"] = [l for l, _ in q["pairs"]]
        q["options"] = [t for _, t in q["pairs"]]
        del q["pairs"]


def paragraphs_keep_code(lines):
    """Joins the wrapped lines of a stem but keeps code blocks line by line."""
    out, current, fence = [], [], False
    for line in lines:
        if line.strip().startswith("```"):
            if current:
                out.append(clean(" ".join(current)))
                current = []
            out.append(line)
            fence = not fence
        elif fence:
            out.append(line)
        elif line.strip():
            current.append(line.strip())
        elif current:
            out.append(clean(" ".join(current)))
            out.append("")
            current = []
    if current:
        out.append(clean(" ".join(current)))
    return [l for i, l in enumerate(out) if l or (i and out[i - 1])]


def expected_label(options, label):
    """True when `label` is the next option label (A after none, B after A, …)."""
    if label.isdigit():
        return int(label) == len(options) + 1
    return ord(label) - ord("A" if label.isupper() else "a") == len(options)


def letters_to_indexes(text):
    """'A, B, and D' / '**B**, **C**' / 'b' -> [0, 1, 3]."""
    text = text.replace("*", "")
    found = re.findall(r"\b([A-Ja-j1-8])\b", text)
    out = []
    for f in found:
        i = int(f) - 1 if f.isdigit() else ord(f.upper()) - ord("A")
        if i not in out:
            out.append(i)
    return sorted(out)


def parse_answers(lines, answer, multi_paragraph=False):
    """{number: {letters, explanation, incorrect}} from numbered answer lines.

    `answer` matches the start of an answer and has the groups (number, letters, rest).
    With `multi_paragraph`, the paragraphs up to the next answer belong to it, and an
    "**Incorrect answers:**" paragraph becomes `incorrect`.
    """
    answers, a = {}, None
    # An answer line starts a new paragraph even with no blank line before it.
    spaced = []
    for line in lines:
        if line.startswith(">"):
            continue
        if answer.match(line.strip()):
            spaced.append("")
        spaced.append(line)
    for para in paragraphs(spaced):
        m = answer.match(para)
        if m:
            number, letters, rest = m.group(1), m.group(2), m.group(3) or ""
            picked = ALL_CORRECT if letters == ALL_CORRECT else letters_to_indexes(letters)
            a = {"letters": picked, "explanation": [clean(rest)] if rest.strip() else [],
                 "incorrect": None}
            answers.setdefault(int(number), a)
        elif a is not None and multi_paragraph and not HEADING.match(para):
            inc = re.match(r"^\*\*Incorrect answers?:?\*\*:?\s*(.*)", para)
            if inc:
                a["incorrect"] = clean(inc.group(1))
            elif a["incorrect"] is not None:
                a["incorrect"] += " " + clean(para)
            else:
                a["explanation"].append(clean(para))
        else:
            a = None
    for a in answers.values():
        a["explanation"] = " ".join(a["explanation"])
    return answers


ALL_CORRECT = "ALL"


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------

class Book:
    def __init__(self, key, category):
        self.key = key
        self.category = category
        self.records = []
        self.report = []           # lines for the book's report
        self.sets = Counter()
        self.orphans = 0

    def add(self, chapter, set_name, set_key, q, a, objectives=None, number=None):
        number = q["number"] if number is None else number
        rid = f"{self.key}-{chapter.key}-{set_key}-{number}"
        record = {
            "id": rid,
            "book": self.key,
            "file": chapter.rel,
            "chapter": chapter.title,
            "exams": chapter.exams,
            "objectives": objectives if objectives is not None else chapter.objectives,
            "set": set_name,
            "number": number,
            "stem": q["stem"],
            "options": q["options"],
            "answer": None,
            "selectCount": None,
            "explanation": None,
            "incorrect": None,
            "flags": [],
            "source": f"{chapter.source}, {set_name} question {number}",
        }
        if a is not None:
            answer = list(range(len(q["options"]))) if a["letters"] == ALL_CORRECT else a["letters"]
            record["answer"] = answer
            record["selectCount"] = len(answer)
            record["explanation"] = a["explanation"] or None
            record["incorrect"] = a.get("incorrect")
        if q.get("repaired"):
            record["flags"].append("options-repaired")
        labels = q.get("labels") or []
        if labels and labels[0].isalpha() and labels != [chr(ord("a") + i) for i in range(len(labels))]:
            record["flags"].append("option-labels-missing")
        self.check(record)
        self.records.append(record)
        self.sets[set_name] += 1

    def check(self, r):
        flags = r["flags"]
        n = len(r["options"])
        if n == 0:
            flags.append("no-options")
        elif n < 3:
            flags.append("few-options")
        if r["answer"] is None:
            flags.append("no-answer")
        else:
            if not r["answer"] or any(i >= n for i in r["answer"]):
                flags.append("answer-out-of-range")
            m = SELECT.search(r["stem"])
            wanted = SELECT_WORDS.get(m.group(1).lower()) if m else None
            if wanted and wanted != len(r["answer"]):
                flags.append("select-count-mismatch")
            if not r["explanation"]:
                flags.append("no-explanation")
        if FIGURE.search(r["stem"]):
            flags.append("figure")
        if len(set(o.lower() for o in r["options"])) != n:
            flags.append("duplicate-options")

    def pair(self, chapter, set_name, set_key, questions, answers, objectives=None):
        """Adds each question with the answer of the same number."""
        for q in questions:
            self.add(chapter, set_name, set_key, q, answers.get(q["number"]), objectives)
        extra = set(answers) - {q["number"] for q in questions}
        if extra:
            self.orphans += len(extra)
            self.report.append(f"  {chapter.key} {set_name}: answers without questions: {sorted(extra)}")

    def pair_in_order(self, chapter, set_name, set_key, questions, answers, objectives_of=None, stems=None):
        """Adds the k-th question with answer number k.

        For books whose questions restart their numbers (or repeat one) while the answers run
        straight through. An answer that did not parse leaves a gap instead of shifting the rest.
        """
        for k, q in enumerate(questions, start=1):
            if stems is not None and k in stems:
                ratio = difflib.SequenceMatcher(None, q["stem"].lower(), stems[k].lower()).ratio()
                if ratio < 0.6:
                    self.report.append(f"  {chapter.key} {set_name} {k}: stem differs from its answer ({ratio:.2f})")
            self.add(chapter, set_name, set_key, q, answers.get(k),
                     objectives_of(q) if objectives_of else None, number=k)
        extra = sorted(n for n in answers if n > len(questions))
        if extra:
            self.orphans += len(extra)
            self.report.append(f"  {chapter.key} {set_name}: answers without questions: {extra}")


# ---------------------------------------------------------------------------
# One parser for each book format (see tools/extract/README.md, "Question formats")
# ---------------------------------------------------------------------------

JOIN = r"(?:,\s*|,?\s+and\s+(?:possibly\s+)?|,?\s+then\s+)"
# "1. **C.** …", "**10. E.** …", "4. **C**. …", "**A, D, and possibly C.**", "**A, then D.**",
# "1. **D. devmgmt.msc** is …", "1. **Answers: B, H, I, and J.** …"
BOLD_LETTERS = re.compile(
    r"^(?:\*\*)?(\d+)\.\s+(?:\*\*)?(?:Answers?:\s*)?([A-J](?:" + JOIN + r"[A-J])*)\.?(?:\*\*)?\.?\s*(.*)")


def exam_cram_2e(book):
    for ch in chapters(book.category, book.key):
        if ch.key in ("x1", "x2"):
            qs = parse_questions(section(ch.lines, is_heading("## Exam Questions"), heading(2)))
            ans = parse_answers(section(ch.lines, is_heading("## Answer Explanations"), heading(2)),
                                BOLD_LETTERS, multi_paragraph=True)
            book.pair(ch, "Practice Exam", "x", qs, ans)
            continue
        quizzes = sections(ch.lines, is_heading("## Cram Quiz"), heading(2))
        keys = sections(ch.lines, is_heading("## Cram Quiz Answers"), heading(2))
        if len(quizzes) != len(keys):
            book.report.append(f"  {ch.key}: {len(quizzes)} Cram Quizzes but {len(keys)} answer sections")
        for i, quiz in enumerate(quizzes):
            ans = parse_answers(keys[i], BOLD_LETTERS) if i < len(keys) else {}
            name = "Cram Quiz" if len(quizzes) == 1 else f"Cram Quiz {i + 1}"
            book.pair_in_order(ch, name, f"cq{i + 1}", parse_questions(quiz), ans)


PLAIN_LETTERS = re.compile(r"^(\d+)\.\s+([A-H](?:,\s*[A-H])*)\.\s+(.*)")


def docter_study_guide(book):
    for ch in chapters(book.category, book.key):
        qs = parse_questions(section(ch.lines, is_heading("### Review Questions"), heading(3)))
        ans = parse_answers(section(ch.lines, is_heading("## Answers to Review Questions"), heading(2)),
                            PLAIN_LETTERS)
        book.pair(ch, "Review Questions", "rq", qs, ans)


AIO_LETTERS = re.compile(r"^(\d+)\.\s+\*\*([A-H](?:(?:,\s*|,?\s+and\s+)[A-H])*)\.?\*\*\.?\s*(.*)")


def aio_11e(book):
    for ch in chapters(book.category, book.key):
        qs = parse_questions(section(ch.lines, is_heading("### Questions"), heading(3)))
        ans = parse_answers(section(ch.lines, is_heading("### Answers"), heading(2)), AIO_LETTERS)
        book.pair(ch, "Chapter Review", "cr", qs, ans)


NEIL_ANSWER = re.compile(r"^(\d+)\.\s+(?:The correct answers? (?:is|are) (.+?)\.(?=\s|$)|(All) (?:answer choices|statements) are (?:correct|true)\.)\s*(.*)")


class NeilAnswer:
    """Neil writes 'The correct answer is **A**.' or 'All answer choices are correct.'"""

    @staticmethod
    def match(para):
        m = NEIL_ANSWER.match(para)
        if not m:
            return None
        return _Match(m.group(1), m.group(2) if m.group(2) else ALL_CORRECT, m.group(4))


class _Match:
    def __init__(self, *groups):
        self.groups_ = groups

    def group(self, i):
        return self.groups_[i - 1]


def neil_practice_tests(book):
    """Grouped by objective. Some groups restart their numbering in the middle, so answers pair by order."""
    for ch in chapters(book.category, book.key):
        body = section(["#"] + ch.lines[1:], lambda line: line == "#", is_heading("## Solutions"))
        # Chapter 6 numbers its options 1–4 (indented); the other chapters use A–D.
        option = DIGIT_OPTION if any(re.match(r"^\s+1\.\s", line) for line in body) else UPPER_OPTION
        solutions = {objective_id(t): lines
                     for t, lines in split_by_subheading(section(ch.lines, is_heading("## Solutions"), heading(2)), 3)}
        for title, lines in split_by_subheading(body, 3):
            qs = parse_questions(lines, option)
            if not qs:
                continue
            objective = objective_id(title)
            ans = parse_answers(solutions.get(objective, []), NeilAnswer)
            name = f"Objective {objective}" if objective else "Mock Exam"
            book.pair_in_order(ch, name, objective or "mock", qs, ans,
                               objectives_of=lambda q: [objective] if objective else ch.objectives)


def objective_id(title):
    m = re.match(r"(\d+\.\d+)", title or "")
    return m.group(1) if m else None


def net_exam_cram(book):
    quiz_start = is_heading("**Cram Quiz**")
    answers_start = is_heading("**Cram Quiz Answers**")
    stop = lambda line: bool(HEADING.match(line)) or bool(re.match(r"^\*\*[^*]+\*\*$", line.strip()))
    for ch in chapters(book.category, book.key):
        quizzes = sections(ch.lines, quiz_start, lambda line: answers_start(line) or bool(HEADING.match(line)))
        keys = sections(ch.lines, answers_start, stop)
        if len(quizzes) != len(keys):
            book.report.append(f"  {ch.key}: {len(quizzes)} Cram Quizzes but {len(keys)} answer sections")
        for i, quiz in enumerate(quizzes):
            ans = parse_answers(keys[i], BOLD_LETTERS) if i < len(keys) else {}
            name = "Cram Quiz" if len(quizzes) == 1 else f"Cram Quiz {i + 1}"
            book.pair(ch, name, f"cq{i + 1}", parse_questions(quiz), ans)


def net_zacker_practice_tests(book):
    for ch in chapters(book.category, book.key):
        body = section(["#"] + ch.lines[1:], lambda line: line == "#", is_heading("## Answers to Review Questions"))
        ans = parse_answers(section(ch.lines, is_heading("## Answers to Review Questions"), heading(2)),
                            PLAIN_LETTERS)
        questions, objective_of = [], {}
        for title, lines in split_by_subheading(body, 3):
            objective = re.match(r"(\d+\.\d+)", title or "")
            for q in parse_questions(lines):
                questions.append(q)
                objective_of[id(q)] = [objective.group(1)] if objective else ch.objectives
        practice = "practice-test" in ch.path.name
        name = ch.title.split(": ", 1)[-1] if practice else "Review Questions"
        book.pair_in_order(ch, name, "pt" if practice else "rq", questions, ans,
                           objectives_of=lambda q: objective_of[id(q)])


WEST_ANSWER = re.compile(r"^\*\*Answer\*?\*?:\*?\*?\s*([a-e])\.\s*(.*)")


def west_solutions(lines):
    """{n: {letters, explanation}} and {n: stem} from 'Solutions to Self-Check Questions'."""
    answers, stems, current = {}, {}, None
    for para in paragraphs(lines):
        if HEADING.match(para):
            continue
        q = QUESTION.match(para)
        a = WEST_ANSWER.match(para)
        if q and not a:
            current = int(q.group(1))
            stems[current] = q.group(2)
            answers[current] = {"letters": [], "explanation": [], "incorrect": None}
        elif a and current is not None:
            answers[current]["letters"] = letters_to_indexes(a.group(1))
        elif current is not None:
            text = re.sub(r"^\*\*Explanation\*?\*?:\*?\*?\s*", "", para)
            answers[current]["explanation"].append(clean(text.replace("**", "")))
    for a in answers.values():
        a["explanation"] = " ".join(a["explanation"])
    return {n: a for n, a in answers.items() if a["letters"]}, stems


def west_tables(lines):
    """Turns the self-checks that West prints as tables into plain question lines.

    A row is '| 7. | stem |  |' or '|  | a. MTBF | c. SPoF |' (options in two columns, a/c then
    b/d; some print the letter last, 'ipconfig a.'). A row without a number or a letter carries on
    the stem or the last option. A '| Self-Check |' header row becomes the heading.
    """
    out, i = [], 0
    while i < len(lines):
        if not lines[i].startswith("|"):
            out.append(lines[i])
            i += 1
            continue
        j = i
        while j < len(lines) and lines[j].startswith("|"):
            j += 1
        block = lines[i:j]
        i = j
        if not any(re.match(r"^\|\s*\d+\.\s*\|", row) for row in block):
            out += block
            continue
        current = None

        def flush():
            if current:
                out.append(f"{current['number']}. {' '.join(current['stem'])}")
                out.extend(f"{k}. {v}" for k, v in sorted(current["options"].items()))
                out.append("")

        for row in block:
            cells = [c.strip() for c in row.strip().strip("|").split("|")]
            if all(re.fullmatch(r"-*", c) for c in cells):
                continue
            if cells[0] == "Self-Check":
                out += ["", "#### Self-Check", ""]
                continue
            if re.fullmatch(r"\d+\.", cells[0]):
                flush()
                current = {"number": cells[0].rstrip("."), "stem": [], "options": {}, "last": None}
            if current is None:
                continue
            for cell in cells[1:]:
                if not cell:
                    continue
                m = re.match(r"^([a-e])\.\s+(.*)", cell)
                late = re.match(r"^(.*\S)\s+([a-e])\.$", cell)
                if m:
                    current["options"][m.group(1)], current["last"] = m.group(2), m.group(1)
                elif late:
                    current["options"][late.group(2)], current["last"] = late.group(1), late.group(2)
                elif current["last"]:
                    current["options"][current["last"]] += " " + cell
                else:
                    current["stem"].append(cell)
        flush()
    return out


def net_west_guide(book):
    for ch in chapters(book.category, book.key):
        if ch.key in ("99", "xb"):
            continue
        ch.lines = west_tables(ch.lines)
        if ch.key == "xc":
            qs = parse_questions(ch.lines, LOWER_OPTION, free_order=True)
            skipped = [q["number"] for q in qs if not q["options"]]
            if skipped:
                book.report.append(f"  xc: skipped questions without options (PBQs): {skipped}")
            book.pair(ch, "Practice Exam", "x", [q for q in qs if q["options"]], {})
            continue
        # Self-checks: the questions restart at 1 in each block; the solutions run straight through.
        questions, objective_of, objectives = [], {}, []
        in_check = False
        block = []
        for line in ch.lines + ["## end"]:
            m = HEADING.match(line)
            if m and line.startswith("## Section"):
                objectives = []
            cert = re.match(r"^Net\+ (\d+\.\d+):", line)
            if cert:
                objectives.append(cert.group(1))
            if in_check and m:
                for q in parse_questions(block, LOWER_OPTION, free_order=True):
                    questions.append(q)
                    objective_of[id(q)] = list(objectives) or ch.objectives
                in_check, block = False, []
            if line.strip() == "#### Self-Check":
                in_check = True
                continue
            if in_check:
                block.append(line)
            if line.startswith("## Review Questions") or line.startswith("## Solutions"):
                break
        ans, stems = west_solutions(section(ch.lines, is_heading("## Solutions to Self-Check Questions"), heading(2)))
        book.pair_in_order(ch, "Self-Check", "sc", questions, ans,
                           objectives_of=lambda q: objective_of[id(q)], stems=stems)
        review = parse_questions(section(ch.lines, is_heading("## Review Questions"), heading(2)), LOWER_OPTION,
                                 free_order=True)
        book.pair(ch, "Review Questions", "rq", review, {})
        scenario = section(ch.lines, is_heading("## Scenario-Based Questions"), heading(2))
        for title, lines in split_by_subheading(scenario, 4):
            m = re.match(r"Question (\d+)-(\d+)", title or "")
            if not m:
                continue
            first = next((i for i, l in enumerate(lines) if l.strip()), 0)
            lines = lines[:first] + [f"{m.group(2)}. {lines[first]}"] + lines[first + 1:]
            for q in parse_questions(lines, LOWER_OPTION, free_order=True):
                book.add(ch, "Scenario-Based Questions", "sb", q, None)


PARSERS = {
    "exam-cram-2e": ("general", exam_cram_2e),
    "docter-study-guide": ("general", docter_study_guide),
    "aio-11e": ("general", aio_11e),
    "neil-practice-tests": ("general", neil_practice_tests),
    "net-exam-cram": ("network", net_exam_cram),
    "net-zacker-practice-tests": ("network", net_zacker_practice_tests),
    "net-west-guide": ("network", net_west_guide),
}


def run(key):
    category, parser = PARSERS[key]
    book = Book(key, category)
    parser(book)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{key}.json").write_text(json.dumps(book.records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    flags = Counter(f for r in book.records for f in r["flags"])
    answered = sum(1 for r in book.records if r["answer"] is not None)
    print(f"{key}: {len(book.records)} questions, {answered} with answers, "
          f"{book.orphans} answers without questions -> {(OUT / f'{key}.json').relative_to(ROOT)}")
    for name, n in book.sets.items():
        print(f"  {name}: {n}")
    for line in book.report:
        print(line)
    if flags:
        print("  flags: " + ", ".join(f"{f} {n}" for f, n in sorted(flags.items())))
    return book


def main(argv):
    keys = argv or list(PARSERS)
    unknown = [k for k in keys if k not in PARSERS]
    if unknown:
        raise SystemExit(f"unknown book keys: {', '.join(unknown)} (known: {', '.join(PARSERS)})")
    total = sum(len(run(k).records) for k in keys)
    print(f"total: {total} questions")


if __name__ == "__main__":
    main(sys.argv[1:])
