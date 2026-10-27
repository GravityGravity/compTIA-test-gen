"""Write sources-text/sources-index.md from the _chapters.tsv file of each book.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/build_index.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEXT = ROOT / "sources-text"

DOMAINS = {
    "C1": {1: "Mobile Devices", 2: "Networking", 3: "Hardware", 4: "Virtualization and Cloud Computing",
           5: "Hardware and Network Troubleshooting"},
    "C2": {1: "Operating Systems", 2: "Security", 3: "Software Troubleshooting", 4: "Operational Procedures"},
    "N": {1: "Networking Concepts", 2: "Network Implementation", 3: "Network Operations", 4: "Network Security",
          5: "Network Troubleshooting"},
}
EXAM_LABEL = {"C1": "Core 1", "C2": "Core 2", "N": "Network+"}


def label(c, n):
    return f"{EXAM_LABEL[c]} {n} {DOMAINS[c][n]}"

BOOKS = [  # (category, folder, title, objectives, use)
    ("general", "objectives-220-1201", "CompTIA A+ Core 1 (220-1201) Exam Objectives (official)", "220-1201",
     "The official objectives and acronym list. Use it to check that content matches an objective and as the main source for acronyms."),
    ("general", "objectives-220-1202", "CompTIA A+ Core 2 (220-1202) Exam Objectives (official)", "220-1202",
     "The official objectives and acronym list. Use it to check that content matches an objective and as the main source for acronyms."),
    ("general", "exam-cram-2e", "CompTIA A+ Core 1 (220-1201) and Core 2 (220-1202) Exam Cram, 2nd ed.", "220-1201/1202",
     "Current objectives. Short chapters by objective. Cram Quiz questions with answers at the end of each chapter, two practice exams, and a cram sheet."),
    ("general", "docter-study-guide", "CompTIA A+ Complete Study Guide (Docter), Core 1 and Core 2", "220-1201/1202",
     "Current objectives. Most detail. Exam Essentials and Review Questions in each chapter; the answers are added at the end of each chapter."),
    ("general", "aio-11e", "CompTIA A+ Certification All-in-One Exam Guide, 11th ed.", "220-1101/1102",
     "Older objectives. Good background and troubleshooting detail; check facts against the current books. Review questions with answers in each chapter. Has the only glossary."),
    ("general", "neil-practice-tests", "CompTIA A+ Practice Tests Core 1 (220-1101) and Core 2 (220-1102) (Neil)", "220-1101/1102",
     "Older objectives. Practice questions only, grouped by objective, with the solutions added at the end of each chapter. Some answers have errors; check them."),
    ("network", "objectives-n10-009", "CompTIA Network+ (N10-009) Exam Objectives (official)", "N10-009",
     "The official objectives and acronym list. Use it to check that content matches an objective and as the main source for Network+ acronyms."),
    ("network", "net-exam-cram", "CompTIA Network+ N10-009 Exam Cram (Dulaney)", "N10-009",
     "Short chapters by objective. CramSaver and Cram Quiz questions with answers in each chapter, a cram sheet, and a glossary."),
    ("network", "net-zacker-practice-tests", "CompTIA Network+ Practice Tests: Exam N10-009 (Zacker)", "N10-009",
     "Practice questions only, grouped by objective, plus two practice tests. The answers with explanations are added at the end of each chapter."),
    ("network", "net-west-guide", "CompTIA Network+ Guide to Networks (West), Cengage", "N10-009",
     "Textbook with the most explanation. Self-Check questions with answers, review and scenario questions (no answers), key terms, an acronym checklist in each chapter, a practice exam, and a glossary."),
]

# The All-in-One chapters do not list objectives. Domains from the book's exam markers and topics.
AIO_DOMAINS = {
    1: "C1:5 C2:4", 2: "C1:3 C2:1", 3: "C1:3,5", 4: "C1:3,5", 5: "C1:3", 6: "C1:3,5", 7: "C1:3,5 C2:4",
    8: "C1:3,5", 9: "C1:3,5 C2:1", 10: "C1:3", 11: "C2:1", 12: "C2:1", 13: "C2:1,2", 14: "C2:1,3,4",
    15: "C2:1,4", 16: "C1:5 C2:3", 17: "C1:3,5 C2:1", 18: "C1:2", 19: "C1:2,5 C2:1", 20: "C1:2,5 C2:2",
    21: "C1:2 C2:2,4", 22: "C1:4", 23: "C1:1,5", 24: "C1:1 C2:1", 25: "C1:5 C2:2,3", 26: "C1:3,5",
    27: "C2:2,3", 28: "C2:4",
}


def domains_for(folder, fname, core, objs):
    if folder == "aio-11e":
        m = re.match(r"(\d+)-", fname)
        spec = AIO_DOMAINS.get(int(m.group(1))) if m else None
        if not spec:
            return "All A+"
        out = []
        for part in spec.split():
            c, nums = part.split(":")
            out += [label(c, int(n)) for n in nums.split(",")]
        return "; ".join(out)
    c = "N" if "Network+" in core else "C1" if "Core 1" in core else "C2"
    if not objs or folder.startswith("objectives-"):
        return "All Network+" if c == "N" else "All A+"
    majors = sorted({int(o.split(".")[0]) for o in objs.split(",")})
    return "; ".join(label(c, n) for n in majors if n in DOMAINS[c])


def main():
    lines = ["# Sources index", "",
             "Links each extracted chapter to its exam and domains. Generated by `tools/extract/build_index.py`.",
             "Domain numbers follow `docs/compTIA-exam-overviews.md` (220-1201/1202 and N10-009). The 220-1101/1102 books use the same domain numbers as 220-1201/1202.",
             "", "Files are in `sources-text/<category>/<book>/`: `general/` for A+ (both cores) and `network/` for Network+. For A+, use the current-objective books (220-1201/1202) first. Keep A+ and Network+ content apart.",
             "", "## Books", "", "| Folder | Book | Objectives | Use |", "|---|---|---|---|"]
    for cat, folder, title, objv, use in BOOKS:
        lines.append(f"| `{cat}/{folder}/` | {title} | {objv} | {use} |")
    lines += ["", "Other files:", "",
              "- `derived/a-plus-acronyms.md` – the official 220-1201 and 220-1202 acronym lists merged, with notes where they differ. The main source for `content/acronyms/`.",
              "- `derived/acronym-candidates.md` – acronym and expanded-form pairs found in the books, marked when they are on the official list (from `tools/extract/derive_terms.py`).",
              "- `general/aio-11e/99-glossary.md` – A+ glossary of terms (220-1101/1102 book).",
              "- `derived/network-plus-acronyms.md` – the official N10-009 acronym list, with notes. The main source for Network+ `content/acronyms/`.",
              "- `derived/network-plus-acronym-candidates.md` – acronym pairs found in the Network+ books.",
              "- `network/net-exam-cram/x2-glossary.md` and `network/net-west-guide/99-glossary.md` – Network+ glossaries.", ""]

    by_domain = {}
    for cat, folder, title, objv, _ in BOOKS:
        tsv = TEXT / cat / folder / "_chapters.tsv"
        if not tsv.exists():
            continue
        lines += [f"## {title}", "", "| File | Exam | Objectives | Domains |", "|---|---|---|---|"]
        for row in tsv.read_text(encoding="utf-8").splitlines():
            fname, core, objs, ctitle = row.split("\t")
            doms = domains_for(folder, fname, core, objs)
            lines.append(f"| [{ctitle}]({cat}/{folder}/{fname}) | {core} | {objs.replace(',', ', ') or '–'} | {doms} |")
            for d in doms.split("; "):
                by_domain.setdefault(d, []).append(f"{cat}/{folder}/{fname}")
        lines.append("")

    lines += ["## By domain", ""]
    def key(d):
        order = {"Core 1": 1, "Core 2": 2, "Network+": 3, "All A+": 8, "All Network+": 9}
        m = re.match(r"(Core \d|Network\+) (\d)", d)
        return (order[m.group(1)], int(m.group(2))) if m else (order.get(d, 10), 0)
    for d in sorted(by_domain, key=key):
        lines += [f"### {d}", ""] + [f"- [{p.split('/')[-1]}]({p})" for p in by_domain[d]] + [""]
    (TEXT / "sources-index.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"{len(by_domain)} domain groups")


if __name__ == "__main__":
    main()
